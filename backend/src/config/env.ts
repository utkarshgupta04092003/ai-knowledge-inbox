import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config();

const DEFAULT_DATABASE_URL = "file:./data/inbox-prisma.db";

export function getDatabaseUrl(): string {
  const configuredUrl =
    process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
  if (!configuredUrl.startsWith("file:")) return configuredUrl;

  const filePath = configuredUrl.slice("file:".length);
  if (/^(?:\/|[A-Za-z]:)/.test(filePath)) return configuredUrl;

  const absolutePath = resolve(process.cwd(), filePath).replaceAll("\\", "/");
  return `file:${absolutePath}`;
}

export const env = {
  get PORT(): number {
    return process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV || "development";
  },
  get DATABASE_URL(): string {
    return getDatabaseUrl();
  },
  get PINECONE_API_KEY(): string {
    const key = process.env.PINECONE_API_KEY?.trim();
    if (!key) throw new Error("PINECONE_API_KEY is required.");
    return key;
  },
  get PINECONE_INDEX(): string {
    return process.env.PINECONE_INDEX?.trim() || "ai-knowledge-inbox";
  },
  get PINECONE_CLOUD(): string {
    return process.env.PINECONE_CLOUD?.trim() || "aws";
  },
  get PINECONE_REGION(): string {
    return process.env.PINECONE_REGION?.trim() || "us-east-1";
  },
  get OPENAI_API_KEY(): string {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error("OPENAI_API_KEY is required.");
    return key;
  },
  get OPENAI_BASE_URL(): string | undefined {
    return process.env.OPENAI_BASE_URL?.trim() || undefined;
  },
  get OPENAI_MODEL(): string {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  },
  get OPENAI_EMBEDDING_MODEL(): string {
    return (
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small"
    );
  },
};
