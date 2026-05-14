import torch
import torch.nn.functional as F
import re

class StreamGenerator:
    def __init__(self, model, tokenizer, device):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device
        self.eos_id = tokenizer.token_to_id("[EOS]") or 2
        self.bos_id = tokenizer.token_to_id("[BOS]") or 4

    @torch.no_grad()
    def generate_stream(
        self,
        text: str,
        max_new_tokens: int = 200,
        temperature: float = 0.7,
        top_k: int = 50,
        top_p: float = 0.9,
        repetition_penalty: float = 1.2,
    ):
        self.model.eval()
        encoded = self.tokenizer.encode(text)
        input_ids = torch.tensor([[self.bos_id] + encoded.ids], dtype=torch.long).to(self.device)
        
        bsz, seqlen = input_ids.shape
        generated = input_ids
        kv_caches = None
        
        # Initial forward pass
        logits, kv_caches = self.model.forward(input_ids, start_pos=0)
        
        for i in range(max_new_tokens):
            next_token_logits = logits[:, -1, :]
            
            # Repetition penalty
            for token_id in set(generated[0].tolist()):
                next_token_logits[0, token_id] /= repetition_penalty
            
            next_token_logits = next_token_logits / max(temperature, 1e-8)
            
            # Top-K
            if top_k > 0:
                topk_vals, _ = torch.topk(next_token_logits, min(top_k, next_token_logits.size(-1)))
                next_token_logits[next_token_logits < topk_vals[:, -1:]] = float("-inf")
            
            # Top-P
            if top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(next_token_logits, descending=True)
                cum_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
                sorted_indices_to_remove = cum_probs - F.softmax(sorted_logits, dim=-1) > top_p
                sorted_logits[sorted_indices_to_remove] = float("-inf")
                next_token_logits = torch.zeros_like(next_token_logits).scatter_(1, sorted_indices, sorted_logits)

            probs = F.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            token_id = next_token.item()
            if token_id == self.eos_id:
                break
                
            generated = torch.cat([generated, next_token], dim=1)
            word = self.tokenizer.decode([token_id])
            word = re.sub(r'\[.*?\]', '', word)
            yield word
            
            # Next forward pass with KV Cache
            logits, kv_caches = self.model.forward(next_token, start_pos=seqlen + i, kv_caches=kv_caches)
