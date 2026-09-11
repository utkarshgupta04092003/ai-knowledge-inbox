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

export interface StreamQueryCallbacks {
  onSessionId?: (sessionId: string) => void;
  onStatus?: (status: {
    stage: string;
    message: string;
    iteration?: number;
  }) => void;
  onSources?: (sources: SourceCitation[]) => void;
  onDelta?: (delta: string) => void;
  onDone?: (result: RagResponse) => void;
  onError?: (error: Error) => void;
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

export async function askQueryStream(
  question: string,
  sessionId?: string,
  callbacks?: StreamQueryCallbacks,
): Promise<RagResponse> {
  const res = await fetch("/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ question, sessionId, stream: true }),
  });

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
      // ignore
    }
    const err = new Error(errorMessage);
    callbacks?.onError?.(err);
    throw err;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported by browser.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let finalResult: RagResponse | null = null;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentEvent = "";
      return;
    }

    if (trimmed.startsWith("event:")) {
      currentEvent = trimmed.slice(6).trim();
    } else if (trimmed.startsWith("data:")) {
      const rawData = trimmed.slice(5).trim();
      try {
        const data = JSON.parse(rawData);
        if (currentEvent === "session" && data.sessionId) {
          callbacks?.onSessionId?.(data.sessionId);
        } else if (currentEvent === "status") {
          callbacks?.onStatus?.(data);
        } else if (currentEvent === "sources" && Array.isArray(data.sources)) {
          callbacks?.onSources?.(data.sources);
        } else if (currentEvent === "delta" && typeof data.delta === "string") {
          callbacks?.onDelta?.(data.delta);
        } else if (currentEvent === "done") {
          finalResult = data as RagResponse;
          callbacks?.onDone?.(finalResult);
        } else if (currentEvent === "error") {
          const err = new Error(data.message || "Query stream failed.");
          callbacks?.onError?.(err);
          throw err;
        }
      } catch (jsonErr) {
        if (jsonErr instanceof Error && currentEvent === "error") {
          throw jsonErr;
        }
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      const remainingLines = buffer.split("\n");
      for (const line of remainingLines) {
        processLine(line);
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResult) {
    throw new Error("Stream ended before receiving completion event.");
  }

  return finalResult;
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

export async function updateNoteItem(
  id: string,
  data: { title?: string; content?: string },
): Promise<Item> {
  const res = await fetch(`/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await handleResponse<{ item: Item }>(res);
  return result.item;
}

export async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}
