import os
import sys
import torch
import sentencepiece as spm

# إضافة المسارات
base_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, base_dir)
from scripts.constants import EXPORTED_DIR, SPM_MODEL_PATH
from inference.generation.model import ArabicTransformer

def test_inference():
    print("Loading Production Model for Inference Test...")
    
    # تحميل الـ Tokenizer
    sp = spm.SentencePieceProcessor()
    sp.load(SPM_MODEL_PATH)
    
    # تحميل النموذج
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ArabicTransformer.from_pretrained(EXPORTED_DIR, device=device)
    
    prompts = [
        "مرحبا",
        "ما هو الذكاء الاصطناعي؟",
        "من هو ابن رشد؟",
        "كيف حالك؟"
    ]
    
    print("\n--- Running Inference Tests ---")
    for prompt in prompts:
        print(f"\nUser: {prompt}")
        
        # التوليد
        response_gen = model.generate(
            tokenizer=sp,
            prompt=prompt,
            max_new_tokens=50,
            temperature=0.7,
            top_p=0.9,
            top_k=50,
            repetition_penalty=1.2,
            stream=True
        )
        
        print("Assistant: ", end="", flush=True)
        for token in response_gen:
            print(token, end="", flush=True)
        print()
        print("-" * 30)

if __name__ == "__main__":
    test_inference()
