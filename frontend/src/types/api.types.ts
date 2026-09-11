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

