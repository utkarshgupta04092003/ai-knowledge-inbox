import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../docs/openapi.js";

export function createDocsRouter(): Router {
  const router = Router();

  router.get("/openapi.json", (_req: Request, res: Response) => {
    res.status(200).json(openApiSpec);
  });

  router.use("/", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "AI Knowledge Inbox - API Documentation",
  }));

  return router;
}

export default createDocsRouter();
