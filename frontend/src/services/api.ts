import type {
  ChatSessionDetail,
  ChatSessionSummary,
  ChatTurnData,
  IngestPayload,
  IngestResponse,
  IngestResult,
  Item,
  RagResponse,
  SourceCitation,
  SourceType,
} from "../types/api.types.js";

export type {
  ChatSessionDetail,
  ChatSessionSummary,
  ChatTurnData,
  IngestPayload,
  IngestResponse,
  IngestResult,
  Item,
  RagResponse,
  SourceCitation,
  SourceType,
};

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as ApiErrorResponse;
      if (data.error?.message) {
        errorMessage = data.error.message;
      } else if (data.message) {
        errorMessage = data.message;
      }
    } catch {
      // JSON parse failed, keep default status message
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch("/items");
  const data = await handleResponse<{ items: Item[] }>(res);
  return data.items;
}

export async function ingestItem(
  payload: IngestPayload,
): Promise<IngestResult> {
  const res = await fetch("/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<IngestResponse>(res);
  return {
    itemId: data.item.id,
    title: data.item.title,
    chunksIndexed: data.chunkCount,
  };
}

export async function askQuery(
  question: string,
  sessionId?: string,
): Promise<RagResponse> {
  const res = await fetch("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sessionId }),
  });
  return handleResponse<RagResponse>(res);
}

export async function fetchItemById(id: string): Promise<Item> {
  const res = await fetch(`/items/${encodeURIComponent(id)}`);
  const data = await handleResponse<{ item: Item }>(res);
  return data.item;
}

export async function fetchSessions(): Promise<ChatSessionSummary[]> {
  const res = await fetch("/sessions");
  const data = await handleResponse<{ sessions: ChatSessionSummary[] }>(res);
  return data.sessions;
}

export async function fetchSessionById(id: string): Promise<ChatSessionDetail> {
  const res = await fetch(`/sessions/${encodeURIComponent(id)}`);
  return handleResponse<ChatSessionDetail>(res);
}

export async function createSession(
  title?: string,
): Promise<ChatSessionSummary> {
  const res = await fetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return handleResponse<ChatSessionSummary>(res);
}

export async function updateSessionTitle(
  id: string,
  title: string,
): Promise<ChatSessionSummary> {
  const res = await fetch(`/sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return handleResponse<ChatSessionSummary>(res);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete session: ${res.statusText}`);
  }
}
