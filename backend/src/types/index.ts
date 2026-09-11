import type { ClientOptions } from "openai";

export type SourceType = "note" | "url";

export interface Item {
  id: string;
  sourceType: SourceType;
  title: string;
  content: string;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemInput {
  id?: string;
  sourceType: SourceType;
  title: string;
  content: string;
  sourceUrl?: string | null;
}

export interface UpdateItemInput {
  title?: string;
  content?: string;
}

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface ISparseEncoderService {
  encodeText(text: string): SparseVector;
}

export interface PineconeChunkRecord {
  id: string;
  values: number[];
  sparseValues?: SparseVector;
  metadata: {
    itemId: string;
    chunkIndex: number;
    text: string;
    title: string;
    sourceUrl: string;
    sourceType: SourceType;
  };
}

export interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: {
    itemId: string;
    chunkIndex: number;
    text: string;
    title: string;
    sourceUrl: string;
    sourceType: SourceType;
  };
}

export interface IPineconeService {
  upsertChunks(records: PineconeChunkRecord[]): Promise<void>;
  deleteByItemId(itemId: string): Promise<void>;
  querySimilar(
    vector: number[],
    topK?: number,
    sparseVector?: SparseVector,
  ): Promise<PineconeMatch[]>;
}

export type AiClientConfig = ClientOptions;

export interface SourceCitation {
  itemId: string;
  title: string;
  url: string | null;
  snippet: string;
  score?: number;
}

export interface RagResponse {
  answer: string;
  sources: SourceCitation[];
  iterations: number;
  reformulatedQueries: string[];
  isFallback?: boolean;
  sessionId?: string;
  turnId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatTurnData {
  id: string;
  sessionId: string;
  question: string;
  answer: string;
  sources: SourceCitation[] | null;
  iterations: number | null;
  isFallback: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ChatTurnData[];
}

export interface CreateTurnInput {
  question: string;
  answer: string;
  sources?: SourceCitation[] | null;
  iterations?: number | null;
  isFallback?: boolean;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface ILlmClient {
  generateAnswer(systemPrompt: string, userPrompt: string): Promise<string>;
  gradeRetrieval(question: string, context: string): Promise<boolean>;
  rewriteQuery(
    originalQuestion: string,
    attempt: number,
    pastQueries: string[],
  ): Promise<string>;
  gradeAnswer(
    question: string,
    answer: string,
    context: string,
  ): Promise<boolean>;
}

export interface IEmbeddingService {
  embedChunks(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}

export interface TextChunk {
  chunkIndex: number;
  text: string;
}

export interface ChunkingOptions {
  maxTokens?: number;
  overlapTokens?: number;
  separators?: string[];
  encodingName?: "cl100k_base" | "o200k_base";
}

export interface SearchResult {
  chunkId: string;
  score: number;
  itemId: string;
  title: string;
  url: string | null;
  text: string;
  chunkIndex: number;
  sourceType: SourceType;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  alpha?: number;
}

export interface ISearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface FetchedUrlContent {
  title: string;
  content: string;
}

export interface IUrlFetchService {
  fetchPage(targetUrl: string): Promise<FetchedUrlContent>;
}

export interface IngestNotePayload {
  type: "note";
  title?: string;
  content: string;
}

export interface IngestUrlPayload {
  type: "url";
  url: string;
}

export type IngestPayload = IngestNotePayload | IngestUrlPayload;

export interface IngestResult {
  item: Item;
  chunkCount: number;
}

export interface IIngestionService {
  ingest(payload: IngestPayload): Promise<IngestResult>;
  deleteItem(id: string): Promise<void>;
  updateNoteItem(id: string, input: UpdateItemInput): Promise<Item>;
}
