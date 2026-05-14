import os
import json
from datasets import load_dataset
import re

def clean_arabic_text(text):
    # إزالة الروابط
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # إزالة الرموز غير المرغوب فيها مع الحفاظ على الحروف العربية والأرقام
    text = re.sub(r'[^\u0600-\u06FF0-9\s.]', '', text)
    # إزالة المسافات الزائدة
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def collect_wikipedia():
    print("Collecting Wikipedia Arabic data...")
    try:
        # استخدام dataset بديل للويكيبيديا العربية يدعم التنسيق الجديد
        dataset = load_dataset("wikimedia/wikipedia", "20231101.ar", split='train[:1000]')
        texts = [clean_arabic_text(item['text']) for item in dataset if len(item['text']) > 100]
        return texts
    except Exception as e:
        print(f"Error collecting Wikipedia: {e}")
        return []

def collect_news():
    print("Collecting Arabic News data...")
    try:
        # استخدام dataset متوفر للأخبار العربية
        dataset = load_dataset("ajgt_twitter_ar", split='train')
        texts = [clean_arabic_text(item['text']) for item in dataset]
        return texts
    except Exception as e:
        print(f"Error collecting News: {e}")
        return []

def save_data(texts, filename):
    output_path = os.path.join("/home/ubuntu/arabic_ai_engine/datasets/raw", filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        for text in texts:
            f.write(text + "\n")
    print(f"Saved {len(texts)} items to {output_path}")

if __name__ == "__main__":
    all_texts = []
    
    wiki_texts = collect_wikipedia()
    all_texts.extend(wiki_texts)
    
    news_texts = collect_news()
    all_texts.extend(news_texts)
    
    # إزالة التكرار
    unique_texts = list(set(all_texts))
    
    save_data(unique_texts, "arabic_corpus_v2.txt")
    print("Data collection completed.")
