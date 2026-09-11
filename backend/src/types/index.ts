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
