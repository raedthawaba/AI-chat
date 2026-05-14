import unittest
import os
import torch
import sys
import sentencepiece as spm

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer
from training.preprocessing.arabic_normalizer import get_normalizer

class TestArabicEngine(unittest.TestCase):
    def setUp(self):
        self.normalizer = get_normalizer()
        self.sp = spm.SentencePieceProcessor()
        sp_path = os.path.join(base_dir, "models/tokenizer/arabic_spm.model")
        if os.path.exists(sp_path):
            self.sp.load(sp_path)

    def test_normalization(self):
        text = "الْعَرَبِيَّةُ"
        normalized = self.normalizer.normalize(text)
        self.assertEqual(normalized, "العربيه") # حسب قواعد الـ normalizer الحالية

    def test_tokenizer_loading(self):
        self.assertTrue(os.path.exists(os.path.join(base_dir, "models/tokenizer/arabic_spm.model")))

    def test_model_structure(self):
        config = {
            'vocab_size': 32000,
            'num_layers': 2,
            'd_model': 128,
            'n_heads': 4,
            'n_kv_heads': 2,
            'dim_feedforward': 512,
            'max_seq_len': 512
        }
        model = ArabicTransformer(config)
        self.assertEqual(len(model.layers), 2)

if __name__ == "__main__":
    unittest.main()
