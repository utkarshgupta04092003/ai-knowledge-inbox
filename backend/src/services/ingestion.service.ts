import { UrlFetchService } from "../fetchers/url.fetcher.js";
import type {
  IEmbeddingService,
  IIngestionService,
  IngestResult,
  IPineconeService,
  ISparseEncoderService,
  IUrlFetchService,
  PineconeChunkRecord,
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
}
