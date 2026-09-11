import type { ISparseEncoderService, SparseVector } from "../types/index.js";

const DEFAULT_STOPWORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren't",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can't",
  "cannot",
  "could",
  "couldn't",
  "did",
  "didn't",
  "do",
  "does",
  "doesn't",
  "doing",
  "don't",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "hadn't",
  "has",
  "hasn't",
  "have",
  "haven't",
  "having",
  "he",
  "he'd",
  "he'll",
  "he's",
  "her",
  "here",
  "here's",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "how's",
  "i",
  "i'd",
  "i'll",
  "i'm",
  "i've",
  "if",
  "in",
  "into",
  "is",
  "isn't",
  "it",
  "it's",
  "its",
  "itself",
  "let's",
  "me",
  "more",
  "most",
  "mustn't",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "ought",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "shan't",
  "she",
  "she'd",
  "she'll",
  "she's",
  "should",
  "shouldn't",
  "so",
  "some",
  "such",
  "than",
  "that",
  "that's",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "there's",
  "these",
  "they",
  "they'd",
  "they'll",
  "they're",
  "they've",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "wasn't",
  "we",
  "we'd",
  "we'll",
  "we're",
  "we've",
  "were",
  "weren't",
  "what",
  "what's",
  "when",
  "when's",
  "where",
  "where's",
  "which",
  "while",
  "who",
  "who's",
  "whom",
  "why",
  "why's",
  "with",
  "won't",
  "would",
  "wouldn't",
  "you",
  "you'd",
  "you'll",
  "you're",
  "you've",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

export class SparseEncoderService implements ISparseEncoderService {
  constructor(private readonly stopwords: Set<string> = DEFAULT_STOPWORDS) {}

  private hashToken(token: string): number {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const positive = (hash >>> 0) % 2147483647;
    return positive === 0 ? 1 : positive;
  }

  encodeText(text: string): SparseVector {
    if (!text || !text.trim()) {
      return { indices: [], values: [] };
    }

    const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) || [];

    const tfMap = new Map<string, number>();
    for (const token of tokens) {
      if (token.length <= 1 || this.stopwords.has(token)) continue;
      tfMap.set(token, (tfMap.get(token) ?? 0) + 1);
    }

    if (tfMap.size === 0) {
      for (const token of tokens) {
        if (token.length <= 1) continue;
        tfMap.set(token, (tfMap.get(token) ?? 0) + 1);
      }
    }

    if (tfMap.size === 0) {
      return { indices: [], values: [] };
    }

    const indexWeightMap = new Map<number, number>();
    for (const [token, count] of tfMap.entries()) {
      const index = this.hashToken(token);
      const weight = count / (count + 1.2);
      const existing = indexWeightMap.get(index) ?? 0;
      indexWeightMap.set(index, Math.max(existing, Number(weight.toFixed(4))));
    }

    const sortedEntries = Array.from(indexWeightMap.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    const magnitude = Math.sqrt(
      sortedEntries.reduce((sum, [, val]) => sum + val * val, 0),
    );

    return {
      indices: sortedEntries.map((e) => e[0]),
      values:
        magnitude > 0
          ? sortedEntries.map((e) => e[1] / magnitude)
          : sortedEntries.map((e) => e[1]),
    };
  }
}
