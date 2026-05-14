import torch
import os
import sys
import yaml

# إضافة المسارات اللازمة
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer

def quantize():
    print("Starting INT8 Dynamic Quantization...")
    device = torch.device("cpu") # Quantization غالباً ما يتم للـ CPU
    
    # تحميل الإعدادات
    config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    mc = config['model']
    
    # إنشاء النموذج الأصلي
    model = ArabicTransformer(
        vocab_size=mc['vocab_size'],
        d_model=mc['d_model'],
        nhead=mc['nhead'],
        num_layers=mc['num_layers'],
        dim_feedforward=mc['dim_feedforward'],
        max_seq_len=mc['max_seq_len'],
    ).to(device)
    
    model_path = os.path.join(base_dir, "models/exported/model.pt")
    if os.path.exists(model_path):
        state = torch.load(model_path, map_location=device)
        model.load_state_dict(state.get('model_state_dict', state), strict=False)
    
    # تطبيق Quantization الديناميكي
    # نركز على طبقات Linear لأنها تأخذ المساحة الأكبر
    quantized_model = torch.quantization.quantize_dynamic(
        model, 
        {torch.nn.Linear}, 
        dtype=torch.qint8
    )
    
    # حفظ النموذج المضغوط
    output_path = os.path.join(base_dir, "models/exported/model_int8.pt")
    torch.save(quantized_model.state_dict(), output_path)
    
    original_size = os.path.getsize(model_path) / (1024 * 1024)
    quantized_size = os.path.getsize(output_path) / (1024 * 1024)
    
    print(f"Original Model Size: {original_size:.2f} MB")
    print(f"Quantized Model Size: {quantized_size:.2f} MB")
    print(f"Compression Ratio: {original_size/quantized_size:.2f}x")
    print(f"Quantized model saved to {output_path}")

if __name__ == "__main__":
    quantize()
