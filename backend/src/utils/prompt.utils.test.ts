import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FALLBACK_MESSAGES } from "../config/prompts.js";
import {
  formatAnswerGradingPrompt,
  formatQueryRewritePrompt,
  formatRagUserPrompt,
  formatRetrievalGradingPrompt,
  getRandomFallbackMessage,
} from "./prompt.utils.js";

describe("PromptUtils", () => {
  it("selects a valid random fallback message", () => {
    const randomMsg = getRandomFallbackMessage();
    assert.ok(FALLBACK_MESSAGES.some((msg) => msg === randomMsg));
  });

  it("formats RAG user prompt properly", () => {
    const prompt = formatRagUserPrompt(
      "What is TypeScript?",
      "Source 1: TS is typed JS.",
    );
    assert.ok(prompt.includes("What is TypeScript?"));
    assert.ok(prompt.includes("Source 1: TS is typed JS."));
  });

  it("formats retrieval grading prompt properly", () => {
    const prompt = formatRetrievalGradingPrompt(
      "What is Node?",
      "Node is a JS runtime.",
    );
    assert.ok(prompt.includes("What is Node?"));
    assert.ok(prompt.includes("Node is a JS runtime."));
  });

  it("formats query rewrite prompt properly", () => {
    const prompt = formatQueryRewritePrompt("Original Q", 2, [
      "query 1",
      "query 2",
    ]);
    assert.ok(prompt.includes("Original Q"));
    assert.ok(prompt.includes("Attempt: 2"));
    assert.ok(prompt.includes("1. query 1"));
    assert.ok(prompt.includes("2. query 2"));
  });

  it("formats answer grading prompt properly", () => {
    const prompt = formatAnswerGradingPrompt("Q", "Answer", "Context");
    assert.ok(prompt.includes("User Question: Q"));
    assert.ok(prompt.includes("Candidate Answer:\nAnswer"));
    assert.ok(prompt.includes("Context Sources:\nContext"));
  });
});
