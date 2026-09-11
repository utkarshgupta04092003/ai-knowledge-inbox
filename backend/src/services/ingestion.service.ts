import { UrlFetchService } from "../fetchers/url.fetcher.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  IEmbeddingService,
  IIngestionService,
  IngestResult,
  IPineconeService,
  ISparseEncoderService,
  Item,
  IUrlFetchService,
  PineconeChunkRecord,
  UpdateItemInput,
} from "../types/index.js";
import { validateIngestPayload } from "../utils/validation.js";
import { ChunkingService } from "./chunking.service.js";
import { EmbeddingService } from "./embedding.service.js";
import { ItemService } from "./item.service.js";
import { PineconeService } from "./pinecone.service.js";
import { SparseEncoderService } from "./sparse-encoder.service.js";

export type { IngestResult } from "../types/index.js";

export class IngestionService implements IIngestionService {
  constructor(
    private readonly itemService: ItemService = new ItemService(),
    private readonly urlFetchService: IUrlFetchService = new UrlFetchService(),
    private readonly chunkingService: ChunkingService = new ChunkingService(),
    private readonly embeddingService: IEmbeddingService = new EmbeddingService(),
    private readonly pineconeService: IPineconeService = new PineconeService(),
    private readonly sparseEncoderService: ISparseEncoderService = new SparseEncoderService(),
  ) {}

  async ingest(body: unknown): Promise<IngestResult> {
    const validated = validateIngestPayload(body);

    let title: string;
    let content: string;
    let sourceUrl: string | null = null;
    const sourceType = validated.type;

    if (validated.type === "url") {
      sourceUrl = validated.url;
      const fetched = await this.urlFetchService.fetchPage(sourceUrl);
      title = fetched.title;
      content = fetched.content;
    } else {
      title = validated.title;
      content = validated.content;
    }

    const item = await this.itemService.create({
      sourceType,
      title,
      content,
      sourceUrl,
    });

    const chunks = this.chunkingService.chunkText(content);
    if (chunks.length > 0) {
      const texts = chunks.map((c) => c.text);
      const embeddings = await this.embeddingService.embedChunks(texts);

      const records: PineconeChunkRecord[] = chunks.map((chunk, index) => ({
        id: `${item.id}#${chunk.chunkIndex}`,
        values: embeddings[index],
        sparseValues: this.sparseEncoderService.encodeText(chunk.text),
        metadata: {
          itemId: item.id,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          title: item.title,
          sourceUrl: item.sourceUrl || "",
          sourceType: item.sourceType,
        },
      }));

      await this.pineconeService.upsertChunks(records);
    }

    return {
      item,
      chunkCount: chunks.length,
    };
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await this.itemService.findById(id);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Item not found.");
    }

    await this.pineconeService.deleteByItemId(id);
    await this.itemService.delete(id);
  }

  async updateNoteItem(id: string, input: UpdateItemInput): Promise<Item> {
    const existing = await this.itemService.findById(id);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Item not found.");
    }

    if (existing.sourceType !== "note") {
      throw new AppError(400, "BAD_REQUEST", "Only note items can be edited.");
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const content = input.content !== undefined ? input.content.trim() : existing.content;

    if (!title || !content) {
      throw new AppError(400, "VALIDATION_ERROR", "Title and content cannot be empty.");
    }

    const updated = await this.itemService.update(id, { title, content });

    // Re-index in Pinecone with updated content/title
    await this.pineconeService.deleteByItemId(id);

    const chunks = this.chunkingService.chunkText(updated.content);
    if (chunks.length > 0) {
      const texts = chunks.map((c) => c.text);
      const embeddings = await this.embeddingService.embedChunks(texts);

      const records: PineconeChunkRecord[] = chunks.map((chunk, index) => ({
        id: `${updated.id}#${chunk.chunkIndex}`,
        values: embeddings[index],
        sparseValues: this.sparseEncoderService.encodeText(chunk.text),
        metadata: {
          itemId: updated.id,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          title: updated.title,
          sourceUrl: updated.sourceUrl || "",
          sourceType: updated.sourceType,
        },
      }));

      await this.pineconeService.upsertChunks(records);
    }

    return updated;
  }
}
