import gradio as gr
import requests
import json
import os

# إعدادات الـ API
API_URL = "http://localhost:8001/generate"
RAG_API_URL = "http://localhost:8002/query" # سنقوم بإنشائه لاحقاً

def generate_text(prompt, max_tokens, temp, top_k, top_p, use_beam, num_beams, mode):
    if mode == "النموذج فقط":
        payload = {
            "text": prompt,
            "max_new_tokens": max_tokens,
            "temperature": temp,
            "top_k": top_k,
            "top_p": top_p,
            "use_beam_search": use_beam,
            "num_beams": num_beams,
            "stream": False
        }
        try:
            response = requests.post(API_URL, json=payload)
            if response.status_code == 200:
                return response.json()["response"]
            else:
                return f"خطأ من الـ API: {response.text}"
        except Exception as e:
            return f"فشل الاتصال بالـ API: {str(e)}"
    else:
        # وضع RAG (سيتم ربطه لاحقاً)
        return "وضع RAG قيد التطوير في هذه المرحلة..."

with gr.Blocks(title="محرك الذكاء الاصطناعي العربي") as demo:
    gr.Markdown("# 🇸🇦 محرك الذكاء الاصطناعي العربي - المرحلة الثانية")
    
    with gr.Row():
        with gr.Column(scale=4):
            chatbot = gr.Textbox(label="أدخل سؤالك أو النص هنا...", lines=5)
            output = gr.Textbox(label="الاستجابة", lines=10)
            submit_btn = gr.Button("توليد", variant="primary")
            
        with gr.Column(scale=1):
            mode = gr.Radio(["النموذج فقط", "RAG"], label="وضع التشغيل", value="النموذج فقط")
            max_tokens = gr.Slider(10, 500, value=200, step=10, label="أقصى عدد للكلمات")
            temp = gr.Slider(0.1, 2.0, value=0.7, step=0.1, label="درجة الحرارة (Temperature)")
            top_k = gr.Slider(1, 100, value=50, step=1, label="Top-K")
            top_p = gr.Slider(0.1, 1.0, value=0.9, step=0.05, label="Top-P")
            use_beam = gr.Checkbox(label="استخدام Beam Search", value=False)
            num_beams = gr.Slider(1, 10, value=5, step=1, label="عدد الـ Beams")

    submit_btn.click(
        generate_text, 
        inputs=[chatbot, max_tokens, temp, top_k, top_p, use_beam, num_beams, mode],
        outputs=output
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
