import { Router, Request, Response, NextFunction } from "express";
import { IngestionService } from "../services/ingestion.service.js";
import { ItemService } from "../services/item.service.js";
import type { IIngestionService } from "../types/index.js";

export function createItemsRouter(
  itemService: ItemService = new ItemService(),
  ingestionService: IIngestionService = new IngestionService(itemService),
): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await itemService.findAll();
      res.status(200).json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await itemService.findById(req.params.id);
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Item not found.",
          },
        });
        return;
      }
      res.status(200).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, content } = (req.body ?? {}) as { title?: unknown; content?: unknown };

      if (title === undefined && content === undefined) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "At least one of 'title' or 'content' must be provided.",
          },
        });
        return;
      }

      if (
        (title !== undefined && (typeof title !== "string" || !title.trim())) ||
        (content !== undefined && (typeof content !== "string" || !content.trim()))
      ) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Title and content must be non-empty strings.",
          },
        });
        return;
      }

      const updated = await ingestionService.updateNoteItem(req.params.id, {
        title: title as string | undefined,
        content: content as string | undefined,
      });

      res.status(200).json({ item: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await ingestionService.deleteItem(req.params.id);
      res.status(200).json({ success: true, message: "Item deleted successfully." });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createItemsRouter();

