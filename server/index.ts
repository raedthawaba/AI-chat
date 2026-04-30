import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { rateLimit } from 'express-rate-limit';
import { logger } from "./lib/logger.js";
import { track, trackTiming } from "./lib/analytics.js";
import { requestLogger, errorLogger } from "./middleware/requestLogger.js";
import { createLogsRouter } from "./routes/logs.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import chatRouter, { checkCredits } from "./routes/chat.js";
import { authenticateToken, passport } from "./lib/auth.js";
import { v4 as uuidv4 } from 'uuid';
import db from './db/database.js';

// تحميل متغيرات البيئة
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  logger.error("CRITICAL: GEMINI_API_KEY is not defined in environment variables");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware: تسجيل الطلبات أولاً (قبل أي شيء آخر)
  app.use(requestLogger());

  // Middleware: parsing
  app.use(express.json({ limit: '50mb' })); // دعم الملفات الكبيرة (Base64)

  // Rate Limiting - حماية السيرفر من الاستخدام المفرط (إعدادات من متغيرات البيئة)
  const windowMins = parseInt(process.env.RATE_LIMIT_WINDOW_MINS || "15");
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || "100");

  const apiLimiter = rateLimit({
    windowMs: windowMins * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.id || req.ip, // تحديد الحد لكل مستخدم
    message: {
      error: `لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة مرة أخرى بعد ${windowMins} دقيقة.`
    }
  });

  // تطبيق الـ Limiter على مسارات الـ API فقط
  app.use("/api/", apiLimiter);

  // إعداد Passport
  app.use(passport.initialize());

  // مسارات المصادقة
  app.use("/api/auth", authRouter);

  // مسارات المحادثات
  app.use("/api/chat", authenticateToken, chatRouter);

  // نقطة استقبال سجلات العميل (Client-side logs)
  app.use("/api/logs", authenticateToken, createLogsRouter());

  // نقطة استقبال أحداث التحليلات (Analytics)
  app.use("/api/analytics", authenticateToken, createAnalyticsRouter());

  // API Proxy Route for Gemini Streaming with Memory & Database
  app.post("/api/chat/stream", authenticateToken, checkCredits, async (req: any, res) => {
    const { message, conversationId, attachments } = req.body;
    const userId = req.user.id;

    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      // 1. جلب المحادثة والذاكرة (آخر 10 رسائل)
      const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, userId) as any;
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      const dbMessages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10').all(conversationId) as any[];
      const history = dbMessages.reverse().map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // 2. حفظ رسالة المستخدم في قاعدة البيانات
      const userMsgId = uuidv4();
      db.prepare('INSERT INTO messages (id, conversation_id, role, content, attachments) VALUES (?, ?, ?, ?, ?)')
        .run(userMsgId, conversationId, 'user', message, JSON.stringify(attachments || []));

      // 3. إعداد نموذج Gemini
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: conversation.system_prompt || "أنت مساعد ذكي ومفيد.",
      });

      const chat = model.startChat({ history });
      const parts = [
        { text: message },
        ...(attachments || []).map((att: any) => ({
          inlineData: { mimeType: att.mimeType, data: att.base64 }
        }))
      ];

      const result = await chat.sendMessageStream(parts);

      // 4. إعداد الـ Streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          res.write(chunkText);
        }
      }

      // 5. حفظ رد الـ AI وخصم الرصيد وتحديث وقت المحادثة
      const aiMsgId = uuidv4();
      db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        .run(aiMsgId, conversationId, 'assistant', fullResponse);
      
      db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(userId);
      db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conversationId);
      
      // تسجيل الاستخدام
      db.prepare('INSERT INTO usage_logs (user_id, action, metadata) VALUES (?, ?, ?)')
        .run(userId, 'chat_sent', JSON.stringify({ conversationId, responseLen: fullResponse.length }));

      res.end();
    } catch (error: any) {
      logger.error("chat/stream error", error);
      res.status(500).json({ error: "حدث خطأ في معالجة طلبك", details: error.message });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Middleware: تسجيل الأخطاء غير المعالجة (يجب أن يكون آخر middleware)
  app.use(errorLogger());

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    logger.info("server started", {
      port,
      env: process.env.NODE_ENV ?? "development",
      rateLimit: { windowMins, maxRequests },
    });
    logger.info("Gemini Proxy API available at /api/chat/stream");
  });
}

startServer().catch((err) => {
  logger.error("failed to start server", err);
  process.exit(1);
});
