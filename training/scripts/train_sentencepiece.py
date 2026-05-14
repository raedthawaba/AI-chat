import os
import sentencepiece as spm
import sys

# إضافة المسار الأساسي
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from scripts.constants import TOKENIZER_DIR

def train_spm_pro(input_file, vocab_size=8000):
    print(f"Training Production-Ready SentencePiece on: {input_file}")
    
    model_prefix = os.path.join(TOKENIZER_DIR, 'arabic_spm')
    
    # إعدادات احترافية جذرية لحل مشاكل اللغة العربية
    spm.SentencePieceTrainer.train(
        input=input_file,
        model_prefix=model_prefix,
        vocab_size=vocab_size,
        character_coverage=0.9995,
        model_type='unigram',
        normalization_rule_name='nfkc',
        pad_id=0,
        bos_id=1,
        eos_id=2,
        unk_id=3,
        # إضافة الرموز الخاصة كـ Special Tokens حقيقية
        user_defined_symbols=['<|user|>', '<|assistant|>'],
        # إعدادات المسافات والتقطيع
        split_by_whitespace=True,
        byte_fallback=True,
        remove_extra_whitespaces=False,
        input_sentence_size=1000000,
        shuffle_input_sentence=True
    )
    print(f"Production Tokenizer trained and saved to: {TOKENIZER_DIR}")

if __name__ == "__main__":
    # استخدام ملف بيانات التعليمات النظيف
    instruction_data = os.path.join(base_dir, "datasets/raw/instruction_arabic_corpus.txt")
    if os.path.exists(instruction_data):
        train_spm_pro(instruction_data)
    else:
        print(f"Error: Instruction data not found at {instruction_data}")
