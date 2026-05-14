import re
import unicodedata

class ArabicNormalizer:
    def __init__(self):
        # التشكيل
        self.arabic_diacritics = re.compile(r'[\u064B-\u0652]')
        # الرموز غير العربية (مع الحفاظ على الأرقام والمسافات والترقيم الأساسي)
        self.non_arabic_chars = re.compile(r'[^\u0600-\u06FF0-9\s.,!؟]')
        
    def normalize(self, text: str) -> str:
        if not text:
            return ""
        
        # 1. NFKC Normalization
        text = unicodedata.normalize('NFKC', text)
        
        # 2. إزالة التشكيل
        text = self.arabic_diacritics.sub('', text)
        
        # 3. توحيد الألف (أ، إ، آ -> ا)
        text = re.sub(r'[أإآ]', 'ا', text)
        
        # 4. توحيد الياء والألف المقصورة (ى -> ي)
        text = re.sub(r'ى', 'ي', text)
        
        # 5. توحيد التاء المربوطة (ة -> ه) - اختياري حسب الرغبة، لكن يفضل الحفاظ عليها أحياناً
        # سنبقيها حالياً لزيادة دقة المعنى إلا إذا طلب المستخدم توحيدها
        
        # 6. إزالة الرموز الغريبة
        text = self.non_arabic_chars.sub(' ', text)
        
        # 7. تنظيف المسافات المكررة
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

def get_normalizer():
    return ArabicNormalizer()
