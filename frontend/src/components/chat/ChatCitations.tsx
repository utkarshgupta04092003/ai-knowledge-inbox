import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import React from "react";
import type { SourceCitation } from "../../types/api.types.js";

interface ChatCitationsProps {
  sources: SourceCitation[];
  onNavigate?: (path: string) => void;
}

export const ChatCitations: React.FC<ChatCitationsProps> = ({
  sources,
  onNavigate,
}) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="citations-section">
      <h4 style={{ fontSize: "12px", marginBottom: "8px" }}>
        Attributed Sources ({sources.length})
      </h4>
      <div className="citations-grid">
        {sources.map((src, index) => {
          const scorePercent =
            typeof src.score === "number" && !Number.isNaN(src.score)
              ? Math.round(src.score * 100)
              : null;

          return (
            <div key={src.itemId || index} className="citation-card">
              <div className="citation-card-header">
                <span className="citation-badge">[Source {index + 1}]</span>
                <span className="citation-score">
                  {scorePercent !== null
                    ? `${scorePercent}% similarity`
                    : "Grounded passage"}
                </span>
              </div>

              <div className="citation-title" title={src.title}>
                <BookOpen
                  size={12}
                  style={{
                    display: "inline",
                    marginRight: "4px",
                    verticalAlign: "middle",
                  }}
                />
                {src.title}
              </div>

              <div className="citation-snippet" title={src.snippet}>
                "{src.snippet}"
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  paddingTop: "6px",
                  gap: "8px",
                }}
              >
                {onNavigate && src.itemId && (
                  <button
                    type="button"
                    className="citation-link"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => onNavigate(`/library/${src.itemId}`)}
                  >
                    Inspect item
                    <ArrowRight size={11} />
                  </button>
                )}
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="citation-link"
                  >
                    Source Link
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
