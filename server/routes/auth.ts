import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { generateToken, passport } from '../lib/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// تسجيل حساب جديد
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    await db.run('INSERT INTO users (id, email, password, provider) VALUES (?, ?, ?, ?)',
      id, email, hashedPassword, 'local');

    const token = generateToken({ id, email });
    res.status(201).json({ token, user: { id, email } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// تسجيل الدخول العادي
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ? AND provider = ?', email, 'local') as any;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// مسارات Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: any, res) => {
    const token = generateToken(req.user);
    res.redirect(`/auth/success?token=${token}`);
  }
);

// الحصول على بيانات المستخدم الحالي
router.get('/me', (req: any, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'manus_secret_key_2026');
    res.json({ user: decoded });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
