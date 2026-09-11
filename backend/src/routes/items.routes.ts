import { Router, Request, Response, NextFunction } from "express";
import { ItemService } from "../services/item.service.js";

export function createItemsRouter(itemService: ItemService = new ItemService()): Router {
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

  return router;
}

export default createItemsRouter();
