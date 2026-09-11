import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "./env.js";

export const PINECONE_DIMENSION = 1536;
export const PINECONE_METRIC = "dotproduct";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  pineconeClient ??= new Pinecone({ apiKey: env.PINECONE_API_KEY });
  return pineconeClient;
}

export function getPineconeIndex() {
  return getPineconeClient().index(env.PINECONE_INDEX);
}

export function setPineconeClient(client: Pinecone | null): void {
  pineconeClient = client;
}

export function resetPineconeClient(): void {
  pineconeClient = null;
}

export async function ensurePineconeIndex(): Promise<void> {
  const client = getPineconeClient();
  const indexName = env.PINECONE_INDEX;
  const indexes = await client.listIndexes();
  if (indexes.indexes?.some((index) => index.name === indexName)) return;

  await client.createIndex({
    name: indexName,
    dimension: PINECONE_DIMENSION,
    metric: PINECONE_METRIC,
    spec: {
      serverless: {
        cloud: env.PINECONE_CLOUD as "aws" | "gcp" | "azure",
        region: env.PINECONE_REGION,
      },
    },
    waitUntilReady: true,
  });
}

export async function verifyPineconeConnection() {
  return getPineconeIndex().describeIndexStats();
}
