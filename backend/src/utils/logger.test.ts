import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logger } from "./logger.js";

describe("Logger Utility", () => {
  it("formats and writes structured log entries", () => {
    let captured = "";
    const originalWrite = process.stdout.write;
    try {
      process.stdout.write = ((chunk: string | Uint8Array) => {
        captured += chunk.toString();
        return true;
      }) as typeof process.stdout.write;

      logger.info("test_event", { detail: "test_value" });
      assert.ok(captured.includes("test_event"));
      assert.ok(captured.includes("test_value"));
      assert.ok(captured.includes('"level":"info"'));
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});
