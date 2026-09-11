import OpenAI from "openai";
import { getAiClient, getEmbeddingModel } from "../config/ai.js";
import { AppError } from "../middleware/error.middleware.js";
import type { IEmbeddingService } from "../types/index.js";

export type { IEmbeddingService } from "../types/index.js";

const BATCH_SIZE = 100;

export class EmbeddingService implements IEmbeddingService {
  private client: OpenAI | null = null;
  private readonly model: string;

  constructor(client?: OpenAI, model?: string) {
    if (client) this.client = client;
    this.model = model ?? getEmbeddingModel();
  }

  private getClient(): OpenAI {
    this.client ??= getAiClient();
    return this.client;
  }

  async embedChunks(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];
    const client = this.getClient();

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      try {
        const response = await client.embeddings.create({
          model: this.model,
          input: batch,
        });

        const sortedData = response.data.sort((a, b) => a.index - b.index);
        allEmbeddings.push(...sortedData.map((entry) => entry.embedding));
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Embedding request failed.";
        throw new AppError(
          502,
          "UPSTREAM_ERROR",
          `Failed to generate embeddings: ${message}`,
        );
      }
    }

    return allEmbeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new AppError(400, "INVALID_INPUT", "Query string cannot be empty.");
    }

    const embeddings = await this.embedChunks([trimmed]);
    return embeddings[0];
  }
}
