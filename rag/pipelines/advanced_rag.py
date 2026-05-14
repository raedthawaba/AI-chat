import os
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
from ...scripts.maintenance.utils import clean_arabic_text, split_text_into_chunks

class AdvancedRAG:
    def __init__(self, knowledge_base_path, index_path):
        self.knowledge_base_path = knowledge_base_path
        self.index_path = index_path
        self.embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        self.chunks = []
        self.index = None
        self.bm25 = None
        
        if os.path.exists(index_path):
            self.load_index()
        else:
            self.build_index()

    def build_index(self):
        print("Building advanced hybrid index...")
        all_chunks = []
        for root, _, files in os.walk(self.knowledge_base_path):
            for file in files:
                if file.endswith(('.txt', '.pdf')):
                    path = os.path.join(root, file)
                    # استخراج النص (تبسيط هنا للـ txt)
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    chunks = split_text_into_chunks(clean_arabic_text(content))
                    all_chunks.extend(chunks)
        
        self.chunks = all_chunks
        
        # 1. Vector Index (FAISS)
        embeddings = self.embedder.encode(self.chunks)
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)
        faiss.normalize_L2(embeddings)
        self.index.add(np.array(embeddings).astype('float32'))
        
        # 2. Keyword Index (BM25)
        tokenized_corpus = [chunk.split() for chunk in self.chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
        
        self.save_index()

    def save_index(self):
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.index, self.index_path + ".faiss")
        with open(self.index_path + ".pkl", 'wb') as f:
            pickle.dump({"chunks": self.chunks, "bm25": self.bm25}, f)
        print("Index saved successfully.")

    def load_index(self):
        self.index = faiss.read_index(self.index_path + ".faiss")
        with open(self.index_path + ".pkl", 'rb') as f:
            data = pickle.load(f)
            self.chunks = data['chunks']
            self.bm25 = data['bm25']
        print("Index loaded successfully.")

    def search(self, query, top_k=5):
        cleaned_query = clean_arabic_text(query)
        
        # 1. BM25 Search
        tokenized_query = cleaned_query.split()
        bm25_scores = self.bm25.get_scores(tokenized_query)
        
        # 2. Vector Search
        query_vec = self.embedder.encode([cleaned_query])
        faiss.normalize_L2(query_vec)
        distances, indices = self.index.search(np.array(query_vec).astype('float32'), top_k * 2)
        
        # Combine results (Reciprocal Rank Fusion or simple weighted sum)
        # Here we use Reranking for final selection
        candidate_indices = list(set(indices[0]) | set(np.argsort(bm25_scores)[-top_k*2:]))
        candidates = [self.chunks[i] for i in candidate_indices if i != -1 and i < len(self.chunks)]
        
        if not candidates:
            return []

        # 3. Reranking
        pairs = [[cleaned_query, c] for c in candidates]
        scores = self.reranker.predict(pairs)
        ranked = [c for _, c in sorted(zip(scores, candidates), reverse=True)]
        
        return ranked[:top_k]

if __name__ == "__main__":
    # تجربة سريعة
    rag = AdvancedRAG(
        knowledge_base_path="/home/ubuntu/arabic_ai_engine/datasets/raw",
        index_path="/home/ubuntu/arabic_ai_engine/rag/index/advanced_index"
    )
    results = rag.search("ما هي عاصمة السعودية؟")
    print(results)
