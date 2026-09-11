import type {
  IEmbeddingService,
  IPineconeService,
  ISearchService,
  SearchOptions,
  SearchResult,
} from "../types/index.js";
import { EmbeddingService } from "./embedding.service.js";
import { PineconeService } from "./pinecone.service.js";

export type {
  ISearchService,
  SearchOptions,
  SearchResult,
} from "../types/index.js";

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.2;

export class SearchService implements ISearchService {
  constructor(
    private readonly embeddingService: IEmbeddingService = new EmbeddingService(),
    private readonly pineconeService: IPineconeService = new PineconeService(),
  ) {}

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const topK = options.topK ?? DEFAULT_TOP_K;
    const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

    const queryVector = await this.embeddingService.embedQuery(trimmed);
    const matches = await this.pineconeService.querySimilar(queryVector, topK);

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
