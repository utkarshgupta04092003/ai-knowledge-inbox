import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IEmbeddingService } from "./embedding.service.js";
import { IPineconeService, PineconeMatch } from "./pinecone.service.js";
import { SearchService } from "./search.service.js";

describe("SearchService", () => {
  const mockEmbeddingService: IEmbeddingService = {
    async embedChunks(): Promise<number[][]> {
      return [[0.1, 0.2]];
    },
    async embedQuery(): Promise<number[]> {
      return [0.1, 0.2];
    },
  };

  it("returns empty array for empty query", async () => {
    const searchService = new SearchService(mockEmbeddingService, {
      async upsertChunks(): Promise<void> {},
      async deleteByItemId(): Promise<void> {},
      async querySimilar(): Promise<PineconeMatch[]> {
        return [];
      },
    });

    const results = await searchService.search("   ");
    assert.deepEqual(results, []);
  });

  it("filters out low-score matches and maps metadata to SearchResult", async () => {
    const matches: PineconeMatch[] = [
      {
        id: "item1#0",
        score: 0.85,
        metadata: {
          itemId: "item1",
          chunkIndex: 0,
          text: "Prisma provides type-safe queries.",
          title: "Prisma Notes",
          sourceUrl: "",
          sourceType: "note",
        },
      },
      {
        id: "item2#0",
        score: 0.15, // Below default 0.25 minScore
        metadata: {
          itemId: "item2",
          chunkIndex: 0,
          text: "Unrelated text.",
          title: "Cooking",
          sourceUrl: "https://example.com",
          sourceType: "url",
        },
      },
    ];

    const mockPinecone: IPineconeService = {
      async upsertChunks(): Promise<void> {},
      async deleteByItemId(): Promise<void> {},
      async querySimilar(): Promise<PineconeMatch[]> {
        return matches;
      },
    };

    const searchService = new SearchService(mockEmbeddingService, mockPinecone);
    const results = await searchService.search("Prisma ORM");

    assert.equal(results.length, 1);
    assert.equal(results[0].chunkId, "item1#0");
    assert.equal(results[0].score, 0.85);
    assert.equal(results[0].title, "Prisma Notes");
    assert.equal(results[0].text, "Prisma provides type-safe queries.");
  });

  it("passes scaled dense and sparse vectors to Pinecone when alpha is configured", async () => {
    let capturedVector: number[] = [];
    let capturedSparse: { indices: number[]; values: number[] } | undefined;

    const mockPinecone: IPineconeService = {
      async upsertChunks(): Promise<void> {},
      async deleteByItemId(): Promise<void> {},
      async querySimilar(
        vector,
        _topK,
        sparseVector,
      ): Promise<PineconeMatch[]> {
        capturedVector = vector;
        capturedSparse = sparseVector;
        return [];
      },
    };

    const searchService = new SearchService(mockEmbeddingService, mockPinecone);
    await searchService.search("vector indexing", { alpha: 0.6 });

    // Dense vector scaled by alpha 0.6: [0.1 * 0.6, 0.2 * 0.6] = [0.06, 0.12]
    assert.ok(Math.abs(capturedVector[0] - 0.06) < 0.001);
    assert.ok(Math.abs(capturedVector[1] - 0.12) < 0.001);

    // Sparse vector should be present and scaled by (1 - 0.6) = 0.4
    assert.ok(capturedSparse);
    assert.ok(capturedSparse.indices.length > 0);
    assert.ok(capturedSparse.values.every((v) => v > 0 && v <= 0.4));
  });
});
