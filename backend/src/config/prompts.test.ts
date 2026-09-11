import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_MESSAGE,
  RAG_SYSTEM_PROMPT,
  RETRIEVAL_GRADING_SYSTEM_PROMPT,
  QUERY_REWRITE_SYSTEM_PROMPT,
  ANSWER_GRADING_SYSTEM_PROMPT,
  formatRagUserPrompt,
  formatRetrievalGradingPrompt,
  formatQueryRewritePrompt,
  formatAnswerGradingPrompt,
} from "./prompts.js";

describe("PromptsConfig", () => {
  it("defines strict fallback message and system prompts", () => {
    assert.ok(FALLBACK_MESSAGE.includes("saved knowledge inbox"));
    assert.ok(RAG_SYSTEM_PROMPT.includes("Strict Knowledge Boundary"));
    assert.ok(RAG_SYSTEM_PROMPT.includes("Mandatory Bracket Citations"));
    assert.ok(RETRIEVAL_GRADING_SYSTEM_PROMPT.includes("YES"));
    assert.ok(QUERY_REWRITE_SYSTEM_PROMPT.includes("search query optimizer"));
    assert.ok(ANSWER_GRADING_SYSTEM_PROMPT.includes("anti-hallucination"));
  });

  it("formats RAG user prompt properly", () => {
    const prompt = formatRagUserPrompt("What is TypeScript?", "Source 1: TS is typed JS.");
    assert.ok(prompt.includes("What is TypeScript?"));
    assert.ok(prompt.includes("Source 1: TS is typed JS."));
  });

  it("formats retrieval grading prompt properly", () => {
    const prompt = formatRetrievalGradingPrompt("Question?", "Context snippet");
    assert.ok(prompt.includes("Question?"));
    assert.ok(prompt.includes("Context snippet"));
  });

  it("formats query rewrite prompt properly", () => {
    const prompt = formatQueryRewritePrompt("Original Q", 2, ["query 1", "query 2"]);
    assert.ok(prompt.includes("Original Q"));
    assert.ok(prompt.includes("Attempt: 2"));
    assert.ok(prompt.includes("1. query 1"));
    assert.ok(prompt.includes("2. query 2"));
  });

  it("formats answer grading prompt properly", () => {
    const prompt = formatAnswerGradingPrompt("Q", "Answer", "Context");
    assert.ok(prompt.includes("Candidate Answer:\nAnswer"));
    assert.ok(prompt.includes("Context Sources:\nContext"));
  });
});
