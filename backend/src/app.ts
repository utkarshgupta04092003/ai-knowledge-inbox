import express, { Application, Request, Response } from "express";
import cors from "cors";
import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/health", healthRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested route does not exist."
      }
    });
  });

  app.use(errorHandler);

  return app;
}
