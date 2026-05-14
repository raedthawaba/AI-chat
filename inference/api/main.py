import os
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sentencepiece as spm
import sys
import yaml

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer
from training.preprocessing.arabic_normalizer import get_normalizer

app = FastAPI(title="Arabic AI Engine API - Pro Edition")

class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: Optional[int] = 200
    temperature: Optional[float] = 0.7
    top_k: Optional[int] = 50
    top_p: Optional[float] = 0.9
    repetition_penalty: Optional[float] = 1.2

class GenerateResponse(BaseModel):
    generated_text: str

class ModelServer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.normalizer = get_normalizer()
        
        # تحميل الـ Tokenizer
        self.sp = spm.SentencePieceProcessor()
        self.sp.load(os.path.join(base_dir, "models/tokenizer/arabic_spm.model"))
        
        # تحميل النموذج
        export_dir = os.path.join(base_dir, "models/exported")
        if os.path.exists(os.path.join(export_dir, "model.pt")):
            self.model = ArabicTransformer.from_pretrained(export_dir, device=self.device)
        else:
            # Fallback for initialization
            config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
            with open(config_path) as f:
                config = yaml.safe_load(f)
            self.model = ArabicTransformer(config['model']).to(self.device)
        
        self.model.eval()

    @torch.no_grad()
    def generate(self, req: GenerateRequest):
        prompt = self.normalizer.normalize(req.prompt)
        input_ids = torch.tensor([[2] + self.sp.encode_as_ids(prompt)], dtype=torch.long).to(self.device)
        
        bsz, seqlen = input_ids.shape
        generated = input_ids
        kv_caches = None
        
        # Initial forward pass
        logits, kv_caches = self.model.forward(input_ids, start_pos=0)
        
        for i in range(req.max_new_tokens):
            next_token_logits = logits[:, -1, :]
            
            # Repetition penalty
            for token_id in set(generated[0].tolist()):
                next_token_logits[0, token_id] /= req.repetition_penalty
            
            next_token_logits = next_token_logits / max(req.temperature, 1e-8)
            
            # Top-K
            if req.top_k > 0:
                topk_vals, _ = torch.topk(next_token_logits, min(req.top_k, next_token_logits.size(-1)))
                next_token_logits[next_token_logits < topk_vals[:, -1:]] = float("-inf")
            
            # Top-P
            if req.top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(next_token_logits, descending=True)
                cum_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
                sorted_indices_to_remove = cum_probs - F.softmax(sorted_logits, dim=-1) > req.top_p
                sorted_logits[sorted_indices_to_remove] = float("-inf")
                next_token_logits = torch.zeros_like(next_token_logits).scatter_(1, sorted_indices, sorted_logits)

            probs = F.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            token_id = next_token.item()
            if token_id == 3: # EOS
                break
                
            generated = torch.cat([generated, next_token], dim=1)
            logits, kv_caches = self.model.forward(next_token, start_pos=seqlen + i, kv_caches=kv_caches)
            
        return self.sp.decode(generated[0].tolist())

server = ModelServer()

@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    try:
        result = server.generate(request)
        return GenerateResponse(generated_text=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
