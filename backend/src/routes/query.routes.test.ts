import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../app.js";
import { RagService } from "../services/rag.service.js";
import { SessionService } from "../services/session.service.js";
import type { CreateTurnInput, RagResponse } from "../types/index.js";
import { createQueryRouter } from "./query.routes.js";

describe("Query Routes Integration (POST /query)", () => {
  const mockRagService = {
    async answerQuestion(question: string): Promise<RagResponse> {
      if (question.includes("RAG")) {
        return {
          answer: "RAG stands for Retrieval-Augmented Generation [Source 1].",
          sources: [
            {
              itemId: "item-123",
              title: "RAG Docs",
              url: "https://example.com/rag",
              snippet:
                "Retrieval-Augmented Generation combines retrieval and LLMs.",
            },
          ],
          iterations: 1,
          reformulatedQueries: [],
        };
      }

      return {
        answer:
          "No data related to this query is available in your saved knowledge.",
        sources: [],
        iterations: 1,
        reformulatedQueries: [],
      };
    },
  } as unknown as RagService;

  const mockSessionService = {
    async getSessionById(_id: string) {
      return null;
    },
    async createSession(title?: string) {
      return {
        id: "sess-auto-1",
        title: title ?? "New Conversation",
        turnCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    async updateSessionTitle(_sessionId: string, _title: string) {
      return;
    },
    async addTurn(sessionId: string, data: CreateTurnInput) {
      return {
        id: "turn-1",
        sessionId,
        ...data,
        createdAt: new Date().toISOString(),
      };
    },
  } as unknown as SessionService;

  const app = createApp({
    queryRouter: createQueryRouter(mockRagService, mockSessionService),
  });

  it("answers questions with grounded response, source citations, and token metrics", async () => {
    const res = await request(app)
      .post("/query")
      .send({ question: "What is RAG?" });

    assert.equal(res.status, 200);
    assert.equal(
      res.body.answer,
      "RAG stands for Retrieval-Augmented Generation [Source 1].",
    );
    assert.equal(res.body.sources.length, 1);
    assert.equal(res.body.sources[0].title, "RAG Docs");
    assert.equal(res.body.sources[0].url, "https://example.com/rag");
    assert.equal(res.body.sessionId, "sess-auto-1");
    assert.ok(typeof res.body.promptTokens === "number");
    assert.ok(typeof res.body.completionTokens === "number");
    assert.ok(typeof res.body.totalTokens === "number");
  });

  it("returns fallback disclaimer when no matching context is found", async () => {
    const res = await request(app)
      .post("/query")
      .send({ question: "Tell me about quantum gravity." });

    assert.equal(res.status, 200);
    assert.ok(
      /saved knowledge|no data|couldn't find|no information/i.test(
        res.body.answer,
      ),
    );
    assert.deepEqual(res.body.sources, []);
  });

  it("rejects empty question with 400 INVALID_INPUT", async () => {
    const res = await request(app).post("/query").send({ question: "   " });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_INPUT");
  });

  it("rejects non-string question with 400 INVALID_INPUT", async () => {
    const res = await request(app).post("/query").send({ question: 12345 });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_INPUT");
  });

  it("rejects excessively long question with 400 INVALID_INPUT", async () => {
    const hugeQuestion = "q".repeat(1001);
    const res = await request(app)
      .post("/query")
      .send({ question: hugeQuestion });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_INPUT");
  });
});
