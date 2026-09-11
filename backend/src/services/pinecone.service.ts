import { getPineconeIndex } from "../config/pinecone.js";
import type {
  PineconeChunkRecord,
  PineconeMatch,
  IPineconeService,
} from "../types/index.js";

export {
  getPineconeClient,
  getPineconeIndex,
  ensurePineconeIndex,
  verifyPineconeConnection,
  PINECONE_DIMENSION,
  PINECONE_METRIC,
} from "../config/pinecone.js";

export type {
  PineconeChunkRecord,
  PineconeMatch,
  IPineconeService,
} from "../types/index.js";

const BATCH_SIZE = 100;

export class PineconeService implements IPineconeService {
  private indexRef: ReturnType<typeof getPineconeIndex> | null = null;

  constructor(index?: ReturnType<typeof getPineconeIndex>) {
    if (index) this.indexRef = index;
  }

  private getIndex() {
    this.indexRef ??= getPineconeIndex();
    return this.indexRef;
  }

  async upsertChunks(records: PineconeChunkRecord[]): Promise<void> {
    if (records.length === 0) return;

    const index = this.getIndex();
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await index.upsert({ records: batch });
    }
  }

  async deleteByItemId(itemId: string): Promise<void> {
    try {
      await this.getIndex().deleteMany({ filter: { itemId } });
    } catch {
      // Deletion fallback
    }
  }

  async querySimilar(
    vector: number[],
    topK: number = 5,
  ): Promise<PineconeMatch[]> {
    const index = this.getIndex();
    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    const matches: PineconeMatch[] = [];
    for (const match of queryResponse.matches ?? []) {
      const rawMetadata = match.metadata as unknown as {
        itemId?: string;
        chunkIndex?: number;
        text?: string;
        title?: string;
        sourceUrl?: string;
        sourceType?: "note" | "url";
      };

      if (!rawMetadata?.itemId || !rawMetadata?.text) continue;

      matches.push({
        id: match.id,
        score: match.score,
        metadata: {
          itemId: rawMetadata.itemId,
          chunkIndex: rawMetadata.chunkIndex ?? 0,
          text: rawMetadata.text,
          title: rawMetadata.title ?? "Untitled",
          sourceUrl: rawMetadata.sourceUrl ?? "",
          sourceType: rawMetadata.sourceType ?? "note",
        },
      });
    }

    return matches;
  }
}
