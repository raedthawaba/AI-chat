import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torch.cuda.amp import GradScaler, autocast
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
import yaml
import sys
import math
from tokenizers import Tokenizer

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer

class ArabicDataset(Dataset):
    def __init__(self, file_path, tokenizer, max_length):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples = []
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if len(line.strip()) > 10:
                        self.examples.append(line.strip())
        else:
            # Fallback for testing
            self.examples = ["هذا نص تجريبي للتدريب على النموذج العربي الجديد."] * 100

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        encoded = self.tokenizer.encode(self.examples[idx])
        ids = encoded.ids[:self.max_length]
        if len(ids) < self.max_length:
            ids = ids + [0] * (self.max_length - len(ids))
        
        input_ids = torch.tensor(ids[:-1], dtype=torch.long)
        labels = torch.tensor(ids[1:], dtype=torch.long)
        return input_ids, labels

def setup_distributed():
    if 'RANK' in os.environ:
        dist.init_process_group("nccl")
        return int(os.environ['LOCAL_RANK'])
    return -1

def get_lr(step, warmup_steps, lr, min_lr, total_steps):
    if step < warmup_steps:
        return lr * step / warmup_steps
    if step > total_steps:
        return min_lr
    decay_ratio = (step - warmup_steps) / (total_steps - warmup_steps)
    coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
    return min_lr + coeff * (lr - min_lr)

def train():
    local_rank = setup_distributed()
    device = torch.device(f"cuda:{local_rank}" if local_rank != -1 else "cuda" if torch.cuda.is_available() else "cpu")
    
    config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    mc = config['model']
    tc = config['training']

    tokenizer_path = os.path.join(base_dir, "models/tokenizer/tokenizer.json")
    tokenizer = Tokenizer.from_file(tokenizer_path)
    
    model = ArabicTransformer(
        vocab_size=mc['vocab_size'],
        d_model=mc['d_model'],
        n_heads=mc.get('n_heads', 16),
        n_kv_heads=mc.get('n_kv_heads', 8),
        num_layers=mc['num_layers'],
        dim_feedforward=mc['dim_feedforward'],
        max_seq_len=mc['max_seq_len'],
    ).to(device)

    if local_rank != -1:
        model = DDP(model, device_ids=[local_rank])

    optimizer = optim.AdamW(model.parameters(), lr=float(tc['learning_rate']), weight_decay=tc['weight_decay'])
    scaler = GradScaler()

    dataset = ArabicDataset(
        os.path.join(base_dir, "datasets/raw/arabic_corpus_v2.txt"),
        tokenizer,
        mc['max_seq_len']
    )
    
    sampler = torch.utils.data.distributed.DistributedSampler(dataset) if local_rank != -1 else None
    dataloader = DataLoader(dataset, batch_size=tc['batch_size'], sampler=sampler, shuffle=(sampler is None))

    total_steps = len(dataloader) * tc['epochs']
    global_step = 0

    model.train()
    for epoch in range(tc['epochs']):
        if sampler: sampler.set_epoch(epoch)
        
        for batch_idx, (input_ids, labels) in enumerate(dataloader):
            input_ids, labels = input_ids.to(device), labels.to(device)
            
            # Learning rate scheduling
            lr = get_lr(global_step, tc['warmup_steps'], float(tc['learning_rate']), float(tc['min_learning_rate']), total_steps)
            for param_group in optimizer.param_groups:
                param_group['lr'] = lr
            
            optimizer.zero_grad()
            
            with autocast():
                logits, _ = model(input_ids)
                loss = nn.CrossEntropyLoss(ignore_index=0)(logits.view(-1, mc['vocab_size']), labels.view(-1))
            
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), tc['grad_clip'])
            scaler.step(optimizer)
            scaler.update()
            
            global_step += 1

            if batch_idx % 10 == 0 and (local_rank == -1 or local_rank == 0):
                print(f"Epoch {epoch} | Batch {batch_idx} | Loss: {loss.item():.4f} | LR: {lr:.2e}")

    if local_rank == -1 or local_rank == 0:
        os.makedirs(os.path.join(base_dir, "models/exported"), exist_ok=True)
        save_path = os.path.join(base_dir, "models/exported/model_llama_style.pt")
        torch.save({'model_state_dict': model.state_dict(), 'config': config}, save_path)
        print(f"Model saved to {save_path}")

if __name__ == "__main__":
    train()
