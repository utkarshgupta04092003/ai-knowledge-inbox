import { describe, it } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { EmbeddingService } from "./embedding.service.js";
import { AppError } from "../middleware/error.middleware.js";

describe("EmbeddingService", () => {
  it("returns empty array for empty texts input without calling client", async () => {
    let called = false;
    const mockClient = {
      embeddings: {
        async create() {
          called = true;
          return { data: [] };
        },
      },
    } as unknown as OpenAI;

    const service = new EmbeddingService(mockClient);
    const result = await service.embedChunks([]);

    assert.deepEqual(result, []);
    assert.equal(called, false);
  });

  it("embeds texts using configured model and preserves order", async () => {
    let capturedModel = "";
    let capturedInput: string[] = [];

    const mockClient = {
      embeddings: {
        async create(params: { model: string; input: string[] }) {
          capturedModel = params.model;
          capturedInput = params.input;
          return {
            data: [
              { index: 1, embedding: [0.3, 0.4] },
              { index: 0, embedding: [0.1, 0.2] },
            ],
          };
        },
      },
    } as unknown as OpenAI;

    const service = new EmbeddingService(mockClient, "custom-embedding-model");
    const result = await service.embedChunks(["text-a", "text-b"]);

    assert.equal(capturedModel, "custom-embedding-model");
    assert.deepEqual(capturedInput, ["text-a", "text-b"]);
    assert.deepEqual(result, [
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it("embedQuery rejects empty query with 400 AppError", async () => {
    const service = new EmbeddingService({} as OpenAI);
    await assert.rejects(
      async () => service.embedQuery("   \n   "),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_INPUT");
        return true;
      }
    );
  });

  it("embedQuery delegates to embedChunks and returns vector", async () => {
    const mockClient = {
      embeddings: {
        async create() {
          return {
            data: [{ index: 0, embedding: [0.5, 0.6, 0.7] }],
          };
        },
      },
    } as unknown as OpenAI;

    const service = new EmbeddingService(mockClient);
    const vector = await service.embedQuery("test query");
    assert.deepEqual(vector, [0.5, 0.6, 0.7]);
  });

  it("wraps client errors into 502 UPSTREAM_ERROR AppError", async () => {
    const mockClient = {
      embeddings: {
        async create() {
          throw new Error("Rate limit exceeded");
        },
      },
    } as unknown as OpenAI;

    const service = new EmbeddingService(mockClient);
    await assert.rejects(
      async () => service.embedChunks(["hello"]),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 502);
        assert.equal(err.code, "UPSTREAM_ERROR");
        assert.match(err.message, /Rate limit exceeded/);
        return true;
      }
    );
  });
});
