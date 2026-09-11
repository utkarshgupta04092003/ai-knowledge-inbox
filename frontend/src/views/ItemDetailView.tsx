import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { fetchItemById, Item } from "../services/api";

interface ItemDetailViewProps {
  id: string;
  items?: Item[];
  onNavigate: (path: string) => void;
}

export function ItemDetailView({
  id,
  items = [],
  onNavigate,
}: ItemDetailViewProps) {
  const existingItem = items.find((i) => i.id === id);
  const [fetchedItem, setFetchedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(!existingItem);
  const [error, setError] = useState<string | null>(null);

  const item = existingItem ?? fetchedItem;

  useEffect(() => {
    if (existingItem) return;

    let ignore = false;
    fetchItemById(id)
      .then((data) => {
        if (!ignore) {
          setFetchedItem(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load item.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id, existingItem]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const handleAskAboutThis = () => {
    if (!item) return;
    const prompt = `What are the key takeaways from "${item.title}"?`;
    onNavigate(`/query?q=${encodeURIComponent(prompt)}`);
  };

  if (loading) {
    return (
      <div className="view-container">
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("/library")}
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>
        <div className="loading-box" style={{ marginTop: "24px" }}>
          <Loader2 size={20} className="spin" />
          <span>Loading knowledge item details...</span>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="view-container">
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("/library")}
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>
        <div className="alert alert-error" style={{ marginTop: "24px" }}>
          <AlertCircle size={20} />
          <span>{error || "Knowledge item not found."}</span>
        </div>
      </div>
    );
  }

  // Estimated chunks count based on ~512 token chunking
  const estimatedChunks = Math.max(1, Math.ceil(item.content.length / 1200));

  return (
    <div className="view-container">
      <div className="item-detail-top-nav">
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("/library")}
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleAskAboutThis}
        >
          <Sparkles size={16} />
          <span>Ask about this</span>
        </button>
      </div>

      <div className="item-detail-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <span
            className={`badge-type ${
              item.sourceType === "note" ? "badge-note" : "badge-url"
            }`}
          >
            {item.sourceType === "note" ? (
              <>
                <FileText size={12} />
                Personal Note
              </>
            ) : (
              <>
                <Globe size={12} />
                Web Page URL
              </>
            )}
          </span>

          <span className="item-date">
            Created {formatDate(item.createdAt)}
          </span>
        </div>

        <h1 className="item-detail-title">{item.title}</h1>

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="item-source-link"
          >
            <Globe size={14} />
            <span>{item.sourceUrl}</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="item-detail-grid">
        {/* Main Content Area */}
        <div className="panel-card item-content-card">
          <h2 className="detail-section-title">Full Content</h2>
          <div className="item-content-body">
            <MarkdownRenderer content={item.content} />
          </div>
        </div>

        {/* Metadata Sidebar Panel */}
        <div className="panel-card item-meta-card">
          <h2 className="detail-section-title">Document Metadata</h2>

          <div className="meta-row">
            <span className="meta-label">
              <Database size={14} />
              Source Type
            </span>
            <span className="meta-value">{item.sourceType.toUpperCase()}</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">
              <Hash size={14} />
              Vector Index
            </span>
            <span className="meta-value">Pinecone Serverless</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">
              <Calendar size={14} />
              Estimated Chunks
            </span>
            <span className="meta-value">
              ~{estimatedChunks} chunks (512 tokens / 128 overlap)
            </span>
          </div>

          <div className="meta-row">
            <span className="meta-label">
              <Calendar size={14} />
              Indexed At
            </span>
            <span className="meta-value">{formatDate(item.createdAt)}</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">
              <Hash size={14} />
              Document ID
            </span>
            <span
              className="meta-value"
              style={{ fontFamily: "monospace", fontSize: "11px" }}
            >
              {item.id}
            </span>
          </div>

          <div
            style={{
              marginTop: "18px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleAskAboutThis}
            >
              <Sparkles size={16} />
              <span>Ask about this item</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
