import os
import json
import torch
import math
from sacrebleu.metrics import BLEU
from rouge_score import rouge_scorer
from tokenizers import Tokenizer
import sys
import yaml
from transformers import pipeline

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer

class AdvancedEvaluator:
    def __init__(self, model_path, config_path, tokenizer_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        with open(config_path) as f:
            config = yaml.safe_load(f)
        mc = config['model']
        
        self.tokenizer = Tokenizer.from_file(tokenizer_path)
        self.model = ArabicTransformer(
            vocab_size=mc['vocab_size'],
            d_model=mc['d_model'],
            n_heads=mc.get('n_heads', 16),
            n_kv_heads=mc.get('n_kv_heads', 8),
            num_layers=mc['num_layers'],
            dim_feedforward=mc['dim_feedforward'],
            max_seq_len=mc['max_seq_len'],
        ).to(self.device)
        
        if os.path.exists(model_path):
            state = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state.get('model_state_dict', state), strict=False)
        
        self.model.eval()
        
        # نماذج مساعدة للتقييم
        self.toxicity_classifier = pipeline("text-classification", model="Hate-speech-CNERG/dehatebert-mono-arabic")
        self.bleu = BLEU()
        self.rouge = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=False)

    def evaluate_sample(self, prompt, reference):
        input_ids = torch.tensor([[4] + self.tokenizer.encode(prompt).ids], dtype=torch.long).to(self.device)
        output_ids = self.model.generate(input_ids, max_new_tokens=100)
        generated_text = self.tokenizer.decode(output_ids[0].tolist())
        
        # مقاييس الجودة
        bleu_score = self.bleu.sentence_score(generated_text, [reference]).score
        rouge_scores = self.rouge.score(reference, generated_text)
        
        # كشف السمية
        toxicity = self.toxicity_classifier(generated_text[:512])[0]
        
        return {
            "prompt": prompt,
            "generated": generated_text,
            "reference": reference,
            "bleu": bleu_score,
            "rouge1": rouge_scores['rouge1'].fmeasure,
            "toxicity": toxicity
        }

    def run_full_eval(self, test_data):
        results = []
        for item in test_data:
            results.append(self.evaluate_sample(item['prompt'], item['reference']))
        
        report = {
            "average_bleu": sum(r['bleu'] for r in results) / len(results),
            "samples": results
        }
        
        output_path = os.path.join(base_dir, "evaluation/reports/advanced_eval_report.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=4)
        print(f"Advanced evaluation report saved to {output_path}")

if __name__ == "__main__":
    # أمثلة للتقييم
    test_samples = [
        {"prompt": "ما هي فوائد القراءة؟", "reference": "القراءة تساعد في توسيع المدارك وتحسين التركيز."},
        {"prompt": "كيف تزرع شجرة؟", "reference": "لزراعة شجرة يجب حفر حفرة مناسبة ووضع الشتلة وسقيها بالماء."}
    ]
    
    evaluator = AdvancedEvaluator(
        model_path=os.path.join(base_dir, "models/exported/model_llama_style.pt"),
        config_path=os.path.join(base_dir, "configs/models/default_config.yaml"),
        tokenizer_path=os.path.join(base_dir, "models/tokenizer/tokenizer.json")
    )
    evaluator.run_full_eval(test_samples)
