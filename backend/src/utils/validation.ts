import { AppError } from "../middleware/error.middleware.js";

export interface ValidatedNotePayload {
  type: "note";
  title: string;
  content: string;
}

export interface ValidatedUrlPayload {
  type: "url";
  url: string;
}

export type ValidatedIngestPayload = ValidatedNotePayload | ValidatedUrlPayload;

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function validateUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new AppError(400, "INVALID_INPUT", "URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new AppError(400, "INVALID_INPUT", "Invalid URL format.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(400, "INVALID_INPUT", "Only HTTP and HTTPS protocols are supported.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new AppError(400, "INVALID_INPUT", "Requests to local or private network addresses are prohibited.");
  }

  return parsed.toString();
}

export function validateNote(payload: { title?: unknown; content?: unknown }): ValidatedNotePayload {
  const rawContent = payload.content;
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    throw new AppError(400, "INVALID_INPUT", "Note content cannot be empty.");
  }

  const trimmedContent = rawContent.trim();
  if (trimmedContent.length > 50000) {
    throw new AppError(400, "INVALID_INPUT", "Note content exceeds the maximum limit of 50,000 characters.");
  }

  let title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    const firstLine = trimmedContent.split("\n")[0].trim();
    title = firstLine.slice(0, 80) || "Untitled Note";
  } else if (title.length > 200) {
    title = title.slice(0, 200);
  }

  return {
    type: "note",
    title,
    content: trimmedContent,
  };
}

export function validateIngestPayload(body: unknown): ValidatedIngestPayload {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "INVALID_INPUT", "Request body must be a JSON object.");
  }

  const payload = body as Record<string, unknown>;
  const type = payload.type;

  if (type === "note") {
    return validateNote(payload);
  }

  if (type === "url") {
    return {
      type: "url",
      url: validateUrl(payload.url),
    };
  }

  throw new AppError(400, "INVALID_INPUT", "Property 'type' must be either 'note' or 'url'.");
}
