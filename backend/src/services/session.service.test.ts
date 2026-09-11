import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { PrismaClient } from "../generated/prisma/client.js";
import { SessionService } from "./session.service.js";

describe("SessionService", () => {
  const databasePath = resolve(
    process.cwd(),
    "data",
    `test-session-${randomUUID()}.db`,
  );
  const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
  const sessionService = new SessionService(prisma);

  before(async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE chat_sessions (
        id TEXT NOT NULL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Conversation',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE chat_turns (
        id TEXT NOT NULL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        sources TEXT,
        iterations INTEGER,
        is_fallback BOOLEAN NOT NULL DEFAULT 0,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_tokens INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  beforeEach(async () => {
    await prisma.chatTurn.deleteMany();
    await prisma.chatSession.deleteMany();
  });

  after(async () => {
    await prisma.$disconnect();
    rmSync(databasePath, { force: true });
  });

  it("creates, lists, and retrieves a session", async () => {
    const created = await sessionService.createSession("Vector Search Chat");
    assert.equal(created.title, "Vector Search Chat");
    assert.equal(created.turnCount, 0);

    const list = await sessionService.listSessions();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, created.id);

    const detail = await sessionService.getSessionById(created.id);
    assert.ok(detail);
    assert.equal(detail.title, "Vector Search Chat");
    assert.deepEqual(detail.turns, []);
  });

  it("adds turns with token counts and retrieves them in order", async () => {
    const session = await sessionService.createSession("Follow-up test");

    const turn1 = await sessionService.addTurn(session.id, {
      question: "What is Self-RAG?",
      answer: "Self-RAG dynamically grades retrieved context.",
      sources: [
        {
          itemId: "item1",
          title: "Self-RAG Notes",
          url: null,
          snippet: "Self-RAG overview",
          score: 0.88,
        },
      ],
      iterations: 1,
      isFallback: false,
      promptTokens: 42,
      completionTokens: 18,
      totalTokens: 60,
    });

    const count = await sessionService.getTurnCount(session.id);
    assert.equal(count, 1);

    const turn2 = await sessionService.addTurn(session.id, {
      question: "Can it retry?",
      answer: "Yes, it rewrites the query up to 3 times.",
      iterations: 2,
      isFallback: false,
      promptTokens: 35,
      completionTokens: 25,
      totalTokens: 60,
    });

    const detail = await sessionService.getSessionById(session.id);
    assert.ok(detail);
    assert.equal(detail.turns.length, 2);
    assert.equal(detail.turns[0].id, turn1.id);
    assert.equal(detail.turns[0].promptTokens, 42);
    assert.equal(detail.turns[0].completionTokens, 18);
    assert.equal(detail.turns[0].totalTokens, 60);
    assert.equal(detail.turns[0].sources?.[0].title, "Self-RAG Notes");

    assert.equal(detail.turns[1].id, turn2.id);
    assert.equal(detail.turns[1].promptTokens, 35);
    assert.equal(detail.turns[1].completionTokens, 25);
  });

  it("renames a session", async () => {
    const session = await sessionService.createSession("Initial Title");
    const updated = await sessionService.updateSessionTitle(
      session.id,
      "Renamed Title",
    );

    assert.equal(updated.title, "Renamed Title");
    const detail = await sessionService.getSessionById(session.id);
    assert.equal(detail?.title, "Renamed Title");
  });

  it("deletes a session and cascades deletion of its turns", async () => {
    const session = await sessionService.createSession("To delete");
    await sessionService.addTurn(session.id, {
      question: "Hello",
      answer: "Hi there!",
    });

    await sessionService.deleteSession(session.id);
    assert.equal(await sessionService.getSessionById(session.id), null);
    assert.equal(
      await prisma.chatTurn.count({ where: { sessionId: session.id } }),
      0,
    );
  });
});
