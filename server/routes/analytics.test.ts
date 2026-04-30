/**
 * اختبارات API للتحليلات (POST /api/analytics + GET /api/analytics/summary)
 */
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createAnalyticsRouter } from "./analytics.js";
import { requestLogger } from "../middleware/requestLogger.js";
import { _resetForTests } from "../lib/analytics.js";

function buildApp() {
  const app = express();
  app.use(requestLogger());
  app.use(express.json());
  app.use("/api/analytics", createAnalyticsRouter());
  return app;
}

describe("POST /api/analytics", () => {
  let app: express.Express;

  beforeEach(() => {
    _resetForTests();
    app = buildApp();
  });

  it("accepts a single event", async () => {
    const res = await request(app)
      .post("/api/analytics")
      .send({ name: "feature_used", props: { feature: "copy" } });
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(1);
  });

  it("accepts a batch of events", async () => {
    const events = [
      { name: "page_view", props: { path: "/" } },
      { name: "chat_sent", props: { messageLen: 12 } },
    ];
    const res = await request(app).post("/api/analytics").send({ events });
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(2);
  });

  it("rejects empty body", async () => {
    const res = await request(app).post("/api/analytics").send({});
    expect(res.status).toBe(400);
  });

  it("rejects oversized batch", async () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      name: `evt_${i}`,
    }));
    const res = await request(app).post("/api/analytics").send({ events });
    expect(res.status).toBe(413);
  });
});

describe("GET /api/analytics/summary", () => {
  let app: express.Express;

  beforeEach(() => {
    _resetForTests();
    app = buildApp();
  });

  it("returns zeroed summary on a fresh server", async () => {
    const res = await request(app).get("/api/analytics/summary");
    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBe(0);
    expect(res.body.latency.chatStream.avgMs).toBe(0);
    expect(res.body.latency.chatStream.minMs).toBe(0);
  });

  it("reflects events sent through the API", async () => {
    await request(app)
      .post("/api/analytics")
      .send({
        events: [
          { name: "chat_received", props: { durationMs: 100 } },
          { name: "chat_received", props: { durationMs: 300 } },
        ],
      });
    const res = await request(app).get("/api/analytics/summary");
    expect(res.body.totalEvents).toBe(2);
    expect(res.body.latency.chatStream.count).toBe(2);
    expect(res.body.latency.chatStream.avgMs).toBe(200);
    expect(res.body.bySource.client).toBe(2);
  });
});
