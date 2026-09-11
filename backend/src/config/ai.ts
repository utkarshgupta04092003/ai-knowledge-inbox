import OpenAI, { type ClientOptions } from "openai";
import { env } from "./env.js";

export type AiClientConfig = ClientOptions;

let defaultClient: OpenAI | null = null;

export function getAiClient(options?: AiClientConfig): OpenAI {
  if (options) {
    return new OpenAI({
      apiKey: options.apiKey ?? env.OPENAI_API_KEY,
      baseURL: options.baseURL ?? env.OPENAI_BASE_URL,
      ...options,
    });
  }

  if (!defaultClient) {
    defaultClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
    });
  }

  return defaultClient;
}

export function setAiClient(client: OpenAI | null): void {
  defaultClient = client;
}

export function resetAiClient(): void {
  defaultClient = null;
}

export function getChatModel(): string {
  return env.OPENAI_MODEL;
}

export function getEmbeddingModel(): string {
  return env.OPENAI_EMBEDDING_MODEL;
}
