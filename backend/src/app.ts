import cors from "cors";
import express, { Application, Request, Response } from "express";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";
import docsRoutes from "./routes/docs.routes.js";
import healthRoutes from "./routes/health.routes.js";
import ingestRoutes from "./routes/ingest.routes.js";
import itemsRoutes from "./routes/items.routes.js";
import queryRoutes from "./routes/query.routes.js";

export interface AppOptions {
  ingestRouter?: express.Router;
  itemsRouter?: express.Router;
  queryRouter?: express.Router;
  docsRouter?: express.Router;
}

export function createApp(options: AppOptions = {}): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/health", healthRoutes);
  app.use("/api-docs", options.docsRouter ?? docsRoutes);
  app.use("/ingest", options.ingestRouter ?? ingestRoutes);
  app.use("/items", options.itemsRouter ?? itemsRoutes);
  app.use("/query", options.queryRouter ?? queryRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested route does not exist.",
      },
    });
  });

  app.use(errorHandler);

  return app;
}
