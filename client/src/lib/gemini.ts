import { Content } from '@google/generative-ai';
import { Attachment } from '@/stores/useChatStore';

/**
 * دالة لإرسال رسالة في جلسة محادثة قائمة (Streaming) عبر الـ Backend Proxy
 * تم نقل مفتاح API إلى السيرفر لحمايته (المرحلة 8 - النقطة 1)
 */
export async function* streamChat(
  message: string,
  conversationId: string,
  attachments?: Attachment[]
): AsyncGenerator<string> {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        conversationId,
        attachments: (attachments || []).map(att => ({
          mimeType: att.mimeType,
          base64: att.base64
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'فشل في الاتصال بالسيرفر');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('فشل في بدء قراءة الرد');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        yield chunk;
      }
    }
  } catch (error) {
    console.error('Error streaming from Proxy API:', error);
    throw new Error('فشل في الاتصال بـ AI Proxy');
  }
}

/**
 * دالة لبدء جلسة محادثة (أصبحت الآن مجرد دالة مساعدة لأن الحالة تدار في السيرفر أو عبر التاريخ)
 */
export function startChatSession(history: Content[] = [], systemInstruction?: string) {
  // في نظام الـ Proxy، نرسل التاريخ مع كل طلب، لذا لا نحتاج لجلسة محلية
  return { history, systemInstruction };
}

// الدوال القديمة للتوافق (Legacy Support) - تم تحديثها لتعمل عبر الـ Proxy إذا لزم الأمر
export async function sendMessageToGemini(message: string): Promise<string> {
  let fullText = '';
  const generator = streamChat(null, message);
  for await (const chunk of generator) {
    fullText += chunk;
  }
  return fullText;
}
