import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Plus,
} from "lucide-react";
import React, { useState } from "react";
import { ingestItem, SourceType } from "../services/api";

interface AddContentFormProps {
  onIngested?: () => void;
}

export function AddContentForm({ onIngested }: AddContentFormProps) {
  const [type, setType] = useState<SourceType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (type === "note" && !content.trim()) {
      setErrorMessage("Note content cannot be empty.");
      return;
    }

    if (type === "url" && !url.trim()) {
      setErrorMessage("Please enter a valid URL.");
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

      setSuccessMessage(
        `Successfully indexed "${result.title}" (${result.chunksIndexed} chunks embedded in Pinecone).`,
      );
      setTitle("");
      setContent("");
      setUrl("");
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

  return (
    <div className="panel-card ingest-card">
      <div className="type-selector">
        <button
          type="button"
          className={`type-btn ${type === "note" ? "active" : ""}`}
          onClick={() => {
            setType("note");
            setErrorMessage(null);
          }}
        >
          <FileText size={16} />
          Personal Note
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
          Web URL
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {type === "url" && (
          <div className="form-group">
            <label className="form-label" htmlFor="ingest-url">
              Web Page URL *
            </label>
            <input
              id="ingest-url"
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
          <label className="form-label" htmlFor="ingest-title">
            Title{" "}
            {type === "url"
              ? "(optional, auto-extracted if empty)"
              : "(optional)"}
          </label>
          <input
            id="ingest-title"
            type="text"
            className="form-input"
            placeholder={
              type === "note" ? "e.g. Architecture Notes" : "Custom page title"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {type === "note" && (
          <div className="form-group">
            <label className="form-label" htmlFor="ingest-content">
              Note Content *
            </label>
            <textarea
              id="ingest-content"
              className="form-textarea"
              placeholder="Write or paste your note content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="query-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                Indexing & Embedding...
              </>
            ) : (
              <>
                <Plus size={16} />
                Ingest to Knowledge Inbox
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
