/**
 * اختبارات API لاستقبال سجلات العميل (POST /api/logs)
 */
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createLogsRouter } from "./logs.js";
import { requestLogger } from "../middleware/requestLogger.js";

function buildApp() {
  const app = express();
  app.use(requestLogger());
  app.use(express.json());
  app.use("/api/logs", createLogsRouter());
  return app;
}

describe("POST /api/logs", () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildApp();
  });

  it("accepts a single log entry", async () => {
    const res = await request(app)
      .post("/api/logs")
      .send({ level: "info", message: "client booted" });
    expect(res.status).toBe(204);
  });

  it("accepts a batch of entries", async () => {
    const entries = [
      { level: "warn", message: "slow render" },
      { level: "error", message: "fetch failed" },
    ];
    const res = await request(app).post("/api/logs").send({ entries });
    expect(res.status).toBe(204);
  });

  it("rejects empty body", async () => {
    const res = await request(app).post("/api/logs").send({});
    expect(res.status).toBe(400);
  });

  it("rejects oversized batch", async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      level: "info" as const,
      message: `e${i}`,
    }));
    const res = await request(app).post("/api/logs").send({ entries });
    expect(res.status).toBe(413);
  });

  it("returns an X-Request-Id header", async () => {
    const res = await request(app)
      .post("/api/logs")
      .send({ level: "info", message: "ping" });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("echoes a client-supplied request id", async () => {
    const res = await request(app)
      .post("/api/logs")
      .set("x-request-id", "client-abc-1")
      .send({ level: "info", message: "ping" });
    expect(res.headers["x-request-id"]).toBe("client-abc-1");
  });
});
