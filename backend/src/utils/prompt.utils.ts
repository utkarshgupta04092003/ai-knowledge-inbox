import { FALLBACK_MESSAGES } from "../config/prompts.js";
import type { ConversationTurn } from "../types/index.js";

export function getRandomFallbackMessage(): string {
  const index = Math.floor(Math.random() * FALLBACK_MESSAGES.length);
  return FALLBACK_MESSAGES[index];
}

export function formatRagUserPrompt(
  question: string,
  contextText: string,
): string {
  return `Context sources from saved knowledge inbox:\n${contextText}\n\nUser Question: ${question}`;
}

export function formatRetrievalGradingPrompt(
  question: string,
  contextText: string,
): string {
  return `User Question: ${question}\n\nContext Sources:\n${contextText}`;
}

export function formatQueryRewritePrompt(
  originalQuestion: string,
  attempt: number,
  pastQueries: string[],
  history?: ConversationTurn[],
): string {
  let prompt = "";
  if (history && history.length > 0) {
    const historyText = history
      .map(
        (t, idx) =>
          `Turn ${idx + 1}:\nUser: ${t.question}\nAssistant: ${t.answer}`,
      )
      .join("\n\n");
    prompt += `Recent Conversation Context:\n${historyText}\n\n`;
  }
  prompt += `Current User Question: ${originalQuestion}\nAttempt: ${attempt}\nPrevious Search Queries:\n${pastQueries.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}`;
  return prompt;
}

export function formatAnswerGradingPrompt(
  question: string,
  answer: string,
  contextText: string,
): string {
  return `User Question: ${question}\n\nContext Sources:\n${contextText}\n\nCandidate Answer:\n${answer}`;
}
