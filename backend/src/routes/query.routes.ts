import { Router, Request, Response, NextFunction } from "express";
import { RagService } from "../services/rag.service.js";
import { AppError } from "../middleware/error.middleware.js";

export function createQueryRouter(customRagService?: RagService): Router {
  const router = Router();
  let defaultService: RagService | null = null;

  router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawQuestion = req.body?.question;
      if (typeof rawQuestion !== "string" || !rawQuestion.trim()) {
        throw new AppError(400, "INVALID_INPUT", "Property 'question' must be a non-empty string.");
      }

      const trimmedQuestion = rawQuestion.trim();
      if (trimmedQuestion.length > 1000) {
        throw new AppError(400, "INVALID_INPUT", "Question exceeds maximum limit of 1000 characters.");
      }

      const service = customRagService ?? (defaultService ??= new RagService());
      const result = await service.answerQuestion(trimmedQuestion);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createQueryRouter();
