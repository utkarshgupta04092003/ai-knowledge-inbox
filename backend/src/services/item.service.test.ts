import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { ItemService } from "./item.service.js";

describe("ItemService", () => {
  const databasePath = resolve(process.cwd(), "data", `test-${randomUUID()}.db`);
  const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
  const itemService = new ItemService(prisma);

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
  });

  after(async () => {
    await prisma.$disconnect();
    rmSync(databasePath, { force: true });
  });

  it("creates and retrieves items", async () => {
    const created = await itemService.create({
      sourceType: "note",
      title: "Retrieval notes",
      content: "Semantic search retrieves related chunks from Pinecone.",
    });

    assert.deepEqual(await itemService.findById(created.id), created);
    assert.deepEqual(await itemService.findAll(), [created]);
    assert.equal(await itemService.findById("missing"), null);
  });

  it("deletes an item", async () => {
    const item = await itemService.create({ sourceType: "note", title: "To delete", content: "Content" });
    await prisma.item.delete({ where: { id: item.id } });

    assert.equal(await itemService.findById(item.id), null);
  });
});
