import os
import json
from datasets import load_dataset
import re
from tqdm import tqdm

def clean_arabic_text(text):
    # إزالة الروابط والرموز غير العربية مع الحفاظ على التشكيل الأساسي
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'[^\u0600-\u06FF0-9\s.,!؟]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def collect_data(dataset_name, subset=None, split='train', text_key='text', limit=10000):
    print(f"Collecting data from {dataset_name}...")
    try:
        dataset = load_dataset(dataset_name, subset, split=f"{split}[:{limit}]")
        texts = []
        for item in tqdm(dataset):
            cleaned = clean_arabic_text(item[text_key])
            if len(cleaned) > 50:
                texts.append(cleaned)
        return texts
    except Exception as e:
        print(f"Error collecting {dataset_name}: {e}")
        return []

def save_massive_corpus(texts, output_filename):
    output_path = os.path.join("/home/ubuntu/arabic_ai_engine/datasets/raw", output_filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        for text in texts:
            f.write(text + "\n")
    print(f"Saved {len(texts)} items to {output_path}")

if __name__ == "__main__":
    all_texts = []
    
    # 1. Wikipedia Arabic
    all_texts.extend(collect_data("wikimedia/wikipedia", "20231101.ar", limit=5000))
    
    # 2. OSCAR Arabic (Sample)
    # all_texts.extend(collect_data("oscar-corpus/OSCAR-2201", "ar", limit=5000))
    
    # 3. Arabic News (AJGT)
    all_texts.extend(collect_data("ajgt_twitter_ar", limit=5000))
    
    # 4. QA Arabic
    all_texts.extend(collect_data("m_atf/arabic_qa", limit=2000, text_key='context'))

    unique_texts = list(set(all_texts))
    save_massive_corpus(unique_texts, "massive_arabic_corpus.txt")
    print("Massive data collection completed.")
