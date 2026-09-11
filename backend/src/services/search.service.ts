import type {
  IEmbeddingService,
  IPineconeService,
  ISearchService,
  ISparseEncoderService,
  SearchOptions,
  SearchResult,
  SparseVector,
} from "../types/index.js";
import { EmbeddingService } from "./embedding.service.js";
import { PineconeService } from "./pinecone.service.js";
import { SparseEncoderService } from "./sparse-encoder.service.js";

export type {
  ISearchService,
  SearchOptions,
  SearchResult,
} from "../types/index.js";

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.2;
const DEFAULT_ALPHA = 0.7;

export class SearchService implements ISearchService {
  constructor(
    private readonly embeddingService: IEmbeddingService = new EmbeddingService(),
    private readonly pineconeService: IPineconeService = new PineconeService(),
    private readonly sparseEncoderService: ISparseEncoderService = new SparseEncoderService(),
  ) {}

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const topK = options.topK ?? DEFAULT_TOP_K;
    const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
    const alpha = Math.min(1, Math.max(0, options.alpha ?? DEFAULT_ALPHA));

    const queryVector = await this.embeddingService.embedQuery(trimmed);
    const sparseVector = this.sparseEncoderService.encodeText(trimmed);

    const scaledDense = queryVector.map((v) => v * alpha);

    let scaledSparse: SparseVector | undefined;
    if (sparseVector.indices.length > 0 && alpha < 1) {
      scaledSparse = {
        indices: sparseVector.indices,
        values: sparseVector.values.map((v) => v * (1 - alpha)),
      };
    }

    const matches = await this.pineconeService.querySimilar(
      scaledDense,
      topK,
      scaledSparse,
    );

    return matches
      .filter(
        (match) =>
          (match.score ?? 0) >= minScore && Boolean(match.metadata?.text),
      )
      .map((match) => ({
        chunkId: match.id,
        score: match.score ?? 0,
        itemId: match.metadata?.itemId ?? "",
        title: match.metadata?.title ?? "Untitled",
        url: match.metadata?.sourceUrl || null,
        text: match.metadata?.text ?? "",
        chunkIndex: match.metadata?.chunkIndex ?? 0,
        sourceType: match.metadata?.sourceType ?? "note",
      }));
  }
}
