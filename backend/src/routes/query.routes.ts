import { NextFunction, Request, Response, Router } from "express";
import { getEncoding, Tiktoken } from "js-tiktoken";
import { AppError } from "../middleware/error.middleware.js";
import { RagService } from "../services/rag.service.js";
import { SessionService } from "../services/session.service.js";
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

        logger.info("http_query_received", {
          question: trimmedQuestion,
          sessionId,
        });
        const result = await ragService.answerQuestion(trimmedQuestion);

        const enc = getTokenizer();
        const promptTokens = enc.encode(trimmedQuestion).length;
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
        next(error);
      }
    },
  );

  return router;
}

export default createQueryRouter();
