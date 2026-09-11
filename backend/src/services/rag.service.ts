import OpenAI from "openai";
import { getAiClient, getChatModel } from "../config/ai.js";
import {
  FALLBACK_MESSAGE,
  RAG_SYSTEM_PROMPT,
  RETRIEVAL_GRADING_SYSTEM_PROMPT,
  QUERY_REWRITE_SYSTEM_PROMPT,
  ANSWER_GRADING_SYSTEM_PROMPT,
  formatRagUserPrompt,
  formatRetrievalGradingPrompt,
  formatQueryRewritePrompt,
  formatAnswerGradingPrompt,
} from "../config/prompts.js";
import { SearchService } from "./search.service.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  SourceCitation,
  RagResponse,
  ILlmClient,
  SearchResult,
} from "../types/index.js";

export type {
  SourceCitation,
  RagResponse,
  ILlmClient,
} from "../types/index.js";

export class OpenAiLlmClient implements ILlmClient {
  private client: OpenAI | null = null;
  private readonly model: string;

  constructor(client?: OpenAI, model?: string) {
    if (client) this.client = client;
    this.model = model ?? getChatModel();
  }

  private getClient(): OpenAI {
    this.client ??= getAiClient();
    return this.client;
  }

  async generateAnswer(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  async gradeRetrieval(question: string, context: string): Promise<boolean> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0,
      messages: [
        { role: "system", content: RETRIEVAL_GRADING_SYSTEM_PROMPT },
        {
          role: "user",
          content: formatRetrievalGradingPrompt(question, context),
        },
      ],
    });

    const reply =
      response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
    return reply.includes("YES");
  }

  async rewriteQuery(
    originalQuestion: string,
    attempt: number,
    pastQueries: string[],
  ): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: QUERY_REWRITE_SYSTEM_PROMPT },
        {
          role: "user",
          content: formatQueryRewritePrompt(
            originalQuestion,
            attempt,
            pastQueries,
          ),
        },
      ],
    });

    const rewritten = response.choices[0]?.message?.content?.trim() ?? "";
    return rewritten || originalQuestion;
  }

  async gradeAnswer(
    question: string,
    answer: string,
    context: string,
  ): Promise<boolean> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0,
      messages: [
        { role: "system", content: ANSWER_GRADING_SYSTEM_PROMPT },
        {
          role: "user",
          content: formatAnswerGradingPrompt(question, answer, context),
        },
      ],
    });

    const reply =
      response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
    return reply.includes("YES");
  }
}

const DEFAULT_MAX_ITERATIONS = 3;

export class RagService {
  constructor(
    private readonly searchService: SearchService = new SearchService(),
    private readonly llmClient: ILlmClient = new OpenAiLlmClient(),
    private readonly maxIterations: number = DEFAULT_MAX_ITERATIONS,
  ) {}

  async answerQuestion(question: string): Promise<RagResponse> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new AppError(400, "INVALID_INPUT", "Question cannot be empty.");
    }

    let currentQuery = trimmed;
    const pastQueries: string[] = [trimmed];
    let bestAnswer = "";
    let bestSources: SourceCitation[] = [];

    try {
      for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
        const matches: SearchResult[] = await this.searchService.search(
          currentQuery,
          { topK: 5 },
        );

        if (matches.length === 0) {
          if (iteration < this.maxIterations) {
            currentQuery = await this.llmClient.rewriteQuery(
              trimmed,
              iteration,
              pastQueries,
            );
            pastQueries.push(currentQuery);
            continue;
          }

          if (bestSources.length === 0) {
            return {
              answer: FALLBACK_MESSAGE,
              sources: [],
              iterations: iteration,
              reformulatedQueries: pastQueries.slice(1),
            };
          }
        }

        const contextText = matches
          .map(
            (match, idx) =>
              `[Source ${idx + 1}: ${match.title}]\n${match.text}`,
          )
          .join("\n\n---\n\n");

        const isRelevant =
          matches.length > 0
            ? await this.llmClient.gradeRetrieval(trimmed, contextText)
            : false;

        if (!isRelevant && iteration < this.maxIterations) {
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
          );
          pastQueries.push(currentQuery);
          continue;
        }

        if (matches.length > 0) {
          const currentSources: SourceCitation[] = matches.map((match) => ({
            itemId: match.itemId,
            title: match.title,
            url: match.url,
            snippet:
              match.text.length > 250
                ? `${match.text.slice(0, 250)}...`
                : match.text,
          }));

          const userPrompt = formatRagUserPrompt(trimmed, contextText);
          const candidateAnswer = await this.llmClient.generateAnswer(
            RAG_SYSTEM_PROMPT,
            userPrompt,
          );

          if (candidateAnswer && candidateAnswer !== FALLBACK_MESSAGE) {
            const isGrounded = await this.llmClient.gradeAnswer(
              trimmed,
              candidateAnswer,
              contextText,
            );

            if (isGrounded) {
              return {
                answer: candidateAnswer,
                sources: currentSources,
                iterations: iteration,
                reformulatedQueries: pastQueries.slice(1),
              };
            }

            if (!bestAnswer) {
              bestAnswer = candidateAnswer;
              bestSources = currentSources;
            }
          }
        }

        if (iteration < this.maxIterations) {
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
          );
          pastQueries.push(currentQuery);
        }
      }

      return {
        answer: bestAnswer || FALLBACK_MESSAGE,
        sources: bestSources,
        iterations: this.maxIterations,
        reformulatedQueries: pastQueries.slice(1),
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error
          ? error.message
          : "Self-RAG loop execution failed.";
      throw new AppError(
        502,
        "UPSTREAM_ERROR",
        `Failed to generate answer from language model: ${message}`,
      );
    }
  }
}
