# 🇸🇦 Arabic AI Engine - Production Ready Edition

هذه هي النسخة الاحترافية المتكاملة من محرك الذكاء الاصطناعي العربي، المصممة هندسياً لتضاهي النماذج العالمية مثل LLaMA و Mistral.

## 🌟 الميزات الاحترافية المضافة:

### 1. نظام التوليد المتقدم (Advanced Generation)
- **Sampling:** دعم كامل لـ `top_k`, `top_p`, و `temperature`.
- **Penalties:** تطبيق `repetition_penalty` و `no_repeat_ngram_size` لمنع التكرار.
- **Streaming:** نظام بث تدريجي (Token-by-token) عبر FastAPI و Generator-based API.

### 2. التدريب الفعال (Efficient Training)
- **PEFT/LoRA:** دعم كامل لتدريب LoRA و QLoRA لتقليل استهلاك الذاكرة.
- **Quantization:** دعم 4-bit و 8-bit quantization باستخدام `bitsandbytes`.
- **Optimization:** دعم `Gradient Checkpointing` و `Mixed Precision`.

### 3. نظام التقييم والبيانات (Evaluation & Data)
- **Metrics:** حساب `Perplexity`, `BLEU`, و `ROUGE` بشكل آلي.
- **Dataset Pipeline:** سكربت `prepare_dataset.py` للتنظيف العميق وإزالة التكرار.
- **Normalization:** خط معالجة نصوص احترافي يحل مشاكل تقطع الكلمات العربية.

### 4. البنية التحتية (Infrastructure)
- **Checkpoints:** نظام حفظ واستعادة تلقائي (Auto-resume) يحفظ حالة الـ Optimizer والـ Scaler.
- **Config:** توحيد الإعدادات عبر `config.json` لمنع أي Mismatch.
- **Tests:** نظام اختبارات شامل لضمان استقرار المحرك.

## 🚀 كيفية التشغيل:

### الدردشة المباشرة:
```bash
python inference/chat.py
```

### تشغيل الـ Streaming API:
```bash
python inference/api/streaming_api.py
```

### التقييم الشامل:
```bash
python training/evaluation/evaluate.py
```

### التدريب باستخدام LoRA:
```bash
python training/scripts/train_peft.py
```

## 📂 هيكل المشروع المحدث:
- `inference/`: محرك الاستدلال والـ API والـ Streaming.
- `training/`: سكربتات التدريب (LoRA, Full) والتقييم.
- `scripts/`: تجهيز البيانات والـ Quantization.
- `configs/`: إعدادات النموذج والتدريب.
- `tests/`: اختبارات الوحدة (Unit Tests).
- `models/`: النماذج المصدرة والـ Tokenizer والـ Checkpoints.
