import os
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import sentencepiece as spm
import sys
import yaml
import json
import asyncio

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer
from training.preprocessing.arabic_normalizer import get_normalizer

app = FastAPI(title="Arabic AI Engine Streaming API")

class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: Optional[int] = 200
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    top_k: Optional[int] = 50
    repetition_penalty: Optional[float] = 1.2
    no_repeat_ngram_size: Optional[int] = 3

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
            config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
            with open(config_path) as f:
                config = yaml.safe_load(f)
            self.model = ArabicTransformer(config['model']).to(self.device)
        
        self.model.eval()

    async def stream_generate(self, req: GenerateRequest) -> AsyncGenerator[str, None]:
        prompt = self.normalizer.normalize(req.prompt)
        
        # استخدام المولد (Generator) من النموذج
        generator = self.model.generate(
            tokenizer=self.sp,
            prompt=prompt,
            max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
            top_p=req.top_p,
            top_k=req.top_k,
            repetition_penalty=req.repetition_penalty,
            no_repeat_ngram_size=req.no_repeat_ngram_size,
            stream=True
        )
        
        for token in generator:
            yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.01) # لضمان عدم حظر الـ Event Loop

server = ModelServer()

@app.post("/stream")
async def stream_response(request: GenerateRequest):
    return StreamingResponse(server.stream_generate(request), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
