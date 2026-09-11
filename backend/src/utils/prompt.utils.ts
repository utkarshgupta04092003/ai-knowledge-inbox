import { FALLBACK_MESSAGES } from "../config/prompts.js";

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
): string {
  return `Original Question: ${originalQuestion}\nAttempt: ${attempt}\nPrevious Queries:\n${pastQueries.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}`;
}

export function formatAnswerGradingPrompt(
  question: string,
  answer: string,
  contextText: string,
): string {
  return `User Question: ${question}\n\nContext Sources:\n${contextText}\n\nCandidate Answer:\n${answer}`;
}
