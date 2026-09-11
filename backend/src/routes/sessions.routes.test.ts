import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../app.js";
import { SessionService } from "../services/session.service.js";
import { createSessionsRouter } from "./sessions.routes.js";

describe("Sessions Routes Integration (/sessions)", () => {
  const fakeSession = {
    id: "sess-123",
    title: "Test Session",
    turnCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const fakeDetail = {
    ...fakeSession,
    turns: [
      {
        id: "turn-1",
        sessionId: "sess-123",
        question: "What is vector search?",
        answer: "Vector search finds semantic neighbors.",
        sources: null,
        iterations: 1,
        isFallback: false,
        promptTokens: 10,
        completionTokens: 8,
        totalTokens: 18,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const mockSessionService = {
    async listSessions() {
      return [fakeSession];
    },
    async createSession(title?: string) {
      return {
        ...fakeSession,
        title: title ?? "New Conversation",
        turnCount: 0,
      };
    },
    async getSessionById(id: string) {
      if (id === "sess-123") return fakeDetail;
      return null;
    },
    async updateSessionTitle(id: string, title: string) {
      return {
        ...fakeSession,
        id,
        title,
      };
    },
    async deleteSession(_id: string) {
      return;
    },
  } as unknown as SessionService;

  const app = createApp({
    sessionsRouter: createSessionsRouter(mockSessionService),
  });

  it("GET /sessions returns session list", async () => {
    const res = await request(app).get("/sessions");
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.body.sessions), true);
    assert.equal(res.body.sessions.length, 1);
    assert.equal(res.body.sessions[0].id, "sess-123");
  });

  it("POST /sessions creates new session", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ title: "Custom Title" });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Custom Title");
  });

  it("GET /sessions/:id returns detail with turns", async () => {
    const res = await request(app).get("/sessions/sess-123");
    assert.equal(res.status, 200);
    assert.equal(res.body.id, "sess-123");
    assert.equal(res.body.turns.length, 1);
    assert.equal(res.body.turns[0].promptTokens, 10);
    assert.equal(res.body.turns[0].completionTokens, 8);
  });

  it("GET /sessions/:id returns 404 if not found", async () => {
    const res = await request(app).get("/sessions/sess-999");
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });

  it("PATCH /sessions/:id updates title", async () => {
    const res = await request(app)
      .patch("/sessions/sess-123")
      .send({ title: "Updated" });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, "Updated");
  });

  it("DELETE /sessions/:id deletes session", async () => {
    const res = await request(app).delete("/sessions/sess-123");
    assert.equal(res.status, 204);
  });
});
