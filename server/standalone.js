import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'manus_secret_key_2026';
const API_KEY = process.env.GEMINI_API_KEY;

// ذاكرة مؤقتة (بديلة لقاعدة البيانات لضمان العمل على Railway)
const users = [];
const conversations = [];
const messages = [];

app.use(cors());
app.use(express.json());
const staticPath = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : path.join(__dirname, '../dist/public');
app.use(express.static(staticPath));

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), email, password: hashedPassword, credits: 50 };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email } });
});

// --- Chat Routes ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).send('Unauthorized'); }
};

app.get('/api/chat/conversations', authenticate, (req, res) => {
  res.json(conversations.filter(c => c.user_id === req.user.id));
});

app.post('/api/chat/conversations', authenticate, (req, res) => {
  const conv = { id: uuidv4(), user_id: req.user.id, title: req.body.title || 'New Chat', updated_at: new Date() };
  conversations.push(conv);
  res.status(201).json(conv);
});

app.get('/api/chat/conversations/:id/messages', authenticate, (req, res) => {
  res.json(messages.filter(m => m.conversation_id === req.params.id));
});

// --- AI Stream ---
const genAI = new GoogleGenerativeAI(API_KEY);
app.post('/api/chat/stream', authenticate, async (req, res) => {
  const { message, conversationId } = req.body;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessageStream(message);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      res.write(text);
    }

    messages.push({ id: uuidv4(), conversation_id: conversationId, role: 'user', content: message });
    messages.push({ id: uuidv4(), conversation_id: conversationId, role: 'assistant', content: fullText });
    
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
