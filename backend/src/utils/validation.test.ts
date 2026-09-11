import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateIngestPayload, validateNote, validateUrl } from "./validation.js";
import { AppError } from "../middleware/error.middleware.js";

describe("Validation Layer", () => {
  describe("validateNote", () => {
    it("validates a standard note and sets fallback title from first line", () => {
      const result = validateNote({ content: "First line of thought\nSecond line details" });
      assert.equal(result.type, "note");
      assert.equal(result.title, "First line of thought");
      assert.equal(result.content, "First line of thought\nSecond line details");
    });

    it("respects explicitly provided title", () => {
      const result = validateNote({ title: "Custom Title", content: "Note content" });
      assert.equal(result.title, "Custom Title");
    });

    it("rejects empty or whitespace-only content", () => {
      assert.throws(
        () => validateNote({ content: "   " }),
        (err: unknown) => err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_INPUT",
      );
    });

    it("rejects content exceeding character limit", () => {
      const hugeContent = "a".repeat(50001);
      assert.throws(
        () => validateNote({ content: hugeContent }),
        (err: unknown) => err instanceof AppError && err.statusCode === 400,
      );
    });
  });

  describe("validateUrl & SSRF Protection", () => {
    it("accepts valid public HTTP and HTTPS URLs", () => {
      assert.equal(validateUrl("https://example.com/article"), "https://example.com/article");
      assert.equal(validateUrl("http://docs.pinecone.io/guides"), "http://docs.pinecone.io/guides");
    });

    it("rejects malformed URLs and non-HTTP protocols", () => {
      assert.throws(() => validateUrl("not-a-url"), (err: unknown) => err instanceof AppError && err.statusCode === 400);
      assert.throws(() => validateUrl("ftp://example.com/file"), (err: unknown) => err instanceof AppError && err.statusCode === 400);
      assert.throws(() => validateUrl("javascript:alert(1)"), (err: unknown) => err instanceof AppError && err.statusCode === 400);
    });

    it("rejects private, loopback, and metadata IP addresses (SSRF)", () => {
      const blocked = [
        "http://localhost/admin",
        "http://127.0.0.1:8080/metrics",
        "http://169.254.169.254/latest/meta-data",
        "http://192.168.1.1/secret",
        "http://10.0.0.5/internal",
        "http://172.16.0.1/status",
      ];

      for (const url of blocked) {
        assert.throws(
          () => validateUrl(url),
          (err: unknown) => err instanceof AppError && err.statusCode === 400,
          `Expected ${url} to be blocked by SSRF filter`,
        );
      }
    });
  });

  describe("validateIngestPayload", () => {
    it("rejects non-object or missing payload", () => {
      assert.throws(() => validateIngestPayload(null), (err: unknown) => err instanceof AppError && err.statusCode === 400);
      assert.throws(() => validateIngestPayload("string"), (err: unknown) => err instanceof AppError && err.statusCode === 400);
    });

    it("rejects unknown type", () => {
      assert.throws(
        () => validateIngestPayload({ type: "pdf", content: "data" }),
        (err: unknown) => err instanceof AppError && err.code === "INVALID_INPUT",
      );
    });
  });
});
