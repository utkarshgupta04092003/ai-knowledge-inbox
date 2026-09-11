import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ChunkingService } from "./chunking.service.js";

describe("ChunkingService (Tiktoken BPE)", () => {
  const chunker = new ChunkingService({
    maxTokens: 14,
    overlapTokens: 3,
  });

  it("returns an empty array for empty or whitespace content", () => {
    assert.deepEqual(chunker.chunkText(""), []);
    assert.deepEqual(chunker.chunkText("   \n\t  "), []);
  });

  it("returns a single chunk when text is under maxTokens", () => {
    const text = "Short note that easily fits in one chunk.";
    const chunks = chunker.chunkText(text);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].text, text);
  });

  it("accurately counts tokens via countTokens", () => {
    assert.ok(chunker.countTokens("Hello world") > 0);
  });

  it("splits long text recursively across paragraphs and sentences", () => {
    const p1 = "First paragraph discussing system design and components in great detail.";
    const p2 = "Second paragraph covering vector embeddings and approximate nearest neighbors.";
    const p3 = "Third paragraph explaining RAG prompts and model context windows.";
    const fullText = `${p1}\n\n${p2}\n\n${p3}`;

    const chunks = chunker.chunkText(fullText);

    assert.ok(chunks.length >= 3, `Expected at least 3 chunks, got ${chunks.length}`);
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[1].chunkIndex, 1);
    assert.equal(chunks[2].chunkIndex, 2);

    for (const chunk of chunks) {
      assert.ok(chunk.text.length > 0);
    }
  });

  it("preserves sequential indices starting at 0", () => {
    const text = "Paragraph one with detailed info.\n\nParagraph two with more details.\n\nParagraph three.";
    const chunks = chunker.chunkText(text);

    chunks.forEach((chunk, index) => {
      assert.equal(chunk.chunkIndex, index);
    });
  });
});
