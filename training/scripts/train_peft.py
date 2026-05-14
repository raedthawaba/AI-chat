import os
import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import BitsAndBytesConfig
import yaml
import sys
import sentencepiece as spm

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer
from training.scripts.train import ArabicDataset, train

def setup_peft_model(model, use_lora=True, use_4bit=False):
    if use_4bit:
        # ملاحظة: يتطلب bitsandbytes و CUDA
        print("Enabling 4-bit Quantization...")
        # في بيئة التدريب الحقيقية، يتم تحميل النموذج بـ BitsAndBytesConfig
        # هنا سنقوم بمحاكاة العملية للنموذج المخصص
        pass

    if use_lora:
        print("Setting up LoRA...")
        lora_config = LoraConfig(
            r=8,
            lora_alpha=32,
            target_modules=["wq", "wk", "wv", "wo"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM"
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
    
    return model

if __name__ == "__main__":
    # هذا السكربت يوضح كيفية دمج PEFT مع نظام التدريب الحالي
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    model = ArabicTransformer(config['model']).to(device)
    model = setup_peft_model(model)
    
    # يمكن الآن استدعاء دالة التدريب الأساسية مع النموذج المطور
    print("PEFT Model ready for training.")
