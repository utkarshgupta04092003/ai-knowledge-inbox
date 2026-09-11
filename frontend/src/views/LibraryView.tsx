import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { deleteItem, type Item, type SourceType } from "../services/api";

interface LibraryViewProps {
  items: Item[];
  loadingItems: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}

type FilterType = "all" | SourceType;

export function LibraryView({
  items,
  loadingItems,
  onRefresh,
  onNavigate,
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const notesCount = useMemo(
    () => items.filter((i) => i.sourceType === "note").length,
    [items],
  );
  const urlsCount = useMemo(
    () => items.filter((i) => i.sourceType === "url").length,
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== "all" && item.sourceType !== filterType) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.sourceUrl && item.sourceUrl.toLowerCase().includes(q))
      );
    });
  }, [items, filterType, searchQuery]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteItem(itemToDelete.id);
      setItemToDelete(null);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">Knowledge Library</h1>
          <p className="view-subtitle">
            Browse, search, edit notes, and manage all saved knowledge items.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="chip-btn"
            onClick={onRefresh}
            disabled={loadingItems}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
            }}
          >
            <RefreshCw size={13} className={loadingItems ? "spin" : ""} />
            Sync
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate("/add")}
          >
            <Plus size={16} />
            <span>Add Knowledge</span>
          </button>
        </div>
      </div>

      <div className="library-toolbar">
        <div className="quick-ask-input-wrap" style={{ maxWidth: "420px" }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="quick-ask-input"
            placeholder="Search saved knowledge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="library-filters">
          <button
            type="button"
            className={`filter-pill ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All <span className="pill-count">{items.length}</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === "note" ? "active" : ""}`}
            onClick={() => setFilterType("note")}
          >
            Notes <span className="pill-count">{notesCount}</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === "url" ? "active" : ""}`}
            onClick={() => setFilterType("url")}
          >
            URLs <span className="pill-count">{urlsCount}</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "24px" }}>
          <p>No knowledge items match your current filter.</p>
          {items.length === 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate("/add")}
            >
              <Plus size={16} />
              Add your first item
            </button>
          )}
        </div>
      ) : (
        <div className="library-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="library-card"
              onClick={() => onNavigate(`/library/${item.id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="library-card-top">
                <span
                  className={`badge-type ${
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
                      URL
                    </>
                  )}
                </span>
                <span className="library-card-date">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              <h3 className="library-card-title">{item.title}</h3>
              <p className="library-card-snippet">{item.content}</p>

              <div className="library-card-bottom">
                <span className="open-detail-link">
                  Inspect Item
                  <ArrowRight size={12} />
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="citation-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Source Link
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    className="card-delete-btn"
                    title="Delete item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div
          className="modal-overlay"
          onClick={() => !isDeleting && setItemToDelete(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "460px", width: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>
                  Delete Knowledge Item?
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                  Are you sure you want to delete "{itemToDelete.title}"?
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              This permanently deletes the document and purges all associated vector embeddings from
              Pinecone. This action cannot be reversed.
            </p>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                <AlertCircle size={14} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                style={{ padding: "8px 14px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-solid"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

