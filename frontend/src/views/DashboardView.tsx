import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import React, { useState } from "react";
import {
  askQuery,
  ingestItem,
  Item,
  RagResponse,
  SourceType,
} from "../services/api";

interface DashboardViewProps {
  items: Item[];
  loadingItems: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}

const SAMPLE_QUERIES = [
  "What did I save about RAG?",
  "Summarize my React notes",
  "Key takeaways from recent articles",
];

export function DashboardView({
  items,
  onRefresh,
  onNavigate,
}: DashboardViewProps) {
  // Quick Ask state
  const [askInput, setAskInput] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [latestAnswer, setLatestAnswer] = useState<RagResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Quick Ingest state
  const [ingestType, setIngestType] = useState<SourceType>("note");
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const handleQuickAsk = async (questionText?: string) => {
    const q = (questionText ?? askInput).trim();
    if (!q || queryLoading) return;

    setActiveQuestion(q);
    setAskInput(q);
    setQueryLoading(true);
    setQueryError(null);

    try {
      const res = await askQuery(q);
      setLatestAnswer(res);
    } catch (err) {
      setQueryError(
        err instanceof Error ? err.message : "Failed to run query.",
      );
    } finally {
      setQueryLoading(false);
    }
  };

  const handleQuickIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestError(null);
    setIngestSuccess(null);

    if (ingestType === "note" && !ingestContent.trim()) {
      setIngestError("Note content cannot be empty.");
      return;
    }
    if (ingestType === "url" && !ingestUrl.trim()) {
      setIngestError("Please enter a valid URL.");
      return;
    }

    setIngestLoading(true);
    try {
      const res = await ingestItem({
        type: ingestType,
        title: ingestTitle.trim() || undefined,
        content: ingestType === "note" ? ingestContent.trim() : undefined,
        url: ingestType === "url" ? ingestUrl.trim() : undefined,
      });

      setIngestSuccess(
        `Saved "${res.title}" (${res.chunksIndexed} chunks indexed).`,
      );
      setIngestTitle("");
      setIngestContent("");
      setIngestUrl("");
      onRefresh();
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIngestLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="view-container">
      <div className="dashboard-grid">
        {/* TOP-LEFT: HERO & QUICK SEARCH */}
        <div className="dashboard-hero-card">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span className="hero-eyebrow">Your Knowledge, Supercharged</span>
              <span
                style={{
                  fontStyle: "italic",
                  fontFamily: "serif",
                  color: "var(--primary)",
                  opacity: 0.85,
                  fontSize: "15px",
                }}
              >
                Knowledge compounds
              </span>
            </div>

            <h1 className="hero-heading">
              Save. Search.{" "}
              <span className="hero-heading-accent">Understand.</span>
            </h1>

            <p className="hero-desc">
              Add notes or URLs, ask questions, and get grounded answers from
              your own knowledge base.
            </p>
          </div>

          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleQuickAsk();
              }}
              className="hero-search-form"
            >
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ flexShrink: 0 }}
              />
              <input
                type="text"
                className="hero-search-input"
                placeholder="Ask anything about your knowledge..."
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                disabled={queryLoading}
              />
              <button
                type="submit"
                className="hero-search-btn"
                disabled={queryLoading || !askInput.trim()}
              >
                {queryLoading ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="try-asking-wrap">
              <span className="try-asking-label">Try asking:</span>
              {SAMPLE_QUERIES.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  className="try-chip"
                  onClick={() => void handleQuickAsk(sq)}
                  disabled={queryLoading}
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: QUICK ADD KNOWLEDGE */}
        <div className="dashboard-add-card">
          <div className="card-header-with-icon">
            <div className="card-icon-pill">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="card-header-title">Add Knowledge</h2>
              <p className="card-header-subtitle">
                Save a note or add a URL to your inbox.
              </p>
            </div>
          </div>

          <div className="segment-tabs">
            <button
              type="button"
              className={`segment-tab ${ingestType === "note" ? "active" : ""}`}
              onClick={() => {
                setIngestType("note");
                setIngestError(null);
                setIngestSuccess(null);
              }}
            >
              <FileText size={14} />
              <span>Note</span>
            </button>
            <button
              type="button"
              className={`segment-tab ${ingestType === "url" ? "active" : ""}`}
              onClick={() => {
                setIngestType("url");
                setIngestError(null);
                setIngestSuccess(null);
              }}
            >
              <Globe size={14} />
              <span>URL</span>
            </button>
          </div>

          <form
            onSubmit={handleQuickIngest}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {ingestType === "url" && (
              <div className="form-group">
                <input
                  type="url"
                  className="input-dark"
                  placeholder="https://example.com/article"
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="text"
                className="input-dark"
                placeholder={
                  ingestType === "note"
                    ? "Give your note a title (optional)..."
                    : "Page title (optional)..."
                }
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
              />
            </div>

            {ingestType === "note" && (
              <div className="form-group">
                <textarea
                  className="textarea-dark"
                  placeholder="Write or paste your note here..."
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  maxLength={10000}
                  required
                />
                <span className="char-counter">
                  {ingestContent.length}/10000
                </span>
              </div>
            )}

            {ingestSuccess && (
              <div className="alert alert-success">
                <CheckCircle2 size={16} />
                <span>{ingestSuccess}</span>
              </div>
            )}

            {ingestError && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{ingestError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={ingestLoading}
              style={{ width: "100%", marginTop: "2px" }}
            >
              {ingestLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving & Indexing...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>
                    {ingestType === "url" ? "Fetch & Save URL" : "Save Note"}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* BOTTOM-LEFT: RECENT KNOWLEDGE */}
        <div className="dashboard-recent-card">
          <div className="recent-header-bar">
            <div className="card-header-with-icon">
              <div
                className="card-icon-pill"
                style={{
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                }}
              >
                <FileText size={16} />
              </div>
              <div>
                <h2 className="card-header-title">Recent Knowledge</h2>
                <p className="card-header-subtitle">
                  Your recently added notes and links.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="view-all-link"
              onClick={() => onNavigate("/library")}
              style={{ background: "none", border: "none" }}
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              No items saved yet. Use the form above to add your first note or
              URL.
            </div>
          ) : (
            <div className="recent-items-list">
              {items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="recent-row"
                  onClick={() => onNavigate(`/library/${item.id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="row-icon-box">
                    {item.sourceType === "note" ? (
                      <FileText size={15} />
                    ) : (
                      <Globe size={15} />
                    )}
                  </div>

                  <div className="row-main-content">
                    <span className="row-title">{item.title}</span>
                    <span className="row-snippet">{item.content}</span>
                  </div>

                  <div className="row-meta-right">
                    <span
                      className={
                        item.sourceType === "note" ? "badge-note" : "badge-url"
                      }
                    >
                      {item.sourceType === "note" ? "Note" : "URL"}
                    </span>
                    <span className="row-time">
                      {formatDate(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      className="row-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/library/${item.id}`);
                      }}
                      title="Inspect item"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM-RIGHT: LATEST ANSWER */}
        <div className="dashboard-answer-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div className="card-header-with-icon">
              <div
                className="card-icon-pill"
                style={{
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className="card-header-title">Latest Answer</h2>
                <p className="card-header-subtitle">
                  {latestAnswer
                    ? `Synthesized using iterative Self-RAG (${latestAnswer.iterations} iteration${latestAnswer.iterations > 1 ? "s" : ""}).`
                    : "An example of how your knowledge turns into insights."}
                </p>
              </div>
            </div>

            {latestAnswer && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setLatestAnswer(null);
                  setActiveQuestion(null);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {queryLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "24px",
                color: "var(--text-secondary)",
                fontSize: "13px",
              }}
            >
              <Loader2 size={18} className="spin" color="var(--primary)" />
              <span>
                Searching your knowledge and generating grounded answer...
              </span>
            </div>
          )}

          {queryError && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{queryError}</span>
            </div>
          )}

          {!queryLoading && !latestAnswer && (
            <>
              {/* Mockup Default Insight */}
              <div className="user-question-bubble">
                <div className="user-question-left">
                  <div className="user-icon-pill">
                    <User size={13} />
                  </div>
                  <span>What did I save about vector databases?</span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Today, 2:30 PM
                </span>
              </div>

              <div className="answer-text-box">
                <div className="ai-icon-pill">
                  <Sparkles size={13} />
                </div>
                <div className="answer-body-text">
                  You have a note about vector databases that covers an
                  overview, common use cases, and popular options like Pinecone,
                  Weaviate, and Qdrant. It also mentions how vector databases
                  enable similarity search using embeddings and are useful for
                  building RAG systems.
                </div>
              </div>

              <div className="sources-container">
                <div className="sources-header">
                  <span>Sources</span>
                  <span>2 sources</span>
                </div>

                <div
                  className="source-card-mini"
                  onClick={() => onNavigate("/library")}
                >
                  <div className="source-card-left">
                    <Globe size={15} color="var(--text-muted)" />
                    <div className="source-card-texts">
                      <span className="source-card-title">
                        Vector Database Guide
                      </span>
                      <span className="source-card-snippet">
                        "Vector databases are designed to store and search
                        high-dimensional embeddings..."
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={13} color="var(--primary)" />
                </div>

                <div
                  className="source-card-mini"
                  onClick={() => onNavigate("/library")}
                >
                  <div className="source-card-left">
                    <FileText size={15} color="var(--text-muted)" />
                    <div className="source-card-texts">
                      <span className="source-card-title">
                        Interview Preparation
                      </span>
                      <span className="source-card-snippet">
                        "Vector DBs like Pinecone, Weaviate, Qdrant are commonly
                        used in RAG pipelines..."
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={13} color="var(--primary)" />
                </div>
              </div>
            </>
          )}

          {!queryLoading && latestAnswer && (
            <>
              <div className="user-question-bubble">
                <div className="user-question-left">
                  <div className="user-icon-pill">
                    <User size={13} />
                  </div>
                  <span>{activeQuestion}</span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Just now
                </span>
              </div>

              <div className="answer-text-box">
                <div className="ai-icon-pill">
                  <Sparkles size={13} />
                </div>
                <div className="answer-body-text">{latestAnswer.answer}</div>
              </div>

              {latestAnswer.sources && latestAnswer.sources.length > 0 && (
                <div className="sources-container">
                  <div className="sources-header">
                    <span>Sources</span>
                    <span>
                      {latestAnswer.sources.length} source
                      {latestAnswer.sources.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {latestAnswer.sources.map((src, idx) => (
                    <div
                      key={src.itemId || idx}
                      className="source-card-mini"
                      onClick={() => onNavigate(`/library/${src.itemId}`)}
                    >
                      <div className="source-card-left">
                        {src.url ? (
                          <Globe size={15} color="var(--text-muted)" />
                        ) : (
                          <FileText size={15} color="var(--text-muted)" />
                        )}
                        <div className="source-card-texts">
                          <span className="source-card-title">{src.title}</span>
                          <span className="source-card-snippet">
                            "{src.snippet}"
                          </span>
                        </div>
                      </div>
                      <ExternalLink size={13} color="var(--primary)" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="answer-card-footer-note">
            Answers are generated from your saved content. Always verify
            important information.
          </div>
        </div>
      </div>
    </div>
  );
}
