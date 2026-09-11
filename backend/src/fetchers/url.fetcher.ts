import { AppError } from "../middleware/error.middleware.js";
import type { FetchedUrlContent, IUrlFetchService } from "../types/index.js";
import { extractPageContent } from "../utils/html-parser.js";

export class UrlFetchService implements IUrlFetchService {
  async fetchPage(targetUrl: string): Promise<FetchedUrlContent> {
    const parsed = new URL(targetUrl);
    const fallbackTitle = parsed.hostname;

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "AIKnowledgeInbox/1.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError(
          504,
          "GATEWAY_TIMEOUT",
          `Request to ${targetUrl} timed out after 5000ms.`,
        );
      }
      const message =
        error instanceof Error ? error.message : "Network fetch failed.";
      throw new AppError(
        502,
        "UPSTREAM_ERROR",
        `Failed to fetch URL: ${message}`,
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        "UPSTREAM_ERROR",
        `Remote server responded with HTTP status ${response.status}.`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/") &&
      !contentType.includes("html") &&
      !contentType.includes("xml")
    ) {
      throw new AppError(
        400,
        "INVALID_INPUT",
        `Unsupported content type '${contentType}'. Only HTML and text pages can be ingested.`,
      );
    }

    const html = await response.text();
    const result = extractPageContent(html, fallbackTitle);

    if (!result.content) {
      throw new AppError(
        400,
        "INVALID_INPUT",
        "Fetched URL page contained no readable text content.",
      );
    }

    return result;
  }
}
