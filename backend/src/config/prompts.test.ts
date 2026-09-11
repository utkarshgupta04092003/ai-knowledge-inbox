import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANSWER_GRADING_SYSTEM_PROMPT,
  FALLBACK_MESSAGE,
  FALLBACK_MESSAGES,
  QUERY_REWRITE_SYSTEM_PROMPT,
  RAG_SYSTEM_PROMPT,
  RETRIEVAL_GRADING_SYSTEM_PROMPT,
} from "./prompts.js";

describe("PromptsConfig", () => {
  it("defines strict fallback message and system prompts", () => {
    assert.equal(FALLBACK_MESSAGES.length, 3);
    assert.ok(
      FALLBACK_MESSAGE.includes("saved knowledge") ||
        FALLBACK_MESSAGE.includes("knowledge inbox"),
    );
    assert.ok(RAG_SYSTEM_PROMPT.includes("Knowledge First"));
    assert.ok(RAG_SYSTEM_PROMPT.includes("Illegal Activity Restriction"));
    assert.ok(RETRIEVAL_GRADING_SYSTEM_PROMPT.includes("YES"));
    assert.ok(QUERY_REWRITE_SYSTEM_PROMPT.includes("search query optimizer"));
    assert.ok(ANSWER_GRADING_SYSTEM_PROMPT.includes("anti-hallucination"));
  });
});
