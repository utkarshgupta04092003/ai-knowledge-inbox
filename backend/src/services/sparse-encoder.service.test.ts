import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SparseEncoderService } from "./sparse-encoder.service.js";

describe("SparseEncoderService", () => {
  const encoder = new SparseEncoderService();

  it("returns empty vectors for empty or whitespace text", () => {
    assert.deepEqual(encoder.encodeText(""), { indices: [], values: [] });
    assert.deepEqual(encoder.encodeText("   \n\t  "), {
      indices: [],
      values: [],
    });
  });

  it("produces deterministic sorted indices and positive weights for keywords", () => {
    const text = "Pinecone vector databases and RAG systems";
    const result1 = encoder.encodeText(text);
    const result2 = encoder.encodeText(text);

    assert.deepEqual(result1, result2);
    assert.ok(result1.indices.length > 0);
    assert.equal(result1.indices.length, result1.values.length);

    // Indices should be sorted in ascending order
    for (let i = 1; i < result1.indices.length; i++) {
      assert.ok(result1.indices[i] > result1.indices[i - 1]);
    }

    // Weights should be strictly positive
    for (const val of result1.values) {
      assert.ok(val > 0 && val <= 1);
    }
  });

  it("filters out stopwords but keeps content terms", () => {
    const result = encoder.encodeText("the in at on what which database");
    assert.equal(result.indices.length, 1); // Only "database"
  });

  it("assigns higher weights to terms appearing more frequently", () => {
    const text = "database database database server";
    const result = encoder.encodeText(text);
    assert.equal(result.indices.length, 2);

    const dbIndex = encoder.encodeText("database").indices[0];
    const serverIndex = encoder.encodeText("server").indices[0];

    const dbWeight = result.values[result.indices.indexOf(dbIndex)];
    const serverWeight = result.values[result.indices.indexOf(serverIndex)];

    assert.ok(dbWeight > serverWeight);
  });
});
