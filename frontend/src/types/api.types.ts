export type SourceType = "note" | "url";

export interface Item {
  id: string;
  sourceType: SourceType;
  title: string;
  content: string;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngestPayload {
  type: SourceType;
  title?: string;
  content?: string;
  url?: string;
}

export interface IngestResponse {
  item: Item;
  chunkCount: number;
}

export interface IngestResult {
  itemId: string;
  title: string;
  chunksIndexed: number;
}

export interface SourceCitation {
  itemId: string;
  title: string;
  url?: string | null;
  snippet: string;
  score?: number;
}

export interface RagResponse {
  answer: string;
  sources: SourceCitation[];
  iterations: number;
  reformulatedQueries: string[];
  isFallback?: boolean;
}
