import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { createApp } from "../app.js";
import { createItemsRouter } from "./items.routes.js";
import { IngestionService } from "../services/ingestion.service.js";
import { ItemService } from "../services/item.service.js";
import { ChunkingService } from "../services/chunking.service.js";
import type { IEmbeddingService, IPineconeService, PineconeChunkRecord, PineconeMatch } from "../types/index.js";
import { UrlFetchService } from "../fetchers/url.fetcher.js";

describe("Items Routes - GET, PATCH, DELETE", () => {
  const databasePath = resolve(process.cwd(), "data", `test-items-${randomUUID()}.db`);
  const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
  const itemService = new ItemService(prisma);

  const deletedItemIds: string[] = [];
  const upsertedRecords: PineconeChunkRecord[] = [];

  const mockPineconeService: IPineconeService = {
    async upsertChunks(records: PineconeChunkRecord[]): Promise<void> {
      upsertedRecords.push(...records);
    },
    async deleteByItemId(itemId: string): Promise<void> {
      deletedItemIds.push(itemId);
    },
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

  const chunkingService = new ChunkingService({ maxTokens: 50, overlapTokens: 10 });
  const ingestionService = new IngestionService(
    itemService,
    new UrlFetchService(),
    chunkingService,
    mockEmbeddingService,
    mockPineconeService,
  );

  const itemsRouter = createItemsRouter(itemService, ingestionService);
  const app = createApp({ itemsRouter });

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
    deletedItemIds.length = 0;
    upsertedRecords.length = 0;
  });

  after(async () => {
    await prisma.$disconnect();
    rmSync(databasePath, { force: true });
  });

  it("retrieves all items and specific item by id", async () => {
    const item = await itemService.create({
      sourceType: "note",
      title: "Test Note",
      content: "Sample content",
    });

    const listRes = await request(app).get("/items");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.items.length, 1);
    assert.equal(listRes.body.items[0].id, item.id);

    const detailRes = await request(app).get(`/items/${item.id}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.item.title, "Test Note");

    const missingRes = await request(app).get("/items/non-existent-id");
    assert.equal(missingRes.status, 404);
    assert.equal(missingRes.body.error.code, "NOT_FOUND");
  });

  it("updates a note item and re-indexes chunks in Pinecone", async () => {
    const note = await itemService.create({
      sourceType: "note",
      title: "Original Title",
      content: "Original note body text with important facts.",
    });

    const patchRes = await request(app)
      .patch(`/items/${note.id}`)
      .send({ title: "Updated Title", content: "Updated note body with new facts." });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.item.title, "Updated Title");
    assert.equal(patchRes.body.item.content, "Updated note body with new facts.");

    // Verify Pinecone cleanup and re-indexing
    assert.ok(deletedItemIds.includes(note.id));
    assert.ok(upsertedRecords.length > 0);
    assert.equal(upsertedRecords[0].metadata.title, "Updated Title");
  });

  it("rejects editing a URL item with 400 Bad Request", async () => {
    const urlItem = await itemService.create({
      sourceType: "url",
      title: "Web Article",
      content: "Scraped web text.",
      sourceUrl: "https://example.com/article",
    });

    const patchRes = await request(app)
      .patch(`/items/${urlItem.id}`)
      .send({ title: "Cannot Edit URL Title" });

    assert.equal(patchRes.status, 400);
    assert.equal(patchRes.body.error.code, "BAD_REQUEST");
    assert.equal(patchRes.body.error.message, "Only note items can be edited.");
  });

  it("rejects invalid or empty updates with 400 Validation Error", async () => {
    const note = await itemService.create({
      sourceType: "note",
      title: "Valid Note",
      content: "Valid content",
    });

    const emptyRes = await request(app)
      .patch(`/items/${note.id}`)
      .send({});
    assert.equal(emptyRes.status, 400);
    assert.equal(emptyRes.body.error.code, "VALIDATION_ERROR");

    const blankRes = await request(app)
      .patch(`/items/${note.id}`)
      .send({ title: "   " });
    assert.equal(blankRes.status, 400);
    assert.equal(blankRes.body.error.code, "VALIDATION_ERROR");
  });

  it("returns 404 when patching non-existent item", async () => {
    const patchRes = await request(app)
      .patch("/items/missing-id")
      .send({ title: "New Title" });

    assert.equal(patchRes.status, 404);
    assert.equal(patchRes.body.error.code, "NOT_FOUND");
  });

  it("deletes a note item and purges Pinecone chunks", async () => {
    const note = await itemService.create({
      sourceType: "note",
      title: "Note to delete",
      content: "Content to delete",
    });

    const delRes = await request(app).delete(`/items/${note.id}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Verify deleted in DB
    const fetched = await itemService.findById(note.id);
    assert.equal(fetched, null);

    // Verify deleted in Pinecone
    assert.ok(deletedItemIds.includes(note.id));
  });

  it("deletes a url item and purges Pinecone chunks", async () => {
    const urlItem = await itemService.create({
      sourceType: "url",
      title: "URL to delete",
      content: "Web content to delete",
      sourceUrl: "https://example.com/delete-me",
    });

    const delRes = await request(app).delete(`/items/${urlItem.id}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Verify deleted in DB
    const fetched = await itemService.findById(urlItem.id);
    assert.equal(fetched, null);

    // Verify deleted in Pinecone
    assert.ok(deletedItemIds.includes(urlItem.id));
  });

  it("returns 404 when deleting a non-existent item", async () => {
    const delRes = await request(app).delete("/items/missing-item-id");
    assert.equal(delRes.status, 404);
    assert.equal(delRes.body.error.code, "NOT_FOUND");
  });
});
