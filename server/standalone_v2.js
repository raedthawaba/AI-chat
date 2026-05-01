import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-pro-secret-key-2024';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

// --- نظام تخزين بيانات بسيط في الذاكرة (بدون SQLite) ---
const DATA_FILE = path.join(process.cwd(), 'data.json');
let db = {
  users: [],
  messages: [],
  credits: {}
};

// تحميل البيانات إذا كانت موجودة
if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading data file, starting fresh");
  }
}

// حفظ البيانات دورياً
const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Error saving data");
  }
};

// --- إعداد AI ---
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// --- المسارات (Routes) ---

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), email, password: hashedPassword, name };
  db.users.push(newUser);
  saveData();
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
  res.json({ token, user: { id: newUser.id, email, name } });
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email, name: user.name } });
});

// إرسال رسالة للـ AI
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const userId = decoded.id;

    // فحص الرصيد (بسيط)
    const today = new Date().toISOString().split('T')[0];
    const userCreditKey = `${userId}:${today}`;
    db.credits[userCreditKey] = (db.credits[userCreditKey] || 0) + 1;
    
    if (db.credits[userCreditKey] > 50) {
      return res.status(403).json({ message: 'Daily limit reached (50 messages)' });
    }

    if (!genAI) return res.status(500).json({ message: 'AI Key not configured' });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const chat = model.startChat({
      history: history.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // حفظ الرسالة
    db.messages.push({ userId, role: 'user', content: message, timestamp: new Date() });
    db.messages.push({ userId, role: 'assistant', content: text, timestamp: new Date() });
    saveData();

    res.json({ content: text });
  } catch (error) {
    console.error('--- Gemini API V2 Error Details ---');
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Data:', JSON.stringify(error.response, null, 2));
    }
    res.status(500).json({ 
      message: error.message,
      details: 'Check server logs for more info'
    });
  }
});

// تقديم ملفات الفرونت إند
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
