import { Bot, SearchX, User } from "lucide-react";
import React from "react";
import type { ChatTurnData } from "../../types/api.types.js";
import { MarkdownRenderer } from "../MarkdownRenderer.js";
import { ChatCitations } from "./ChatCitations.js";

interface ChatTurnItemProps {
  turn: ChatTurnData;
  onNavigate?: (path: string) => void;
}

export const ChatTurnItem: React.FC<ChatTurnItemProps> = ({
  turn,
  onNavigate,
}) => {
  const isFallback =
    turn.isFallback ||
    turn.answer.toLowerCase().includes("no data related to this query") ||
    turn.answer.toLowerCase().includes("couldn't find any saved notes") ||
    turn.answer
      .toLowerCase()
      .includes("no information saved in your knowledge");

  const formattedTime = new Date(turn.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="chat-turn-group">
      {/* User Message */}
      <div className="user-msg-row">
        <div className="user-bubble">
          <div>{turn.question}</div>
          <div className="user-bubble-footer">
            {turn.promptTokens !== null && (
              <span
                className="user-token-tag"
                title="Input tokens in user prompt"
              >
                {turn.promptTokens} in tokens
              </span>
            )}
            <span>{formattedTime}</span>
          </div>
        </div>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-full)",
            background: "var(--surface-secondary)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={15} color="var(--text-secondary)" />
        </div>
      </div>

      {/* Assistant Answer */}
      <div className="assistant-msg-row">
        <div className="assistant-avatar">
          <Bot size={16} />
        </div>

        <div className="assistant-bubble">
          <div className="assistant-bubble-header">
            <div className="assistant-badges">
              <span
                className={`telemetry-pill ${
                  (turn.iterations ?? 1) > 1 ? "iteration-recovered" : ""
                }`}
              >
                {(turn.iterations ?? 1) === 1
                  ? "1 iteration (fast-path)"
                  : `Iteration ${turn.iterations}/3 (Self-RAG recovered)`}
              </span>
            </div>

            <div className="assistant-tokens">
              {turn.completionTokens !== null && (
                <span title="Output tokens generated">
                  Out: <strong>{turn.completionTokens}</strong>
                </span>
              )}
              {turn.totalTokens !== null && (
                <span title="Total tokens consumed by this turn">
                  Total: <strong>{turn.totalTokens}</strong>
                </span>
              )}
            </div>
          </div>

          {isFallback ? (
            <div className="fallback-box">
              <SearchX
                size={20}
                style={{
                  flexShrink: 0,
                  marginTop: "2px",
                  color: "var(--primary)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <strong
                  style={{ color: "var(--text-primary)", fontSize: "13px" }}
                >
                  No Related Knowledge Found
                </strong>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    fontSize: "13px",
                  }}
                >
                  {turn.answer}
                </p>
              </div>
            </div>
          ) : (
            <div className="markdown-content">
              <MarkdownRenderer content={turn.answer} />
            </div>
          )}

          {/* Attributed Sources */}
          {turn.sources && turn.sources.length > 0 && (
            <ChatCitations sources={turn.sources} onNavigate={onNavigate} />
          )}
        </div>
      </div>
    </div>
  );
};
