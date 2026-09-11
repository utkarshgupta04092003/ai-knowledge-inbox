import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RagService, ILlmClient } from "./rag.service.js";
import { SearchService } from "./search.service.js";
import { AppError } from "../middleware/error.middleware.js";
import type { SearchResult } from "../types/index.js";

describe("RagService (Self-RAG Loop)", () => {
  const dummySearchResult: SearchResult = {
    chunkId: "doc1#0",
    score: 0.9,
    itemId: "doc1",
    title: "Vite and React",
    url: "https://vitejs.dev",
    text: "Vite provides fast HMR and optimized builds.",
    chunkIndex: 0,
    sourceType: "url",
  };

  it("exits on iteration 1 when retrieval is relevant and answer is grounded", async () => {
    const mockLlm: ILlmClient = {
      async generateAnswer(): Promise<string> {
        return "Vite provides fast HMR and optimized builds [Source 1].";
      },
      async gradeRetrieval(): Promise<boolean> {
        return true;
      },
      async rewriteQuery(): Promise<string> {
        return "rewritten";
      },
      async gradeAnswer(): Promise<boolean> {
        return true;
      },
    };

    const mockSearchService = {
      async search(): Promise<SearchResult[]> {
        return [dummySearchResult];
      },
    } as unknown as SearchService;

    const ragService = new RagService(mockSearchService, mockLlm, 3);
    const result = await ragService.answerQuestion("What is Vite?");

    assert.equal(result.iterations, 1);
    assert.deepEqual(result.reformulatedQueries, []);
    assert.equal(result.answer, "Vite provides fast HMR and optimized builds [Source 1].");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].title, "Vite and React");
  });

  it("rewrites query on iteration 1 when retrieval is irrelevant and succeeds on iteration 2", async () => {
    const queriesSearched: string[] = [];
    const rewrittenQueries: string[] = [];

    const secondMatch: SearchResult = {
      chunkId: "doc2#0",
      score: 0.88,
      itemId: "doc2",
      title: "React Architecture",
      url: "https://react.dev",
      text: "React components manage local and global UI state.",
      chunkIndex: 0,
      sourceType: "url",
    };

    const mockSearchService = {
      async search(query: string): Promise<SearchResult[]> {
        queriesSearched.push(query);
        if (query === "How does React state work?") {
          return [dummySearchResult]; // Irrelevant match on attempt 1
        }
        return [secondMatch]; // Relevant match on attempt 2
      },
    } as unknown as SearchService;

    const mockLlm: ILlmClient = {
      async gradeRetrieval(question, context): Promise<boolean> {
        return context.includes("React components manage local");
      },
      async rewriteQuery(orig, attempt): Promise<string> {
        const rewritten = `React state management concepts attempt ${attempt}`;
        rewrittenQueries.push(rewritten);
        return rewritten;
      },
      async generateAnswer(): Promise<string> {
        return "React components manage state internally [Source 1].";
      },
      async gradeAnswer(): Promise<boolean> {
        return true;
      },
    };

    const ragService = new RagService(mockSearchService, mockLlm, 3);
    const result = await ragService.answerQuestion("How does React state work?");

    assert.equal(result.iterations, 2);
    assert.deepEqual(result.reformulatedQueries, rewrittenQueries);
    assert.equal(queriesSearched.length, 2);
    assert.equal(result.sources[0].title, "React Architecture");
    assert.equal(result.answer, "React components manage state internally [Source 1].");
  });

  it("exhausts 3 iterations and returns fallback disclaimer when no context matches", async () => {
    let rewriteCalls = 0;

    const mockSearchService = {
      async search(): Promise<SearchResult[]> {
        return [];
      },
    } as unknown as SearchService;

    const mockLlm: ILlmClient = {
      async generateAnswer(): Promise<string> {
        return "Should not be called";
      },
      async gradeRetrieval(): Promise<boolean> {
        return false;
      },
      async rewriteQuery(orig, attempt): Promise<string> {
        rewriteCalls++;
        return `reformulated attempt ${attempt}`;
      },
      async gradeAnswer(): Promise<boolean> {
        return false;
      },
    };

    const ragService = new RagService(mockSearchService, mockLlm, 3);
    const result = await ragService.answerQuestion("Unknown quantum physics theorem");

    assert.equal(result.iterations, 3);
    assert.equal(rewriteCalls, 2); // Rewritten between iter 1->2 and 2->3
    assert.match(result.answer, /don't have enough information/i);
    assert.deepEqual(result.sources, []);
  });

  it("retries when candidate answer fails groundedness check (anti-hallucination)", async () => {
    let gradeAnswerAttempts = 0;

    const mockSearchService = {
      async search(): Promise<SearchResult[]> {
        return [dummySearchResult];
      },
    } as unknown as SearchService;

    const mockLlm: ILlmClient = {
      async gradeRetrieval(): Promise<boolean> {
        return true;
      },
      async rewriteQuery(): Promise<string> {
        return "Vite build tools and bundlers";
      },
      async generateAnswer(): Promise<string> {
        return "Vite is an ultra fast web builder [Source 1].";
      },
      async gradeAnswer(): Promise<boolean> {
        gradeAnswerAttempts++;
        return gradeAnswerAttempts > 1; // Fails on attempt 1, passes on attempt 2
      },
    };

    const ragService = new RagService(mockSearchService, mockLlm, 3);
    const result = await ragService.answerQuestion("What is Vite?");

    assert.equal(result.iterations, 2);
    assert.equal(gradeAnswerAttempts, 2);
    assert.equal(result.answer, "Vite is an ultra fast web builder [Source 1].");
  });

  it("rejects empty question with 400 INVALID_INPUT", async () => {
    const ragService = new RagService({} as SearchService, {} as ILlmClient);
    await assert.rejects(
      () => ragService.answerQuestion("   "),
      (err: unknown) => err instanceof AppError && err.statusCode === 400,
    );
  });
});
