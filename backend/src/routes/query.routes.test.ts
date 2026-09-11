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
    async answerQuestionStream(
      question: string,
      callbacks?: {
        onStatus?: (status: { stage: string; message: string; iteration?: number }) => void;
        onSources?: (sources: unknown[]) => void;
        onToken?: (token: string) => void;
      },
    ): Promise<RagResponse> {
      callbacks?.onStatus?.({ stage: "searching", message: "Searching...", iteration: 1 });
      if (question.includes("RAG")) {
        const sources = [
          {
            itemId: "item-123",
            title: "RAG Docs",
            url: "https://example.com/rag",
            snippet: "Retrieval-Augmented Generation combines retrieval and LLMs.",
          },
        ];
        callbacks?.onSources?.(sources);
        callbacks?.onToken?.("RAG stands for ");
        callbacks?.onToken?.("Retrieval-Augmented Generation [Source 1].");
        return {
          answer: "RAG stands for Retrieval-Augmented Generation [Source 1].",
          sources,
          iterations: 1,
          reformulatedQueries: [],
        };
      }
      callbacks?.onToken?.("No data related to this query is available.");
      return {
        answer: "No data related to this query is available in your saved knowledge.",
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
    async getLastTurns(_sessionId: string, _limit = 5) {
      return [];
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

  it("streams response via Server-Sent Events when stream: true", async () => {
    const res = await request(app)
      .post("/query")
      .send({ question: "What is RAG?", stream: true });

    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

    const text = res.text;
    assert.ok(text.includes("event: session"));
    assert.ok(text.includes("event: status"));
    assert.ok(text.includes("event: sources"));
    assert.ok(text.includes("event: delta"));
    assert.ok(text.includes("event: done"));
    assert.ok(text.includes("RAG stands for"));
  });

  it("retrieves last turns and passes session memory to RAG pipeline", async () => {
    let capturedHistory: unknown = null;
    const customRag = {
      async answerQuestion(_question: string, history?: unknown) {
        capturedHistory = history;
        return {
          answer: "Response with memory.",
          sources: [],
          iterations: 1,
          reformulatedQueries: [],
        };
      },
    } as unknown as RagService;

    const customSession = {
      async getSessionById(id: string) {
        return { id, title: "Test", turns: [] };
      },
      async getLastTurns(_sessionId: string, _limit = 5) {
        return [
          {
            id: "turn-0",
            sessionId: "existing-sess",
            question: "Previous question",
            answer: "Previous answer",
            sources: null,
            iterations: 1,
            isFallback: false,
            promptTokens: 5,
            completionTokens: 5,
            totalTokens: 10,
            createdAt: new Date().toISOString(),
          },
        ];
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

    const testApp = createApp({
      queryRouter: createQueryRouter(customRag, customSession),
    });

    const res = await request(testApp)
      .post("/query")
      .send({ question: "Follow-up question", sessionId: "existing-sess" });

    assert.equal(res.status, 200);
    assert.deepEqual(capturedHistory, [
      { question: "Previous question", answer: "Previous answer" },
    ]);
    assert.ok(res.body.promptTokens > 5);
  });
});
