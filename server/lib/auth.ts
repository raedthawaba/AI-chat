import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// إعداد Google Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${API_BASE_URL}/api/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;
      if (!email) return done(new Error('No email found in Google profile'));

      // البحث عن المستخدم أو إنشاؤه
      let user = db.prepare('SELECT * FROM users WHERE provider_id = ? OR email = ?').get(profile.id, email) as any;

      if (!user) {
        const id = uuidv4();
        db.prepare('INSERT INTO users (id, email, provider, provider_id) VALUES (?, ?, ?, ?)')
          .run(id, email, 'google', profile.id);
        user = { id, email, provider: 'google', provider_id: profile.id };
      } else if (user.provider !== 'google') {
        // تحديث المستخدم المحلي ليدعم Google إذا كان نفس الإيميل
        db.prepare('UPDATE users SET provider_id = ?, provider = ? WHERE id = ?')
          .run(profile.id, 'google', user.id);
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// دوال مساعدة للـ JWT
export const generateToken = (user: any) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

// Middleware لحماية المسارات
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(403).json({ error: 'Invalid or expired token.' });

  req.user = decoded;
  next();
};

export { passport };
