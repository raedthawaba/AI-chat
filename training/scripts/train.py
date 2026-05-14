import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torch.cuda.amp import GradScaler, autocast
import yaml
import sys
import sentencepiece as spm
import json
from tqdm import tqdm

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from scripts.constants import DEFAULT_CONFIG_PATH, CHECKPOINTS_DIR, EXPORTED_DIR, SPM_MODEL_PATH
from inference.generation.model import ArabicTransformer
from training.preprocessing.arabic_normalizer import get_normalizer

class ChatMLDataset(Dataset):
    def __init__(self, file_path, sp_model, max_length):
        self.sp = sp_model
        self.max_length = max_length
        self.normalizer = get_normalizer()
        self.examples = []
        
        if os.path.exists(file_path):
            print(f"Loading ChatML instruction data from: {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        self.examples.append(line.strip())
        else:
            print("Error: ChatML data not found.")

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        text = self.examples[idx]
        
        # تنسيق ChatML: <bos><|user|> السؤال <|assistant|> الإجابة <eos>
        # ملاحظة: الـ bos و eos يتم إضافتهما تلقائياً أو يدوياً حسب الحاجة
        tokens = [self.sp.bos_id()] + self.sp.encode_as_ids(text) + [self.sp.eos_id()]
        
        # البحث عن بداية رد المساعد لتطبيق الـ Loss Masking
        assistant_token_id = self.sp.piece_to_id('<|assistant|>')
        
        input_ids = tokens[:-1]
        labels = tokens[1:]
        
        # إنشاء الـ Mask (تجاهل الـ Loss على الـ User والـ Special Tokens)
        mask = []
        is_assistant_reply = False
        for i in range(len(labels)):
            if labels[i] == assistant_token_id:
                is_assistant_reply = True
            
            if is_assistant_reply:
                mask.append(labels[i])
            else:
                mask.append(-100) # القيمة القياسية لتجاهل الـ Loss في PyTorch
        
        # Padding
        padding_len = self.max_length - len(input_ids)
        if padding_len > 0:
            input_ids = input_ids + [self.sp.pad_id()] * padding_len
            labels = labels + [self.sp.pad_id()] * padding_len
            mask = mask + [-100] * padding_len
        else:
            input_ids = input_ids[:self.max_length]
            labels = labels[:self.max_length]
            mask = mask[:self.max_length]
            
        return torch.tensor(input_ids), torch.tensor(mask)

def train_pro():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    with open(DEFAULT_CONFIG_PATH, 'r') as f:
        config = yaml.safe_load(f)
    mc = config['model']
    tc = config['training']

    sp = spm.SentencePieceProcessor()
    sp.load(SPM_MODEL_PATH)
    mc['vocab_size'] = sp.get_piece_size()
    
    model = ArabicTransformer(mc).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=float(tc['learning_rate']))
    scaler = GradScaler()
    
    dataset_path = os.path.join(base_dir, "datasets/raw/instruction_arabic_corpus.txt")
    dataset = ChatMLDataset(dataset_path, sp, mc['max_seq_len'])
    dataloader = DataLoader(dataset, batch_size=tc['batch_size'], shuffle=True)

    print("Starting Production Instruction Tuning with Loss Masking...")
    model.train()
    for epoch in range(tc['epochs']):
        pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}")
        for x, mask in pbar:
            x, mask = x.to(device), mask.to(device)
            
            optimizer.zero_grad()
            with autocast():
                logits, _ = model(x)
                # استخدام الـ Mask لتجاهل الـ Loss على غير ردود المساعد
                loss = nn.CrossEntropyLoss(ignore_index=-100)(logits.view(-1, mc['vocab_size']), mask.view(-1))
            
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            pbar.set_postfix(loss=loss.item())

        # تصدير النموذج النهائي
        os.makedirs(EXPORTED_DIR, exist_ok=True)
        torch.save(model.state_dict(), os.path.join(EXPORTED_DIR, "model.pt"))
        with open(os.path.join(EXPORTED_DIR, "config.json"), "w") as f:
            json.dump(mc, f)
        print(f"Production model exported.")

if __name__ == "__main__":
    train_pro()
