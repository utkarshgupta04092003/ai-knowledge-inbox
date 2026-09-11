import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../middleware/error.middleware.js";
import { UrlFetchService } from "./url.fetcher.js";

describe("UrlFetchService", () => {
  it("rejects non-text/html mime types with 400 AppError", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("fake pdf binary", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });

    try {
      const fetcher = new UrlFetchService();
      await assert.rejects(
        async () => fetcher.fetchPage("https://example.com/document.pdf"),
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_INPUT");
          assert.match(err.message, /Unsupported content type/);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetches and extracts content from HTML response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        "<html><head><title>Test Title</title></head><body><p>Article body content.</p></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html" },
        },
      );

    try {
      const fetcher = new UrlFetchService();
      const result = await fetcher.fetchPage("https://example.com/article");
      assert.equal(result.title, "Test Title");
      assert.equal(result.content, "Article body content.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects empty html body with 400 AppError", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        "<html><head><title>Empty</title></head><body></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html" },
        },
      );

    try {
      const fetcher = new UrlFetchService();
      await assert.rejects(
        async () => fetcher.fetchPage("https://example.com/empty"),
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_INPUT");
          assert.match(err.message, /contained no readable text content/);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
