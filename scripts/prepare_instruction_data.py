import os
import sys

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, base_dir)
from training.preprocessing.arabic_normalizer import get_normalizer

def prepare_instruction_corpus(input_path, output_path):
    normalizer = get_normalizer()
    
    # بيانات تعليمات عربية نموذجية (Instruction Format)
    instructions = [
        {"user": "مرحبا", "assistant": "أهلاً بك! كيف يمكنني مساعدتك اليوم؟"},
        {"user": "من أنت؟", "assistant": "أنا نموذج ذكاء اصطناعي عربي متطور، صممت لمساعدتك في مختلف المهام."},
        {"user": "ما هي عاصمة السعودية؟", "assistant": "عاصمة المملكة العربية السعودية هي مدينة الرياض."},
        {"user": "كيف حالك؟", "assistant": "أنا بخير، شكراً لسؤالك! كيف يمكنني خدمتك؟"},
        {"user": "اكتب جملة عن اللغة العربية.", "assistant": "اللغة العربية هي لغة الضاد، وهي من أجمل وأغنى لغات العالم ببيانها وبلاغتها."},
        {"user": "ما هو الذكاء الاصطناعي؟", "assistant": "الذكاء الاصطناعي هو فرع من علوم الحاسوب يهدف إلى بناء أنظمة قادرة على محاكاة الذكاء البشري."},
        {"user": "أهلاً بك", "assistant": "أهلاً وسهلاً! يسعدني جداً مساعدتك والعمل معك."},
    ]
    
    print(f"Preparing instruction corpus at: {output_path}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        # إضافة البيانات النموذجية
        for item in instructions:
            line = f"<|user|> {item['user']} <|assistant|> {item['assistant']}"
            f.write(normalizer.normalize(line) + "\n")
            
        # إضافة البيانات من الملف الأصلي مع تنظيفها وتحويلها لتنسيق التعليمات
        if os.path.exists(input_path):
            with open(input_path, 'r', encoding='utf-8') as fin:
                for line in fin:
                    cleaned = normalizer.normalize(line)
                    if 20 < len(cleaned) < 500:
                        formatted = f"<|user|> {cleaned[:50]}... <|assistant|> {cleaned}"
                        f.write(formatted + "\n")

    print("Instruction corpus preparation completed.")

if __name__ == "__main__":
    raw_path = os.path.join(base_dir, "datasets/raw/massive_arabic_corpus.txt")
    instruction_path = os.path.join(base_dir, "datasets/raw/instruction_arabic_corpus.txt")
    prepare_instruction_corpus(raw_path, instruction_path)
