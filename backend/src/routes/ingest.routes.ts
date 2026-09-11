import { Router, Request, Response, NextFunction } from "express";
import { IngestionService } from "../services/ingestion.service.js";

export function createIngestRouter(
  customIngestionService?: IngestionService,
): Router {
  const router = Router();
  let defaultService: IngestionService | null = null;

  router.post(
    "/",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const service =
          customIngestionService ?? (defaultService ??= new IngestionService());
        const result = await service.ingest(req.body);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export default createIngestRouter();
