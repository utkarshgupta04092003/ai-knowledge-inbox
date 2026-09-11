import OpenAI from "openai";
import { getAiClient, getChatModel } from "../config/ai.js";
import {
  ANSWER_GRADING_SYSTEM_PROMPT,
  FALLBACK_MESSAGES,
  QUERY_REWRITE_SYSTEM_PROMPT,
  RAG_SYSTEM_PROMPT,
  RETRIEVAL_GRADING_SYSTEM_PROMPT,
} from "../config/prompts.js";
import {
  formatAnswerGradingPrompt,
  formatQueryRewritePrompt,
  formatRagUserPrompt,
  formatRetrievalGradingPrompt,
  getRandomFallbackMessage,
} from "../utils/prompt.utils.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  ConversationTurn,
  ILlmClient,
  RagResponse,
  SearchResult,
  SourceCitation,
  StreamCallbacks,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { SearchService } from "./search.service.js";

export type {
  ConversationTurn,
  ILlmClient,
  RagResponse,
  SourceCitation,
  StreamCallbacks,
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
    history?: ConversationTurn[],
  ): Promise<string> {
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      history && history.length > 0
        ? history.flatMap((turn) => [
            { role: "user" as const, content: turn.question },
            { role: "assistant" as const, content: turn.answer },
          ])
        : [];

    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  async generateAnswerStream(
    systemPrompt: string,
    userPrompt: string,
    onDelta: (chunk: string) => void,
    history?: ConversationTurn[],
  ): Promise<string> {
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      history && history.length > 0
        ? history.flatMap((turn) => [
            { role: "user" as const, content: turn.question },
            { role: "assistant" as const, content: turn.answer },
          ])
        : [];

    const stream = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userPrompt },
      ],
    });

    let fullAnswer = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullAnswer += delta;
        onDelta(delta);
      }
    }

    return fullAnswer.trim();
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
    history?: ConversationTurn[],
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
            history,
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

  async answerQuestion(
    question: string,
    history?: ConversationTurn[],
  ): Promise<RagResponse> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new AppError(400, "INVALID_INPUT", "Question cannot be empty.");
    }

    logger.info("rag_pipeline_start", {
      question: trimmed,
      maxIterations: this.maxIterations,
    });

    let currentQuery = trimmed;
    const pastQueries: string[] = [trimmed];
    let bestAnswer = "";
    let bestSources: SourceCitation[] = [];

    try {
      for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
        logger.info("rag_iteration_start", {
          iteration,
          maxIterations: this.maxIterations,
          query: currentQuery,
        });

        const matches: SearchResult[] = await this.searchService.search(
          currentQuery,
          { topK: 5 },
        );

        logger.info("rag_retrieval_matches", {
          iteration,
          query: currentQuery,
          matchesFound: matches.length,
          matches: matches.map((m) => ({
            itemId: m.itemId,
            title: m.title,
            score: m.score,
            chunkId: m.chunkId,
            snippet: m.text.slice(0, 100),
          })),
        });

        if (matches.length === 0) {
          logger.warn("rag_retrieval_empty", {
            iteration,
            query: currentQuery,
          });

          if (iteration < this.maxIterations) {
            logger.info("rag_rewrite_query_start", {
              iteration,
              attempt: iteration,
              pastQueries,
            });
            currentQuery = await this.llmClient.rewriteQuery(
              trimmed,
              iteration,
              pastQueries,
              history,
            );
            pastQueries.push(currentQuery);
            logger.info("rag_rewrite_query_result", {
              iteration,
              newQuery: currentQuery,
            });
            continue;
          }

          if (bestSources.length === 0) {
            const fallbackMessage = getRandomFallbackMessage();
            logger.info("rag_fallback_denial_selected", {
              iteration,
              reason: "Zero vector matches across all iterations",
              fallbackMessage,
            });
            return {
              answer: fallbackMessage,
              sources: [],
              iterations: iteration,
              reformulatedQueries: pastQueries.slice(1),
              isFallback: true,
            };
          }
        }

        const contextText = matches
          .map(
            (match, idx) =>
              `[Source ${idx + 1}: ${match.title}]\n${match.text}`,
          )
          .join("\n\n---\n\n");

        logger.info("rag_grade_retrieval_start", {
          iteration,
          question: trimmed,
          contextLength: contextText.length,
        });

        const isRelevant =
          matches.length > 0
            ? await this.llmClient.gradeRetrieval(trimmed, contextText)
            : false;

        logger.info("rag_grade_retrieval_result", {
          iteration,
          isRelevant,
        });

        if (!isRelevant && iteration < this.maxIterations) {
          logger.info("rag_rewrite_query_start", {
            iteration,
            reason: "Retrieved context deemed not relevant by LLM evaluator",
            pastQueries,
          });
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
            history,
          );
          pastQueries.push(currentQuery);
          logger.info("rag_rewrite_query_result", {
            iteration,
            newQuery: currentQuery,
          });
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
            score: match.score,
          }));

          const userPrompt = formatRagUserPrompt(trimmed, contextText);
          logger.info("rag_generate_answer_start", {
            iteration,
            sourcesCount: currentSources.length,
          });

          const candidateAnswer = await this.llmClient.generateAnswer(
            RAG_SYSTEM_PROMPT,
            userPrompt,
            history,
          );

          logger.info("rag_generate_answer_result", {
            iteration,
            answerLength: candidateAnswer.length,
            preview: candidateAnswer.slice(0, 120),
          });

          if (
            candidateAnswer &&
            !FALLBACK_MESSAGES.some((msg) => candidateAnswer.includes(msg))
          ) {
            logger.info("rag_grade_groundedness_start", { iteration });
            const isGrounded = await this.llmClient.gradeAnswer(
              trimmed,
              candidateAnswer,
              contextText,
            );
            logger.info("rag_grade_groundedness_result", {
              iteration,
              isGrounded,
            });

            if (isGrounded) {
              logger.info("rag_pipeline_success", {
                iteration,
                answerLength: candidateAnswer.length,
                sourcesCount: currentSources.length,
                reformulations: pastQueries.slice(1),
              });
              return {
                answer: candidateAnswer,
                sources: currentSources,
                iterations: iteration,
                reformulatedQueries: pastQueries.slice(1),
                isFallback: false,
              };
            }

            if (!bestAnswer) {
              bestAnswer = candidateAnswer;
              bestSources = currentSources;
            }
          }
        }

        if (iteration < this.maxIterations) {
          logger.info("rag_rewrite_query_start", {
            iteration,
            reason: "Grounding check failed or candidate insufficient",
            pastQueries,
          });
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
            history,
          );
          pastQueries.push(currentQuery);
          logger.info("rag_rewrite_query_result", {
            iteration,
            newQuery: currentQuery,
          });
        }
      }

      const finalFallback = bestAnswer || getRandomFallbackMessage();
      logger.warn("rag_pipeline_fallback", {
        iterations: this.maxIterations,
        hasBestAnswer: Boolean(bestAnswer),
        finalAnswerPreview: finalFallback.slice(0, 100),
        sourcesCount: bestSources.length,
      });

      return {
        answer: finalFallback,
        sources: bestSources,
        iterations: this.maxIterations,
        reformulatedQueries: pastQueries.slice(1),
        isFallback: !bestAnswer || bestSources.length === 0,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error
          ? error.message
          : "Self-RAG loop execution failed.";
      logger.error("rag_pipeline_error", { error: message });
      throw new AppError(
        502,
        "UPSTREAM_ERROR",
        `Failed to generate answer from language model: ${message}`,
      );
    }
  }

  async answerQuestionStream(
    question: string,
    callbacks?: StreamCallbacks,
    history?: ConversationTurn[],
  ): Promise<RagResponse> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new AppError(400, "INVALID_INPUT", "Question cannot be empty.");
    }

    logger.info("rag_pipeline_stream_start", {
      question: trimmed,
      maxIterations: this.maxIterations,
    });

    let currentQuery = trimmed;
    const pastQueries: string[] = [trimmed];
    let bestAnswer = "";
    let bestSources: SourceCitation[] = [];

    try {
      for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
        callbacks?.onStatus?.({
          stage: "searching",
          message:
            iteration === 1
              ? "Searching knowledge inbox..."
              : `Reformulating query and searching again (attempt ${iteration}/${this.maxIterations})...`,
          iteration,
        });

        logger.info("rag_iteration_start", {
          iteration,
          maxIterations: this.maxIterations,
          query: currentQuery,
        });

        const matches: SearchResult[] = await this.searchService.search(
          currentQuery,
          { topK: 5 },
        );

        logger.info("rag_retrieval_matches", {
          iteration,
          query: currentQuery,
          matchesFound: matches.length,
          matches: matches.map((m) => ({
            itemId: m.itemId,
            title: m.title,
            score: m.score,
            chunkId: m.chunkId,
            snippet: m.text.slice(0, 100),
          })),
        });

        if (matches.length === 0) {
          logger.warn("rag_retrieval_empty", {
            iteration,
            query: currentQuery,
          });

          if (iteration < this.maxIterations) {
            callbacks?.onStatus?.({
              stage: "rewriting",
              message: "No direct matches found; rewriting query...",
              iteration,
            });

            currentQuery = await this.llmClient.rewriteQuery(
              trimmed,
              iteration,
              pastQueries,
              history,
            );
            pastQueries.push(currentQuery);
            continue;
          }

          if (bestSources.length === 0) {
            const fallbackMessage = getRandomFallbackMessage();
            callbacks?.onToken?.(fallbackMessage);
            return {
              answer: fallbackMessage,
              sources: [],
              iterations: iteration,
              reformulatedQueries: pastQueries.slice(1),
              isFallback: true,
            };
          }
        }

        const contextText = matches
          .map(
            (match, idx) =>
              `[Source ${idx + 1}: ${match.title}]\n${match.text}`,
          )
          .join("\n\n---\n\n");

        callbacks?.onStatus?.({
          stage: "grading_retrieval",
          message: "Evaluating retrieved context relevance...",
          iteration,
        });

        const isRelevant =
          matches.length > 0
            ? await this.llmClient.gradeRetrieval(trimmed, contextText)
            : false;

        if (!isRelevant && iteration < this.maxIterations) {
          callbacks?.onStatus?.({
            stage: "rewriting",
            message: "Context not sufficiently relevant; rewriting query...",
            iteration,
          });
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
            history,
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
            score: match.score,
          }));

          callbacks?.onSources?.(currentSources);
          callbacks?.onStatus?.({
            stage: "generating",
            message: "Generating grounded response...",
            iteration,
          });

          const userPrompt = formatRagUserPrompt(trimmed, contextText);

          let candidateAnswer = "";
          if (this.llmClient.generateAnswerStream) {
            candidateAnswer = await this.llmClient.generateAnswerStream(
              RAG_SYSTEM_PROMPT,
              userPrompt,
              (chunk) => callbacks?.onToken?.(chunk),
              history,
            );
          } else {
            candidateAnswer = await this.llmClient.generateAnswer(
              RAG_SYSTEM_PROMPT,
              userPrompt,
              history,
            );
            callbacks?.onToken?.(candidateAnswer);
          }

          if (
            candidateAnswer &&
            !FALLBACK_MESSAGES.some((msg) => candidateAnswer.includes(msg))
          ) {
            return {
              answer: candidateAnswer,
              sources: currentSources,
              iterations: iteration,
              reformulatedQueries: pastQueries.slice(1),
              isFallback: false,
            };
          }

          if (!bestAnswer) {
            bestAnswer = candidateAnswer;
            bestSources = currentSources;
          }
        }

        if (iteration < this.maxIterations) {
          currentQuery = await this.llmClient.rewriteQuery(
            trimmed,
            iteration,
            pastQueries,
            history,
          );
          pastQueries.push(currentQuery);
        }
      }

      const finalFallback = bestAnswer || getRandomFallbackMessage();
      if (!bestAnswer) {
        callbacks?.onToken?.(finalFallback);
      }
      return {
        answer: finalFallback,
        sources: bestSources,
        iterations: this.maxIterations,
        reformulatedQueries: pastQueries.slice(1),
        isFallback: !bestAnswer || bestSources.length === 0,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error
          ? error.message
          : "Self-RAG loop streaming execution failed.";
      logger.error("rag_pipeline_stream_error", { error: message });
      throw new AppError(
        502,
        "UPSTREAM_ERROR",
        `Failed to generate answer from language model: ${message}`,
      );
    }
  }
}
