import { getEncoding, Tiktoken } from "js-tiktoken";
import type { TextChunk, ChunkingOptions } from "../types/index.js";

export type { TextChunk, ChunkingOptions } from "../types/index.js";

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 128;
const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", " ", ""];

export class ChunkingService {
  private readonly maxTokens: number;
  private readonly overlapTokens: number;
  private readonly separators: string[];
  private readonly tokenizer: Tiktoken;

  constructor(options: ChunkingOptions = {}) {
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
    this.separators = options.separators ?? DEFAULT_SEPARATORS;
    this.tokenizer = getEncoding(options.encodingName ?? "cl100k_base");
  }

  countTokens(text: string): number {
    return this.tokenizer.encode(text).length;
  }

  chunkText(content: string): TextChunk[] {
    const trimmed = content.trim();
    if (!trimmed) return [];
    if (this.countTokens(trimmed) <= this.maxTokens) {
      return [{ chunkIndex: 0, text: trimmed }];
    }

    const segments = this.splitRecursive(trimmed, this.separators);
    const mergedChunks: string[] = [];
    let currentChunk = "";

    for (const segment of segments) {
      if (!currentChunk) {
        currentChunk = segment;
        continue;
      }

      const combined = `${currentChunk}${segment}`;
      if (this.countTokens(combined) <= this.maxTokens) {
        currentChunk = combined;
      } else {
        mergedChunks.push(currentChunk.trim());

        if (this.overlapTokens > 0) {
          const tokens = this.tokenizer.encode(currentChunk);
          if (tokens.length > this.overlapTokens) {
            const overlapSlice = tokens.slice(-this.overlapTokens);
            const overlapText = this.tokenizer.decode(overlapSlice);
            currentChunk = `${overlapText}${segment}`;
          } else {
            currentChunk = segment;
          }
        } else {
          currentChunk = segment;
        }
      }
    }

    if (currentChunk.trim()) {
      mergedChunks.push(currentChunk.trim());
    }

    return mergedChunks
      .filter((text) => text.length > 0)
      .map((text, chunkIndex) => ({ chunkIndex, text }));
  }

  private splitRecursive(text: string, separators: string[]): string[] {
    if (this.countTokens(text) <= this.maxTokens || separators.length === 0) {
      if (this.countTokens(text) <= this.maxTokens) return [text];
      const tokens = this.tokenizer.encode(text);
      const chunks: string[] = [];
      for (let i = 0; i < tokens.length; i += this.maxTokens) {
        chunks.push(this.tokenizer.decode(tokens.slice(i, i + this.maxTokens)));
      }
      return chunks;
    }

    const [currentSeparator, ...remainingSeparators] = separators;
    if (currentSeparator === "") {
      const tokens = this.tokenizer.encode(text);
      const chunks: string[] = [];
      for (let i = 0; i < tokens.length; i += this.maxTokens) {
        chunks.push(this.tokenizer.decode(tokens.slice(i, i + this.maxTokens)));
      }
      return chunks;
    }

    const parts = text.split(currentSeparator);
    const result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const partWithSeparator = isLast ? parts[i] : `${parts[i]}${currentSeparator}`;

      if (this.countTokens(partWithSeparator) <= this.maxTokens) {
        result.push(partWithSeparator);
      } else {
        const subParts = this.splitRecursive(partWithSeparator, remainingSeparators);
        result.push(...subParts);
      }
    }

    return result;
  }
}
