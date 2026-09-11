import { NextFunction, Request, Response, Router } from "express";
import { AppError } from "../middleware/error.middleware.js";
import { SessionService } from "../services/session.service.js";

export function createSessionsRouter(
  sessionService: SessionService = new SessionService(),
): Router {
  const router = Router();

  router.get(
    "/",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessions = await sessionService.listSessions();
        res.status(200).json({ sessions });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const title =
          typeof req.body?.title === "string"
            ? req.body.title.trim()
            : undefined;
        const session = await sessionService.createSession(title);
        res.status(201).json(session);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const session = await sessionService.getSessionById(req.params.id);
        if (!session) {
          throw new AppError(404, "NOT_FOUND", "Session not found.");
        }
        res.status(200).json(session);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const title = req.body?.title;
        if (typeof title !== "string" || !title.trim()) {
          throw new AppError(
            400,
            "INVALID_INPUT",
            "Property 'title' must be a non-empty string.",
          );
        }
        const session = await sessionService.updateSessionTitle(
          req.params.id,
          title,
        );
        res.status(200).json(session);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await sessionService.deleteSession(req.params.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export default createSessionsRouter();
