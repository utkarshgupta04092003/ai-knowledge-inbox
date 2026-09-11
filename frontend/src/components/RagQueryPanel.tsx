import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { askQuery, RagResponse } from "../services/api";

const SAMPLE_QUERIES = [
  "What are the main topics in my saved notes?",
  "What is the system architecture?",
  "Summarize the latest web articles.",
];

interface RagQueryPanelProps {
  initialQuestion?: string;
  onNavigate?: (path: string) => void;
}

export function RagQueryPanel({
  initialQuestion,
  onNavigate,
}: RagQueryPanelProps) {
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [loading, setLoading] = useState(() =>
    Boolean(initialQuestion?.trim()),
  );
  const [result, setResult] = useState<RagResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuerySubmit = async (queryText?: string) => {
    const targetQuery = (queryText ?? question).trim();
    if (!targetQuery || loading) return;

    if (queryText) {
      setQuestion(queryText);
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await askQuery(targetQuery);
      setResult(response);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to execute query.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuestion?.trim()) return;

    let ignore = false;
    askQuery(initialQuestion.trim())
      .then((res) => {
        if (!ignore) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to execute query.",
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [initialQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleQuerySubmit();
    }
  };

  const isFallback =
    Boolean(result?.isFallback) ||
    result?.answer.toLowerCase().includes("no data related to this query") ||
    result?.answer.toLowerCase().includes("couldn't find any saved notes") ||
    result?.answer
      .toLowerCase()
      .includes("no information saved in your knowledge") ||
    result?.answer.toLowerCase().includes("don't have enough information");

  return (
    <div className="query-section">
      <div className="panel-card" style={{ padding: "20px" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleQuerySubmit();
          }}
          className="query-input-container"
        >
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="query-input"
            placeholder="Ask anything grounded in your saved personal notes and URLs..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            type="submit"
            className="query-submit-btn"
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Ask Inbox
              </>
            )}
          </button>
        </form>

        <div className="suggested-chips" style={{ marginTop: "14px" }}>
          <span className="suggested-label">Try asking:</span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              className="chip-btn"
              onClick={() => void handleQuerySubmit(sample)}
              disabled={loading}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-box">
          <Loader2 size={20} className="spin" color="var(--primary-hover)" />
          <div>
            <strong>Self-RAG Loop Active:</strong> Retrieving Pinecone vectors,
            grading context relevance, and verifying answer groundedness...
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {result && !loading && (
        <div className="answer-box">
          <div className="answer-header">
            <div className="answer-header-title">
              <Sparkles size={18} color="var(--primary-hover)" />
              <span>Grounded Answer</span>
            </div>

            <div className="telemetry-badges">
              <span
                className={`telemetry-pill ${
                  result.iterations > 1 ? "iteration-recovered" : ""
                }`}
                title="Number of Self-RAG loop iterations executed"
              >
                {result.iterations === 1
                  ? "1 iteration (fast-path)"
                  : `Iteration ${result.iterations}/3 (Self-RAG recovered)`}
              </span>

              {result.reformulatedQueries &&
                result.reformulatedQueries.length > 0 && (
                  <span
                    className="telemetry-pill iteration-recovered"
                    title="Alternative queries used during search reformulation"
                  >
                    {result.reformulatedQueries.length} reformulation
                    {result.reformulatedQueries.length > 1 ? "s" : ""}
                  </span>
                )}
            </div>
          </div>

          {result.reformulatedQueries &&
            result.reformulatedQueries.length > 0 && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  background: "var(--surface-secondary)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong>Query Reformulations:</strong>
                {result.reformulatedQueries.map((q, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <code style={{ color: "var(--primary-hover)" }}>"{q}"</code>
                    {idx < result.reformulatedQueries.length - 1 && (
                      <ArrowRight size={11} />
                    )}
                  </span>
                ))}
              </div>
            )}

          {isFallback ? (
            <div className="fallback-box">
              <SearchX
                size={22}
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
                  gap: "6px",
                  width: "100%",
                }}
              >
                <strong
                  style={{ color: "var(--text-primary)", fontSize: "14px" }}
                >
                  No Related Knowledge Found
                </strong>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {result.answer}
                </p>
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Tip: Try rephrasing with different keywords, or</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{
                        padding: "3px 8px",
                        fontSize: "12px",
                        color: "var(--primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={() => onNavigate("/add")}
                    >
                      <Plus size={13} />
                      Add Knowledge on this topic
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="answer-body">{result.answer}</div>
          )}

          {result.sources && result.sources.length > 0 && (
            <div className="citations-section">
              <h4>Attributed Sources ({result.sources.length})</h4>
              <div className="citations-grid">
                {result.sources.map((src, index) => {
                  const scorePercent =
                    typeof src.score === "number" && !Number.isNaN(src.score)
                      ? Math.round(src.score * 100)
                      : null;
                  return (
                    <div key={src.itemId || index} className="citation-card">
                      <div className="citation-card-header">
                        <span className="citation-badge">
                          [Source {index + 1}]
                        </span>
                        <span className="citation-score">
                          {scorePercent !== null
                            ? `${scorePercent}% similarity`
                            : "Grounded passage"}
                        </span>
                      </div>

                      <div className="citation-title" title={src.title}>
                        <BookOpen
                          size={13}
                          style={{
                            display: "inline",
                            marginRight: "6px",
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
                          paddingTop: "8px",
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
          )}
        </div>
      )}
    </div>
  );
}
