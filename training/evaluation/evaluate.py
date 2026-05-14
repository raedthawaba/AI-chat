import os
import torch
import torch.nn as nn
import math
import sys
import sentencepiece as spm
from sacrebleu.metrics import BLEU
from rouge_score import rouge_scorer
import json
import yaml

# إضافة المسارات
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer

class ArabicEvaluator:
    def __init__(self, model_dir):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ArabicTransformer.from_pretrained(model_dir, device=self.device)
        self.sp = spm.SentencePieceProcessor()
        self.sp.load(os.path.join(base_dir, "models/tokenizer/arabic_spm.model"))
        self.model.eval()

    def calculate_perplexity(self, text):
        tokens = [self.sp.bos_id()] + self.sp.encode_as_ids(text) + [self.sp.eos_id()]
        input_ids = torch.tensor([tokens], dtype=torch.long).to(self.device)
        
        with torch.no_grad():
            logits, _ = self.model(input_ids)
            shift_logits = logits[:, :-1, :].contiguous()
            shift_labels = input_ids[:, 1:].contiguous()
            loss_fct = nn.CrossEntropyLoss()
            loss = loss_fct(shift_logits.view(-1, self.model.vocab_size), shift_labels.view(-1))
            return math.exp(loss.item())

    def calculate_metrics(self, reference, hypothesis):
        # BLEU
        bleu = BLEU()
        bleu_score = bleu.sentence_score(hypothesis, [reference]).score
        
        # ROUGE
        scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=True)
        scores = scorer.score(reference, hypothesis)
        
        return {
            "bleu": bleu_score,
            "rouge1": scores['rouge1'].fmeasure,
            "rougeL": scores['rougeL'].fmeasure
        }

    def run_full_eval(self, test_data_path):
        results = []
        total_ppl = 0
        count = 0
        
        with open(test_data_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                ppl = self.calculate_perplexity(line.strip())
                total_ppl += ppl
                count += 1
                
                # توليد نص للمقارنة (مثال بسيط)
                prompt = " ".join(line.split()[:3])
                ref = line.strip()
                hyp = self.model.generate(self.sp, prompt, max_new_tokens=20)
                
                metrics = self.calculate_metrics(ref, hyp)
                results.append({
                    "text": line.strip(),
                    "perplexity": ppl,
                    "metrics": metrics
                })
                if count >= 50: break # تقييم عينة فقط
        
        report = {
            "avg_perplexity": total_ppl / count if count > 0 else 0,
            "sample_results": results
        }
        
        os.makedirs(os.path.join(base_dir, "evaluation/reports"), exist_ok=True)
        with open(os.path.join(base_dir, "evaluation/reports/full_eval_report.json"), "w", encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=4)
        
        print(f"Evaluation completed. Avg Perplexity: {report['avg_perplexity']:.2f}")
        return report

if __name__ == "__main__":
    export_dir = os.path.join(base_dir, "models/exported")
    if os.path.exists(os.path.join(export_dir, "model.pt")):
        evaluator = ArabicEvaluator(export_dir)
        test_file = os.path.join(base_dir, "datasets/raw/massive_arabic_corpus.txt")
        evaluator.run_full_eval(test_file)
    else:
        print("Model not found for evaluation.")
