import os
import glob
import PyPDF2
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, CrossEncoder
import faiss
import numpy as np
from ...scripts.maintenance.utils import clean_arabic_text, split_text_into_chunks

app = FastAPI(title="RAG Service")

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class RAGService:
    def __init__(self):
        # استخدام نموذج يدعم اللغة العربية بشكل جيد
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2') # يمكن استبداله بنموذج عربي متخصص لاحقاً
        self.index = None
        self.chunks = []
        self.knowledge_base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datasets/raw"))
        self.build_index()

    def extract_text_from_pdf(self, pdf_path):
        text = ""
        try:
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF {pdf_path}: {e}")
        return text

    def build_index(self):
        """قراءة الملفات (TXT + PDF)، تقسيمها، وبناء فهرس FAISS"""
        self.chunks = []
        txt_files = glob.glob(os.path.join(self.knowledge_base_path, "**/*.txt"), recursive=True)
        pdf_files = glob.glob(os.path.join(self.knowledge_base_path, "**/*.pdf"), recursive=True)
        
        all_files = txt_files + pdf_files
        if not all_files:
            print("⚠️ No knowledge base files found.")
            return

        for file_path in all_files:
            try:
                if file_path.endswith('.txt'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                elif file_path.endswith('.pdf'):
                    content = self.extract_text_from_pdf(file_path)
                
                cleaned_content = clean_arabic_text(content)
                file_chunks = split_text_into_chunks(cleaned_content)
                self.chunks.extend(file_chunks)
            except Exception as e:
                print(f"❌ Error reading {file_path}: {e}")

        if not self.chunks:
            return

        embeddings = self.model.encode(self.chunks)
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension) # استخدام Inner Product للتشابه
        faiss.normalize_L2(embeddings) # تطبيع المتجهات
        self.index.add(np.array(embeddings).astype('float32'))
        print(f"✅ Indexed {len(self.chunks)} chunks from {len(all_files)} files.")

    def search(self, query, top_k=5):
        if self.index is None or not self.chunks:
            return []
        
        cleaned_query = clean_arabic_text(query)
        query_vector = self.model.encode([cleaned_query])
        faiss.normalize_L2(query_vector)
        
        # استرجاع أولي لعدد أكبر من النتائج للـ reranking
        initial_top_k = top_k * 3
        distances, indices = self.index.search(np.array(query_vector).astype('float32'), initial_top_k)
        
        candidate_chunks = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.chunks):
                candidate_chunks.append(self.chunks[idx])
        
        if not candidate_chunks:
            return []

        # Reranking باستخدام CrossEncoder
        pairs = [[cleaned_query, chunk] for chunk in candidate_chunks]
        scores = self.reranker.predict(pairs)
        
        # ترتيب النتائج بناءً على درجات الـ reranker
        ranked_results = [chunk for _, chunk in sorted(zip(scores, candidate_chunks), reverse=True)]
        return ranked_results[:top_k]

rag_service = RAGService()

@app.post("/search")
async def search(request: SearchRequest):
    try:
        results = rag_service.search(request.query, request.top_k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(rag_service.knowledge_base_path, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    rag_service.build_index()
    return {"status": f"File {file.filename} uploaded and index rebuilt"}

@app.post("/reload")
async def reload():
    """إعادة بناء الفهرس عند إضافة ملفات جديدة"""
    rag_service.build_index()
    return {"status": "Index rebuilt successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
