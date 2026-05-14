import os
import json
import torch
import math
from sacrebleu.metrics import BLEU
from rouge_score import rouge_scorer
from tokenizers import Tokenizer
import sys
import yaml

# إضافة المسارات اللازمة
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, base_dir)
from inference.generation.model import ArabicTransformer

def calculate_perplexity(model, tokenizer, text, device):
    model.eval()
    encoded = tokenizer.encode(text)
    input_ids = torch.tensor([[4] + encoded.ids], dtype=torch.long).to(device) # 4 is BOS
    
    with torch.no_grad():
        logits, loss = model(input_ids, labels=input_ids)
    
    return math.exp(loss.item()) if loss is not None else float('inf')

def evaluate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # تحميل الإعدادات والنموذج
    config_path = os.path.join(base_dir, "configs/models/default_config.yaml")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    mc = config['model']
    
    tokenizer_path = os.path.join(base_dir, "models/tokenizer/tokenizer.json")
    tokenizer = Tokenizer.from_file(tokenizer_path)
    
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
    
    # بيانات الاختبار (أمثلة بسيطة)
    test_data = [
        {"input": "ما هي عاصمة السعودية؟", "reference": "عاصمة السعودية هي الرياض."},
        {"input": "من هو مؤسس علم الجبر؟", "reference": "مؤسس علم الجبر هو الخوارزمي."},
    ]
    
    bleu = BLEU()
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=False)
    
    results = []
    total_ppl = 0
    
    for item in test_data:
        # حساب Perplexity على المرجع
        ppl = calculate_perplexity(model, tokenizer, item['reference'], device)
        total_ppl += ppl
        
        # توليد نص للمقارنة
        input_ids = torch.tensor([[4] + tokenizer.encode(item['input']).ids], dtype=torch.long).to(device)
        output_ids = model.generate(input_ids, max_new_tokens=50)
        generated_text = tokenizer.decode(output_ids[0].tolist())
        
        # حساب المقاييس
        bleu_score = bleu.sentence_score(generated_text, [item['reference']]).score
        rouge_scores = scorer.score(item['reference'], generated_text)
        
        results.append({
            "input": item['input'],
            "reference": item['reference'],
            "generated": generated_text,
            "perplexity": ppl,
            "bleu": bleu_score,
            "rouge1": rouge_scores['rouge1'].fmeasure,
            "rougeL": rouge_scores['rougeL'].fmeasure
        })
    
    avg_report = {
        "average_perplexity": total_ppl / len(test_data),
        "num_samples": len(test_data),
        "details": results
    }
    
    # حفظ التقرير
    report_path = os.path.join(base_dir, "evaluation/reports/eval_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(avg_report, f, ensure_ascii=False, indent=4)
    
    print(f"Evaluation report saved to {report_path}")
    print(f"Average Perplexity: {avg_report['average_perplexity']}")

if __name__ == "__main__":
    evaluate()
