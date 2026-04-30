import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحديد مسار قاعدة البيانات
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data.db');

// التأكد من وجود المجلد إذا كان المسار مخصصاً
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database;

export async function initDB() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // إنشاء الجداول إذا لم تكن موجودة
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      provider TEXT DEFAULT 'local',
      provider_id TEXT,
      credits INTEGER DEFAULT 50,
      last_credit_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'محادثة جديدة',
      system_prompt TEXT DEFAULT 'أنت مساعد ذكي ومفيد.',
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  return db;
}

export { db };
export default {
  get db() { return db; },
  initDB
};
