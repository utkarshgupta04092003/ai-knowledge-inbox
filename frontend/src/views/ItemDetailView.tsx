import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Database,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { deleteItem, fetchItemById, Item, updateNoteItem } from "../services/api";

interface ItemDetailViewProps {
  id: string;
  items?: Item[];
  onNavigate: (path: string) => void;
  onRefresh?: () => void;
}

export function ItemDetailView({
  id,
  items = [],
  onNavigate,
  onRefresh,
}: ItemDetailViewProps) {
  const existingItem = items.find((i) => i.id === id);
  const [fetchedItem, setFetchedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(!existingItem);
  const [error, setError] = useState<string | null>(null);

  // Edit states (note only)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleStartEdit = () => {
    if (!item) return;
    setEditTitle(item.title);
    setEditContent(item.content);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!item || !editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateNoteItem(item.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setFetchedItem(updated);
      setIsEditing(false);
      onRefresh?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save note changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteItem(item.id);
      onRefresh?.();
      onNavigate("/library");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete knowledge item.");
      setIsDeleting(false);
    }
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
      {/* Top action navigation */}
      <div className="item-detail-top-nav">
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("/library")}
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isEditing ? (
            <>
              <button
                type="button"
                className="chip-btn"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={isSaving || !editTitle.trim() || !editContent.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {item.sourceType === "note" && (
                <button
                  type="button"
                  className="chip-btn"
                  onClick={handleStartEdit}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Edit3 size={14} />
                  <span>Edit Note</span>
                </button>
              )}

              <button
                type="button"
                className="chip-btn btn-danger-soft"
                onClick={() => setShowDeleteConfirm(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleAskAboutThis}
              >
                <Sparkles size={16} />
                <span>Ask about this</span>
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Header Info */}
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

        {isEditing ? (
          <div style={{ marginTop: "8px", marginBottom: "8px" }}>
            <label
              htmlFor="edit-note-title"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Note Title
            </label>
            <input
              id="edit-note-title"
              type="text"
              className="quick-ask-input"
              style={{
                width: "100%",
                fontSize: "18px",
                fontWeight: 600,
                padding: "10px 14px",
                borderRadius: "8px",
              }}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter note title..."
              disabled={isSaving}
            />
          </div>
        ) : (
          <h1 className="item-detail-title">{item.title}</h1>
        )}

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
          <h2 className="detail-section-title">
            {isEditing ? "Edit Note Content" : "Full Content"}
          </h2>
          <div className="item-content-body">
            {isEditing ? (
              <div>
                <textarea
                  className="quick-ask-input"
                  style={{
                    width: "100%",
                    minHeight: "320px",
                    padding: "12px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter note content in markdown..."
                  disabled={isSaving}
                />
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  Saving this note will automatically re-chunk and update its semantic
                  vectors in Pinecone.
                </div>
              </div>
            ) : (
              <MarkdownRenderer content={item.content} />
            )}
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
              display: "flex",
              flexDirection: "column",
              gap: "8px",
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

            {item.sourceType === "note" && !isEditing && (
              <button
                type="button"
                className="chip-btn"
                style={{ width: "100%", justifyContent: "center", padding: "8px 12px" }}
                onClick={handleStartEdit}
              >
                <Edit3 size={14} />
                <span>Edit Note Content</span>
              </button>
            )}

            <button
              type="button"
              className="chip-btn btn-danger-soft"
              style={{ width: "100%", justifyContent: "center", padding: "8px 12px" }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
              <span>Delete Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
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
                  Are you sure you want to delete "{item.title}"?
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              This action permanently removes the document from your SQLite library and wipes all
              associated vector chunks from Pinecone. This cannot be undone.
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
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ padding: "8px 14px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-solid"
                onClick={handleDelete}
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

