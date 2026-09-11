import { getPrismaClient } from "../db/prisma.js";
import type {
  ChatSession as PrismaChatSession,
  ChatTurn as PrismaChatTurn,
  PrismaClient,
} from "../generated/prisma/client.js";
import type {
  ChatSessionDetail,
  ChatSessionSummary,
  ChatTurnData,
  CreateTurnInput,
  SourceCitation,
} from "../types/index.js";

function parseSources(raw: string | null): SourceCitation[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toTurnData(turn: PrismaChatTurn): ChatTurnData {
  return {
    id: turn.id,
    sessionId: turn.sessionId,
    question: turn.question,
    answer: turn.answer,
    sources: parseSources(turn.sources),
    iterations: turn.iterations,
    isFallback: turn.isFallback,
    promptTokens: turn.promptTokens,
    completionTokens: turn.completionTokens,
    totalTokens: turn.totalTokens,
    createdAt: turn.createdAt.toISOString(),
  };
}

function toSessionSummary(
  session: PrismaChatSession & { _count?: { turns: number } },
): ChatSessionSummary {
  return {
    id: session.id,
    title: session.title,
    turnCount: session._count?.turns ?? 0,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export class SessionService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createSession(title?: string): Promise<ChatSessionSummary> {
    const session = await this.prisma.chatSession.create({
      data: {
        title: title?.trim() || "New Conversation",
      },
      include: {
        _count: {
          select: { turns: true },
        },
      },
    });

    return toSessionSummary(session);
  }

  async listSessions(): Promise<ChatSessionSummary[]> {
    const sessions = await this.prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { turns: true },
        },
      },
    });

    return sessions.map(toSessionSummary);
  }

  async getSessionById(id: string): Promise<ChatSessionDetail | null> {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        turns: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) return null;

    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      turns: session.turns.map(toTurnData),
    };
  }

  async updateSessionTitle(
    id: string,
    title: string,
  ): Promise<ChatSessionSummary> {
    const session = await this.prisma.chatSession.update({
      where: { id },
      data: { title: title.trim() },
      include: {
        _count: {
          select: { turns: true },
        },
      },
    });

    return toSessionSummary(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.prisma.chatSession.delete({
      where: { id },
    });
  }

  async getTurnCount(sessionId: string): Promise<number> {
    return this.prisma.chatTurn.count({
      where: { sessionId },
    });
  }

  async addTurn(
    sessionId: string,
    data: CreateTurnInput,
  ): Promise<ChatTurnData> {
    const turn = await this.prisma.chatTurn.create({
      data: {
        sessionId,
        question: data.question,
        answer: data.answer,
        sources: data.sources ? JSON.stringify(data.sources) : null,
        iterations: data.iterations ?? null,
        isFallback: data.isFallback ?? false,
        promptTokens: data.promptTokens ?? null,
        completionTokens: data.completionTokens ?? null,
        totalTokens: data.totalTokens ?? null,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return toTurnData(turn);
  }
}
