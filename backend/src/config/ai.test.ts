import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import {
  getAiClient,
  setAiClient,
  resetAiClient,
  getChatModel,
  getEmbeddingModel,
} from "./ai.js";

describe("AiConfig", () => {
  beforeEach(() => {
    resetAiClient();
  });

  it("returns an OpenAI instance using environment configuration", () => {
    const client = getAiClient();
    assert.ok(client instanceof OpenAI);
  });

  it("caches and reuses the default client instance across calls", () => {
    const client1 = getAiClient();
    const client2 = getAiClient();
    assert.equal(client1, client2);
  });

  it("creates a new configured client when custom options are supplied", () => {
    const customClient = getAiClient({
      apiKey: "custom-api-key",
      baseURL: "https://api.custom-provider.com/v1",
    });

    assert.ok(customClient instanceof OpenAI);
    assert.equal(customClient.apiKey, "custom-api-key");
    assert.equal(customClient.baseURL, "https://api.custom-provider.com/v1");
  });

  it("allows setting and resetting a mock or custom client", () => {
    const mockClient = new OpenAI({ apiKey: "mock-key" });
    setAiClient(mockClient);
    assert.equal(getAiClient(), mockClient);

    resetAiClient();
    const freshClient = getAiClient();
    assert.notEqual(freshClient, mockClient);
  });

  it("returns default model identifiers", () => {
    assert.equal(typeof getChatModel(), "string");
    assert.equal(typeof getEmbeddingModel(), "string");
    assert.ok(getChatModel().length > 0);
    assert.ok(getEmbeddingModel().length > 0);
  });
});
