import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { createApp } from "../app.js";
import { createIngestRouter } from "./ingest.routes.js";
import { createItemsRouter } from "./items.routes.js";
import { IngestionService } from "../services/ingestion.service.js";
import { ItemService } from "../services/item.service.js";
import { ChunkingService } from "../services/chunking.service.js";
import { IEmbeddingService } from "../services/embedding.service.js";
import { IPineconeService, PineconeChunkRecord, PineconeMatch } from "../types/index.js";
import { UrlFetchService } from "../fetchers/url.fetcher.js";
import type { FetchedUrlContent } from "../types/index.js";

describe("Phase 3 - Content Ingestion Pipeline Integration", () => {
  const databasePath = resolve(process.cwd(), "data", `test-ingest-${randomUUID()}.db`);
  const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
  const itemService = new ItemService(prisma);

  const upsertedRecords: PineconeChunkRecord[] = [];
  const mockPineconeService: IPineconeService = {
    async upsertChunks(records: PineconeChunkRecord[]): Promise<void> {
      upsertedRecords.push(...records);
    },
    async deleteByItemId(): Promise<void> {},
    async querySimilar(): Promise<PineconeMatch[]> {
      return [];
    },
  };

  const mockEmbeddingService: IEmbeddingService = {
    async embedChunks(texts: string[]): Promise<number[][]> {
      return texts.map(() => new Array(1536).fill(0.01));
    },
    async embedQuery(): Promise<number[]> {
      return new Array(1536).fill(0.01);
    },
  };

  class MockUrlFetchService extends UrlFetchService {
    override async fetchPage(url: string): Promise<FetchedUrlContent> {
      return {
        title: "Fetched Page Title",
        content: `Article content from ${url}. First paragraph explaining concepts. Second paragraph discussing details.`,
      };
    }
  }

  const chunkingService = new ChunkingService({ maxTokens: 20, overlapTokens: 4 });
  const ingestionService = new IngestionService(
    itemService,
    new MockUrlFetchService(),
    chunkingService,
    mockEmbeddingService,
    mockPineconeService,
  );

  const app = createApp({
    ingestRouter: createIngestRouter(ingestionService),
    itemsRouter: createItemsRouter(itemService),
  });

  before(async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE items (
        id TEXT NOT NULL PRIMARY KEY,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_url TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL
      )
    `);
  });

  beforeEach(async () => {
    await prisma.item.deleteMany();
    upsertedRecords.length = 0;
  });

  after(async () => {
    await prisma.$disconnect();
    rmSync(databasePath, { force: true });
  });

  describe("POST /ingest (Note)", () => {
    it("ingests a note, saves item to SQLite, and upserts chunks to Pinecone", async () => {
      const payload = {
        type: "note",
        title: "Architecture Decisions",
        content: "We chose SQLite and Pinecone for clean separation of storage and vector search.",
      };

      const res = await request(app).post("/ingest").send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.item.title, "Architecture Decisions");
      assert.equal(res.body.item.sourceType, "note");
      assert.ok(res.body.chunkCount >= 1);

      // Verify SQLite persistence
      const saved = await itemService.findById(res.body.item.id);
      assert.ok(saved);
      assert.equal(saved.title, "Architecture Decisions");

      // Verify Pinecone upsert
      assert.equal(upsertedRecords.length, res.body.chunkCount);
      assert.equal(upsertedRecords[0].id, `${res.body.item.id}#0`);
      assert.equal(upsertedRecords[0].metadata.itemId, res.body.item.id);
      assert.equal(upsertedRecords[0].metadata.sourceType, "note");
    });

    it("rejects empty note with 400 INVALID_INPUT", async () => {
      const res = await request(app).post("/ingest").send({ type: "note", content: "   " });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "INVALID_INPUT");
    });
  });

  describe("POST /ingest (URL)", () => {
    it("fetches page, cleans text, saves item, and upserts to Pinecone", async () => {
      const res = await request(app)
        .post("/ingest")
        .send({ type: "url", url: "https://docs.pinecone.io/guides" });

      assert.equal(res.status, 201);
      assert.equal(res.body.item.sourceType, "url");
      assert.equal(res.body.item.sourceUrl, "https://docs.pinecone.io/guides");
      assert.equal(res.body.item.title, "Fetched Page Title");
      assert.ok(res.body.chunkCount >= 1);

      assert.equal(upsertedRecords[0].metadata.sourceUrl, "https://docs.pinecone.io/guides");
    });

    it("rejects SSRF attempt with 400 INVALID_INPUT", async () => {
      const res = await request(app)
        .post("/ingest")
        .send({ type: "url", url: "http://127.0.0.1:5000/admin" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "INVALID_INPUT");
    });
  });

  describe("GET /items", () => {
    it("returns all stored items", async () => {
      await itemService.create({ sourceType: "note", title: "Doc 1", content: "Body 1" });
      await itemService.create({ sourceType: "note", title: "Doc 2", content: "Body 2" });

      const res = await request(app).get("/items");

      assert.equal(res.status, 200);
      assert.equal(res.body.items.length, 2);
    });

    it("returns item by id or 404", async () => {
      const created = await itemService.create({ sourceType: "note", title: "Find Me", content: "Body" });

      const resFound = await request(app).get(`/items/${created.id}`);
      assert.equal(resFound.status, 200);
      assert.equal(resFound.body.item.title, "Find Me");

      const resNotFound = await request(app).get("/items/non-existent-id");
      assert.equal(resNotFound.status, 404);
      assert.equal(resNotFound.body.error.code, "NOT_FOUND");
    });
  });
});
