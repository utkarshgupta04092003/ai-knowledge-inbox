import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { createQueryRouter } from "./query.routes.js";
import { RagService, RagResponse } from "../services/rag.service.js";

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
              snippet: "Retrieval-Augmented Generation combines retrieval and LLMs.",
            },
          ],
          iterations: 1,
          reformulatedQueries: [],
        };
      }

      return {
        answer: "No data related to this query is available in your saved knowledge.",
        sources: [],
        iterations: 1,
        reformulatedQueries: [],
      };
    },
  } as unknown as RagService;

  const app = createApp({
    queryRouter: createQueryRouter(mockRagService),
  });

  it("answers questions with grounded response and source citations", async () => {
    const res = await request(app).post("/query").send({ question: "What is RAG?" });

    assert.equal(res.status, 200);
    assert.equal(res.body.answer, "RAG stands for Retrieval-Augmented Generation [Source 1].");
    assert.equal(res.body.sources.length, 1);
    assert.equal(res.body.sources[0].title, "RAG Docs");
    assert.equal(res.body.sources[0].url, "https://example.com/rag");
  });

  it("returns fallback disclaimer when no matching context is found", async () => {
    const res = await request(app).post("/query").send({ question: "Tell me about quantum gravity." });

    assert.equal(res.status, 200);
    assert.ok(/saved knowledge|no data|couldn't find|no information/i.test(res.body.answer));
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
    const res = await request(app).post("/query").send({ question: hugeQuestion });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_INPUT");
  });
});
