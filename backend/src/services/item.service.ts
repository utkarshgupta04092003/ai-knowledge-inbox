import type { Item as PrismaItem, PrismaClient } from "../generated/prisma/client.js";
import { getPrismaClient } from "../db/prisma.js";
import type { CreateItemInput, Item, UpdateItemInput } from "../types/index.js";

function toItem(item: PrismaItem): Item {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export class ItemService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async create(input: CreateItemInput): Promise<Item> {
    const item = await this.prisma.item.create({
      data: {
        id: input.id,
        sourceType: input.sourceType,
        title: input.title,
        content: input.content,
        sourceUrl: input.sourceUrl,
      },
    });

    return toItem(item);
  }

  async findAll(): Promise<Item[]> {
    const items = await this.prisma.item.findMany({ orderBy: { createdAt: "desc" } });
    return items.map(toItem);
  }

  async findById(id: string): Promise<Item | null> {
    const item = await this.prisma.item.findUnique({ where: { id } });
    return item ? toItem(item) : null;
  }

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const item = await this.prisma.item.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
      },
    });

    return toItem(item);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.item.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
