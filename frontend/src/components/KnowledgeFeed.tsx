import {
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Item } from "../services/api";

interface KnowledgeFeedProps {
  items: Item[];
  loading: boolean;
  onRefresh: () => void;
  onSwitchToAdd: () => void;
}

export function KnowledgeFeed({
  items,
  loading,
  onRefresh,
  onSwitchToAdd,
}: KnowledgeFeedProps) {
  const [searchFilter, setSearchFilter] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.sourceUrl && item.sourceUrl.toLowerCase().includes(q)),
    );
  }, [items, searchFilter]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
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

  return (
    <div>
      <div className="feed-header">
        <div className="feed-title-wrap">
          <h2 className="feed-title">Saved Knowledge Inbox</h2>
          <span
            className="badge"
            style={{
              background: "var(--surface-secondary)",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              border: "1px solid var(--border)",
            }}
          >
            {items.length} {items.length === 1 ? "document" : "documents"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            className="query-input-container"
            style={{ padding: "4px 10px", minWidth: "220px" }}
          >
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="query-input"
              style={{ fontSize: "13px", padding: "2px 0" }}
              placeholder="Filter saved items..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="chip-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh items list"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
            }}
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            Sync
          </button>
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FolderOpen size={24} />
          </div>
          <h3>Your Knowledge Inbox is empty</h3>
          <p>
            Start saving personal notes or ingest web pages. Chunks will be
            automatically generated with js-tiktoken and indexed into Pinecone
            vectors.
          </p>
          <button
            type="button"
            className="query-submit-btn"
            onClick={onSwitchToAdd}
            style={{ marginTop: "8px" }}
          >
            <Plus size={16} />
            Add First Item
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state" style={{ padding: "40px 20px" }}>
          <Search size={22} color="var(--text-muted)" />
          <p>No documents found matching "{searchFilter}".</p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="item-card">
              <div className="item-meta">
                <span
                  className={`item-type-badge ${
                    item.sourceType === "note" ? "badge-note" : "badge-url"
                  }`}
                >
                  {item.sourceType === "note" ? (
                    <>
                      <FileText size={12} />
                      Note
                    </>
                  ) : (
                    <>
                      <Globe size={12} />
                      Web URL
                    </>
                  )}
                </span>
                <span className="item-date">{formatDate(item.createdAt)}</span>
              </div>

              <h3 className="item-title">{item.title}</h3>

              <p className="item-content-preview">{item.content}</p>

              <div className="item-footer">
                <span>ID: {item.id.slice(0, 8)}...</span>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="citation-link"
                  >
                    Source Link
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
