import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# المجلدات الأساسية
CONFIGS_DIR = os.path.join(BASE_DIR, 'configs')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
DATASETS_DIR = os.path.join(BASE_DIR, 'datasets')
INFERENCE_DIR = os.path.join(BASE_DIR, 'inference')
TRAINING_DIR = os.path.join(BASE_DIR, 'training')

# مسارات محددة
DEFAULT_CONFIG_PATH = os.path.join(CONFIGS_DIR, 'models', 'default_config.yaml')
TOKENIZER_DIR = os.path.join(MODELS_DIR, 'tokenizer')
CHECKPOINTS_DIR = os.path.join(MODELS_DIR, 'checkpoints')
EXPORTED_DIR = os.path.join(MODELS_DIR, 'exported')
SPM_MODEL_PATH = os.path.join(TOKENIZER_DIR, 'arabic_spm.model')

# إنشاء المجلدات إذا لم تكن موجودة
for d in [CONFIGS_DIR, MODELS_DIR, DATASETS_DIR, INFERENCE_DIR, TRAINING_DIR, TOKENIZER_DIR, CHECKPOINTS_DIR, EXPORTED_DIR]:
    os.makedirs(d, exist_ok=True)
