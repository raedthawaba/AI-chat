import os
import sys
import torch
import sentencepiece as spm

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, base_dir)
from scripts.constants import EXPORTED_DIR, SPM_MODEL_PATH
from inference.generation.model import ArabicTransformer

def chat():
    print("--- Arabic AI Engine Production Chat ---")
    print("Loading model, please wait...")
    
    # تحميل الـ Tokenizer
    sp = spm.SentencePieceProcessor()
    if not os.path.exists(SPM_MODEL_PATH):
        print(f"Error: Tokenizer model not found at {SPM_MODEL_PATH}")
        return
    sp.load(SPM_MODEL_PATH)
    
    # تحميل النموذج
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if not os.path.exists(os.path.join(EXPORTED_DIR, "model.pt")):
        print(f"Error: Model weights not found at {EXPORTED_DIR}")
        return
        
    try:
        model = ArabicTransformer.from_pretrained(EXPORTED_DIR, device=device)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    print("\nWelcome! Type 'exit' to quit.")
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['exit', 'quit', 'خروج']:
                break
            if not user_input.strip():
                continue
                
            print("Assistant: ", end="", flush=True)
            
            # التوليد بنظام الـ Streaming
            response_gen = model.generate(
                tokenizer=sp,
                prompt=user_input,
                max_new_tokens=200,
                temperature=0.7,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.2,
                stream=True
            )
            
            for token in response_gen:
                print(token, end="", flush=True)
            print()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    chat()
