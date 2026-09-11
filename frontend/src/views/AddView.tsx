import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Plus,
} from "lucide-react";
import React, { useState } from "react";
import { ingestItem, IngestResult, SourceType } from "../services/api";

interface AddViewProps {
  onIngested?: () => void;
  onNavigate: (path: string) => void;
}

export function AddView({ onIngested, onNavigate }: AddViewProps) {
  const [type, setType] = useState<SourceType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [savedResult, setSavedResult] = useState<IngestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (type === "note" && !content.trim()) {
      setErrorMessage("Note content cannot be empty.");
      return;
    }

    if (type === "url" && !url.trim()) {
      setErrorMessage("Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    setLoading(true);
    try {
      const result = await ingestItem({
        type,
        title: title.trim() || undefined,
        content: type === "note" ? content.trim() : undefined,
        url: type === "url" ? url.trim() : undefined,
      });

      setSavedResult(result);
      if (onIngested) {
        onIngested();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to ingest content.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSavedResult(null);
    setTitle("");
    setContent("");
    setUrl("");
    setErrorMessage(null);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">Add Knowledge</h1>
          <p className="view-subtitle">
            Ingest personal markdown/notes or web pages directly into Pinecone
            vector storage.
          </p>
        </div>
      </div>

      <div className="panel-card ingest-card">
        {savedResult ? (
          <div className="save-success-panel">
            <div className="success-icon-wrap">
              <CheckCircle2 size={32} color="var(--success)" />
            </div>

            <h2 className="success-title">Content saved successfully.</h2>
            <p className="success-desc">
              Indexed <strong>"{savedResult.title}"</strong> into{" "}
              {savedResult.chunksIndexed} Pinecone vector chunks with 512-token
              BPE embeddings.
            </p>

            <div className="success-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => onNavigate(`/library/${savedResult.itemId}`)}
              >
                <span>View item</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="chip-btn"
                style={{ padding: "10px 18px", fontSize: "14px" }}
                onClick={handleAddAnother}
              >
                <Plus size={16} />
                <span>Add another</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="type-selector" style={{ marginBottom: "20px" }}>
              <button
                type="button"
                className={`type-btn ${type === "note" ? "active" : ""}`}
                onClick={() => {
                  setType("note");
                  setErrorMessage(null);
                }}
              >
                <FileText size={16} />
                Note
              </button>
              <button
                type="button"
                className={`type-btn ${type === "url" ? "active" : ""}`}
                onClick={() => {
                  setType("url");
                  setErrorMessage(null);
                }}
              >
                <Globe size={16} />
                URL
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {type === "url" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="add-url">
                    URL *
                  </label>
                  <input
                    id="add-url"
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="add-title">
                  Title{" "}
                  {type === "url"
                    ? "(optional, extracted automatically if empty)"
                    : "(optional)"}
                </label>
                <input
                  id="add-title"
                  type="text"
                  className="form-input"
                  placeholder={
                    type === "note"
                      ? "e.g. System Design Notes"
                      : "Custom page title"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {type === "note" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="add-content">
                    Content *
                  </label>
                  <textarea
                    id="add-content"
                    className="form-textarea"
                    placeholder="Write or paste your knowledge text here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>
              )}

              {errorMessage && (
                <div className="alert alert-error">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ minWidth: "140px", justifyContent: "center" }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {type === "url" ? "Fetching & Saving..." : "Saving..."}
                    </>
                  ) : (
                    <span>{type === "url" ? "Fetch & Save" : "Save Note"}</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
