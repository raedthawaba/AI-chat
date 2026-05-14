import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional, Tuple, List, Dict
import json
import os

class RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def _norm(self, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + float(self.eps))

    def forward(self, x):
        output = self._norm(x.float()).type_as(x)
        return output * self.weight

def precompute_freqs_cis(dim: int, end: int, theta: float = 10000.0):
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: (dim // 2)].float() / dim))
    t = torch.arange(end, device=freqs.device)
    freqs = torch.outer(t, freqs).float()
    freqs_cis = torch.polar(torch.ones_like(freqs), freqs)
    return freqs_cis

def apply_rotary_emb(xq: torch.Tensor, xk: torch.Tensor, freqs_cis: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    xq_ = torch.view_as_complex(xq.float().reshape(*xq.shape[:-1], -1, 2))
    xk_ = torch.view_as_complex(xk.float().reshape(*xk.shape[:-1], -1, 2))
    freqs_cis = freqs_cis.view(1, xq_.size(1), 1, xq_.size(3))
    xq_out = torch.view_as_real(xq_ * freqs_cis).flatten(3)
    xk_out = torch.view_as_real(xk_ * freqs_cis).flatten(3)
    return xq_out.type_as(xq), xk_out.type_as(xk)

class Attention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, n_kv_heads: Optional[int] = None):
        super().__init__()
        self.n_heads = n_heads
        self.n_kv_heads = n_kv_heads if n_kv_heads is not None else n_heads
        self.head_dim = d_model // n_heads
        
        self.wq = nn.Linear(d_model, n_heads * self.head_dim, bias=False)
        self.wk = nn.Linear(d_model, self.n_kv_heads * self.head_dim, bias=False)
        self.wv = nn.Linear(d_model, self.n_kv_heads * self.head_dim, bias=False)
        self.wo = nn.Linear(n_heads * self.head_dim, d_model, bias=False)

    def forward(self, x: torch.Tensor, freqs_cis: torch.Tensor, mask: Optional[torch.Tensor] = None, cache: Optional[Tuple[torch.Tensor, torch.Tensor]] = None):
        bsz, seqlen, _ = x.shape
        xq, xk, xv = self.wq(x), self.wk(x), self.wv(x)

        xq = xq.view(bsz, seqlen, self.n_heads, self.head_dim)
        xk = xk.view(bsz, seqlen, self.n_kv_heads, self.head_dim)
        xv = xv.view(bsz, seqlen, self.n_kv_heads, self.head_dim)

        xq, xk = apply_rotary_emb(xq, xk, freqs_cis=freqs_cis)

        if cache is not None:
            k_cache, v_cache = cache
            xk = torch.cat([k_cache, xk], dim=1)
            xv = torch.cat([v_cache, xv], dim=1)
        
        new_kv_cache = (xk, xv)

        if self.n_kv_heads != self.n_heads:
            xk = xk.repeat_interleave(self.n_heads // self.n_kv_heads, dim=2)
            xv = xv.repeat_interleave(self.n_heads // self.n_kv_heads, dim=2)

        xq = xq.transpose(1, 2)
        xk = xk.transpose(1, 2)
        xv = xv.transpose(1, 2)

        output = F.scaled_dot_product_attention(xq, xk, xv, attn_mask=mask)
        output = output.transpose(1, 2).contiguous().view(bsz, seqlen, -1)
        return self.wo(output), new_kv_cache

class FeedForward(nn.Module):
    def __init__(self, dim: int, hidden_dim: int, multiple_of: int = 256):
        super().__init__()
        hidden_dim = int(2 * hidden_dim / 3)
        hidden_dim = multiple_of * ((hidden_dim + multiple_of - 1) // multiple_of)

        self.w1 = nn.Linear(dim, hidden_dim, bias=False)
        self.w2 = nn.Linear(hidden_dim, dim, bias=False)
        self.w3 = nn.Linear(dim, hidden_dim, bias=False)

    def forward(self, x):
        return self.w2(F.silu(self.w1(x)) * self.w3(x))

class TransformerBlock(nn.Module):
    def __init__(self, layer_id: int, d_model: int, n_heads: int, n_kv_heads: Optional[int], dim_feedforward: int, norm_eps: float):
        super().__init__()
        self.layer_id = layer_id
        self.attention = Attention(d_model, n_heads, n_kv_heads)
        self.feed_forward = FeedForward(d_model, dim_feedforward)
        self.attention_norm = RMSNorm(d_model, eps=norm_eps)
        self.ffn_norm = RMSNorm(d_model, eps=norm_eps)

    def forward(self, x: torch.Tensor, freqs_cis: torch.Tensor, mask: Optional[torch.Tensor] = None, cache: Optional[Tuple[torch.Tensor, torch.Tensor]] = None):
        h, new_kv_cache = self.attention(self.attention_norm(x), freqs_cis, mask, cache=cache)
        out = x + h
        out = out + self.feed_forward(self.ffn_norm(out))
        return out, new_kv_cache

class ArabicTransformer(nn.Module):
    def __init__(self, config: Dict):
        super().__init__()
        self.config = config
        self.vocab_size = config['vocab_size']
        self.num_layers = config['num_layers']
        self.d_model = config['d_model']
        self.max_seq_len = config['max_seq_len']
        
        self.tok_embeddings = nn.Embedding(self.vocab_size, self.d_model)
        self.layers = nn.ModuleList([
            TransformerBlock(i, self.d_model, config['n_heads'], config.get('n_kv_heads'), config['dim_feedforward'], config.get('norm_eps', 1e-5))
            for i in range(self.num_layers)
        ])
        self.norm = RMSNorm(self.d_model, eps=config.get('norm_eps', 1e-5))
        self.output = nn.Linear(self.d_model, self.vocab_size, bias=False)

        self.freqs_cis = precompute_freqs_cis(self.d_model // config['n_heads'], self.max_seq_len * 2)

    def forward(self, tokens: torch.Tensor, start_pos: int = 0, kv_caches: Optional[List[Tuple[torch.Tensor, torch.Tensor]]] = None):
        _bsz, seqlen = tokens.shape
        h = self.tok_embeddings(tokens)
        self.freqs_cis = self.freqs_cis.to(h.device)
        freqs_cis = self.freqs_cis[start_pos : start_pos + seqlen]

        mask = None
        if seqlen > 1:
            mask = torch.full((seqlen, seqlen), float("-inf"), device=tokens.device)
            mask = torch.triu(mask, diagonal=1)

        new_kv_caches = []
        for i, layer in enumerate(self.layers):
            cache = kv_caches[i] if kv_caches is not None else None
            h, new_cache = layer(h, freqs_cis, mask, cache=cache)
            new_kv_caches.append(new_cache)

        h = self.norm(h)
        logits = self.output(h).float()
        return logits, new_kv_caches

    @torch.no_grad()
    def generate(
        self, 
        tokenizer, 
        prompt: str, 
        max_new_tokens: int = 200, 
        temperature: float = 0.7, 
        top_p: float = 0.9, 
        top_k: int = 50, 
        repetition_penalty: float = 1.2,
        no_repeat_ngram_size: int = 3,
        stream: bool = False
    ):
        self.eval()
        device = next(self.parameters()).device
        
        # تنسيق ChatML للاستدلال: <bos><|user|> السؤال <|assistant|>
        formatted_prompt = f"<|user|> {prompt} <|assistant|>"
        tokens = [tokenizer.bos_id()] + tokenizer.encode_as_ids(formatted_prompt)
        input_ids = torch.tensor([tokens], dtype=torch.long).to(device)
        
        generated = input_ids
        kv_caches = None
        
        for i in range(max_new_tokens):
            logits, kv_caches = self.forward(input_ids if i == 0 else next_token, start_pos=0 if i == 0 else generated.size(1) - 1, kv_caches=kv_caches)
            next_token_logits = logits[:, -1, :]
            
            # Repetition Penalty
            for token_id in set(generated[0].tolist()):
                next_token_logits[0, token_id] /= repetition_penalty
            
            # Sampling
            next_token_logits = next_token_logits / max(temperature, 1e-8)
            
            # Top-K
            if top_k > 0:
                indices_to_remove = next_token_logits < torch.topk(next_token_logits, top_k)[0][..., -1, None]
                next_token_logits[indices_to_remove] = float("-inf")
            
            # Top-P
            if top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(next_token_logits, descending=True)
                cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
                sorted_indices_to_remove = cumulative_probs > top_p
                sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
                sorted_indices_to_remove[..., 0] = 0
                indices_to_remove = sorted_indices[sorted_indices_to_remove]
                next_token_logits[0, indices_to_remove] = float("-inf")

            probs = F.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            if next_token.item() == tokenizer.eos_id():
                break
                
            generated = torch.cat([generated, next_token], dim=1)
            
            # فك التشفير وتنظيف المخرجات
            decoded_token = tokenizer.decode([next_token.item()])
            
            # منع ظهور رموز المحادثة في المخرجات
            if "<|user|>" in decoded_token or "<|assistant|>" in decoded_token:
                break
                
            if stream:
                yield decoded_token
            
        if not stream:
            full_text = tokenizer.decode(generated[0].tolist())
            # استخراج رد المساعد فقط
            if "<|assistant|>" in full_text:
                return full_text.split("<|assistant|>")[-1].strip()
            return full_text

    def save_pretrained(self, save_dir: str):
        os.makedirs(save_dir, exist_ok=True)
        with open(os.path.join(save_dir, "config.json"), "w") as f:
            json.dump(self.config, f, indent=4)
        torch.save(self.state_dict(), os.path.join(save_dir, "model.pt"))

    @classmethod
    def from_pretrained(cls, load_dir: str, device='cpu'):
        with open(os.path.join(load_dir, "config.json"), "r") as f:
            config = json.load(f)
        model = cls(config)
        state_dict = torch.load(os.path.join(load_dir, "model.pt"), map_location=device)
        model.load_state_dict(state_dict)
        return model.to(device)
