import os
import sys
import re

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, base_dir)
from training.preprocessing.arabic_normalizer import get_normalizer

def prepare_data(input_path, output_path):
    normalizer = get_normalizer()
    seen_lines = set()
    count = 0
    
    print(f"Processing dataset: {input_path}")
    with open(input_path, 'r', encoding='utf-8') as fin, open(output_path, 'w', encoding='utf-8') as fout:
        for line in fin:
            cleaned = normalizer.normalize(line)
            
            # Deduplication & Quality Filter
            if cleaned and cleaned not in seen_lines and len(cleaned) > 20:
                fout.write(cleaned + "\n")
                seen_lines.add(cleaned)
                count += 1
                
            if count % 10000 == 0 and count > 0:
                print(f"Processed {count} unique high-quality lines...")

    print(f"Dataset preparation completed. Total unique lines: {count}")
    print(f"Cleaned dataset saved to: {output_path}")

if __name__ == "__main__":
    raw_path = os.path.join(base_dir, "datasets/raw/massive_arabic_corpus.txt")
    clean_path = os.path.join(base_dir, "datasets/raw/massive_arabic_corpus_clean.txt")
    
    if os.path.exists(raw_path):
        prepare_data(raw_path, clean_path)
    else:
        print("Raw dataset not found.")
