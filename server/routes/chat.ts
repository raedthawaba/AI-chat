import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

const router = Router();

// Middleware للتحقق من الرصيد (Credits)
const checkCredits = async (req: any, res: any, next: any) => {
  try {
    const user = await db.get('SELECT credits, last_credit_reset FROM users WHERE id = ?', req.user.id) as any;
    
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    // إعادة تعيين الرصيد يومياً (بسيط)
    const now = new Date();
    const lastReset = new Date(user.last_credit_reset);
    if (now.getDate() !== lastReset.getDate()) {
      await db.run('UPDATE users SET credits = 50, last_credit_reset = CURRENT_TIMESTAMP WHERE id = ?', req.user.id);
      user.credits = 50;
    }

    if (user.credits <= 0) {
      return res.status(403).json({ error: 'لقد نفذ رصيدك اليومي. يرجى المحاولة غداً.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'خطأ في التحقق من الرصيد' });
  }
};

// جلب جميع محادثات المستخدم
router.get('/conversations', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const conversations = await db.all('SELECT * FROM conversations WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC', userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المحادثات' });
  }
});

// جلب رسائل محادثة معينة
router.get('/conversations/:id/messages', async (req: any, res) => {
  try {
    const conversationId = req.params.id;
    const messages = await db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', conversationId);
    res.json(messages.map((m: any) => ({
      ...m,
      attachments: m.attachments ? JSON.parse(m.attachments) : []
    })));
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب الرسائل' });
  }
});

// إنشاء محادثة جديدة
router.post('/conversations', async (req: any, res) => {
  const { title, systemPrompt } = req.body;
  const userId = req.user.id;
  const id = uuidv4();
  
  try {
    await db.run('INSERT INTO conversations (id, user_id, title, system_prompt) VALUES (?, ?, ?, ?)',
      id, userId, title || 'محادثة جديدة', systemPrompt || '');
    res.status(201).json({ id, title, systemPrompt });
  } catch (error) {
    res.status(500).json({ error: 'فشل في إنشاء المحادثة' });
  }
});

// تحديث محادثة (تثبيت أو تغيير عنوان)
router.patch('/conversations/:id', async (req: any, res) => {
  const { title, isPinned } = req.body;
  const id = req.params.id;
  
  try {
    if (title !== undefined) {
      await db.run('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', title, id);
    }
    if (isPinned !== undefined) {
      await db.run('UPDATE conversations SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', isPinned ? 1 : 0, id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل في تحديث المحادثة' });
  }
});

// حذف محادثة
router.delete('/conversations/:id', async (req: any, res) => {
  try {
    await db.run('DELETE FROM conversations WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف المحادثة' });
  }
});

export { checkCredits };
export default router;
