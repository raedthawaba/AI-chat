import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// Middleware للتحقق من الرصيد (Credits)
const checkCredits = (req: any, res: any, next: any) => {
  const user = db.prepare('SELECT credits, last_credit_reset FROM users WHERE id = ?').get(req.user.id) as any;
  
  // إعادة تعيين الرصيد يومياً (بسيط)
  const now = new Date();
  const lastReset = new Date(user.last_credit_reset);
  if (now.getDate() !== lastReset.getDate()) {
    db.prepare('UPDATE users SET credits = 50, last_credit_reset = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);
    user.credits = 50;
  }

  if (user.credits <= 0) {
    return res.status(403).json({ error: 'لقد نفذ رصيدك اليومي. يرجى المحاولة غداً.' });
  }
  next();
};

// جلب جميع محادثات المستخدم
router.get('/conversations', (req: any, res) => {
  try {
    const userId = req.user.id;
    const conversations = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC').all(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المحادثات' });
  }
});

// جلب رسائل محادثة معينة
router.get('/conversations/:id/messages', (req: any, res) => {
  try {
    const conversationId = req.params.id;
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId);
    res.json(messages.map((m: any) => ({
      ...m,
      attachments: m.attachments ? JSON.parse(m.attachments) : []
    })));
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب الرسائل' });
  }
});

// إنشاء محادثة جديدة
router.post('/conversations', (req: any, res) => {
  const { title, systemPrompt } = req.body;
  const userId = req.user.id;
  const id = uuidv4();
  
  try {
    db.prepare('INSERT INTO conversations (id, user_id, title, system_prompt) VALUES (?, ?, ?, ?)')
      .run(id, userId, title || 'محادثة جديدة', systemPrompt || '');
    res.status(201).json({ id, title, systemPrompt });
  } catch (error) {
    res.status(500).json({ error: 'فشل في إنشاء المحادثة' });
  }
});

// تحديث محادثة (تثبيت أو تغيير عنوان)
router.patch('/conversations/:id', (req: any, res) => {
  const { title, isPinned } = req.body;
  const id = req.params.id;
  
  try {
    if (title !== undefined) {
      db.prepare('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, id);
    }
    if (isPinned !== undefined) {
      db.prepare('UPDATE conversations SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(isPinned ? 1 : 0, id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل في تحديث المحادثة' });
  }
});

// حذف محادثة
router.delete('/conversations/:id', (req: any, res) => {
  try {
    db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف المحادثة' });
  }
});

export { checkCredits };
export default router;
