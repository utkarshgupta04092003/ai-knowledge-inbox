import { NextFunction, Request, Response, Router } from "express";
import { getEncoding, Tiktoken } from "js-tiktoken";
import { AppError } from "../middleware/error.middleware.js";
import { RagService } from "../services/rag.service.js";
import { SessionService } from "../services/session.service.js";
import type { ConversationTurn } from "../types/index.js";
import { logger } from "../utils/logger.js";

let tokenizer: Tiktoken | null = null;
function getTokenizer(): Tiktoken {
  tokenizer ??= getEncoding("cl100k_base");
  return tokenizer;
}

export function createQueryRouter(
  customRagService?: RagService,
  customSessionService?: SessionService,
): Router {
  const router = Router();
  let defaultRagService: RagService | null = null;
  let defaultSessionService: SessionService | null = null;

  router.post(
    "/",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const rawQuestion = req.body?.question;
        if (typeof rawQuestion !== "string" || !rawQuestion.trim()) {
          throw new AppError(
            400,
            "INVALID_INPUT",
            "Property 'question' must be a non-empty string.",
          );
        }

        const trimmedQuestion = rawQuestion.trim();
        if (trimmedQuestion.length > 1000) {
          throw new AppError(
            400,
            "INVALID_INPUT",
            "Question exceeds maximum limit of 1000 characters.",
          );
        }

        const ragService =
          customRagService ?? (defaultRagService ??= new RagService());
        const sessionService =
          customSessionService ??
          (defaultSessionService ??= new SessionService());

        let sessionId =
          typeof req.body?.sessionId === "string"
            ? req.body.sessionId.trim()
            : "";

        if (sessionId) {
          const existingSession =
            await sessionService.getSessionById(sessionId);
          if (!existingSession) {
            const titleSnippet =
              trimmedQuestion.length > 40
                ? `${trimmedQuestion.slice(0, 37)}...`
                : trimmedQuestion;
            const newSession = await sessionService.createSession(titleSnippet);
            sessionId = newSession.id;
          }
        } else {
          const titleSnippet =
            trimmedQuestion.length > 40
              ? `${trimmedQuestion.slice(0, 37)}...`
              : trimmedQuestion;
          const newSession = await sessionService.createSession(titleSnippet);
          sessionId = newSession.id;
        }

        const lastTurns = await sessionService.getLastTurns(sessionId, 5);
        const history: ConversationTurn[] = lastTurns.map((turn) => ({
          question: turn.question,
          answer: turn.answer,
        }));

        const isStream =
          req.body?.stream === true ||
          Boolean(req.headers.accept?.includes("text/event-stream"));

        if (isStream) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });

          const sendEvent = (event: string, data: unknown) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          };

          sendEvent("session", { sessionId });

          logger.info("http_query_stream_received", {
            question: trimmedQuestion,
            sessionId,
          });

          const result = ragService.answerQuestionStream
            ? await ragService.answerQuestionStream(
                trimmedQuestion,
                {
                  onStatus: (status) => sendEvent("status", status),
                  onSources: (sources) => sendEvent("sources", { sources }),
                  onToken: (token) => sendEvent("delta", { delta: token }),
                },
                history,
              )
            : await ragService.answerQuestion(trimmedQuestion, history);

          const enc = getTokenizer();
          const historyTokens = history.reduce(
            (sum, turn) =>
              sum +
              enc.encode(turn.question).length +
              enc.encode(turn.answer).length,
            0,
          );
          const promptTokens =
            enc.encode(trimmedQuestion).length + historyTokens;
          const completionTokens = enc.encode(result.answer).length;
          const totalTokens = promptTokens + completionTokens;

          const turn = await sessionService.addTurn(sessionId, {
            question: trimmedQuestion,
            answer: result.answer,
            sources: result.sources,
            iterations: result.iterations,
            isFallback: result.isFallback,
            promptTokens,
            completionTokens,
            totalTokens,
          });

          logger.info("http_query_stream_completed", {
            question: trimmedQuestion,
            sessionId,
            turnId: turn.id,
            promptTokens,
            completionTokens,
          });

          sendEvent("done", {
            ...result,
            sessionId,
            turnId: turn.id,
            promptTokens,
            completionTokens,
            totalTokens,
          });

          res.end();
          return;
        }

        logger.info("http_query_received", {
          question: trimmedQuestion,
          sessionId,
        });
        const result = await ragService.answerQuestion(trimmedQuestion, history);

        const enc = getTokenizer();
        const historyTokens = history.reduce(
          (sum, turn) =>
            sum +
            enc.encode(turn.question).length +
            enc.encode(turn.answer).length,
          0,
        );
        const promptTokens = enc.encode(trimmedQuestion).length + historyTokens;
        const completionTokens = enc.encode(result.answer).length;
        const totalTokens = promptTokens + completionTokens;

        const turn = await sessionService.addTurn(sessionId, {
          question: trimmedQuestion,
          answer: result.answer,
          sources: result.sources,
          iterations: result.iterations,
          isFallback: result.isFallback,
          promptTokens,
          completionTokens,
          totalTokens,
        });

        logger.info("http_query_completed", {
          question: trimmedQuestion,
          sessionId,
          turnId: turn.id,
          iterations: result.iterations,
          sourcesCount: result.sources.length,
          promptTokens,
          completionTokens,
        });

        res.status(200).json({
          ...result,
          sessionId,
          turnId: turn.id,
          promptTokens,
          completionTokens,
          totalTokens,
        });
      } catch (error) {
        if (res.headersSent) {
          res.write(
            `event: error\ndata: ${JSON.stringify({
              message:
                error instanceof Error ? error.message : "Query execution failed.",
            })}\n\n`,
          );
          res.end();
          return;
        }
        next(error);
      }
    },
  );

  return router;
}

export default createQueryRouter();
