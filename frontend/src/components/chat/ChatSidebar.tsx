import {
  Check,
  Edit2,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";
import type { ChatSessionSummary } from "../../types/api.types.js";

interface ChatSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  loadingSessions: boolean;
  mobileSidebarOpen: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => Promise<void>;
  onDeleteSession: (id: string, e: React.MouseEvent) => Promise<void>;
  onCloseMobile?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  loadingSessions,
  mobileSidebarOpen,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onCloseMobile,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  const handleStartRename = (
    session: ChatSessionSummary,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const handleSaveRename = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitleInput.trim()) {
      setEditingSessionId(null);
      return;
    }
    await onRenameSession(id, editTitleInput.trim());
    setEditingSessionId(null);
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="chat-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`chat-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <MessageSquare size={16} color="var(--primary)" />
            <span>Conversations</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              className="new-chat-btn"
              onClick={() => {
                onNewChat();
                if (onCloseMobile) onCloseMobile();
              }}
              title="Start new conversation"
            >
              <Plus size={14} />
              New
            </button>
            {onCloseMobile && (
              <button
                type="button"
                className="mobile-sidebar-close"
                onClick={onCloseMobile}
                title="Close chat history"
                aria-label="Close chat history"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

      <div className="session-list">
        {loadingSessions && sessions.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              color: "var(--text-muted)",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <Loader2 size={16} className="spin" />
            Loading chats...
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 12px",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}
          >
            No conversations yet.
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isEditing = s.id === editingSessionId;

            return (
              <div
                key={s.id}
                className={`session-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (!isEditing) {
                    onSelectSession(s.id);
                  }
                }}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => void handleSaveRename(s.id, e)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      width: "100%",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      className="rename-input"
                      value={editTitleInput}
                      onChange={(e) => setEditTitleInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="session-action-btn"
                      title="Save title"
                    >
                      <Check size={13} color="var(--primary)" />
                    </button>
                    <button
                      type="button"
                      className="session-action-btn"
                      onClick={() => setEditingSessionId(null)}
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="session-info">
                      <span className="session-item-title" title={s.title}>
                        {s.title}
                      </span>
                      <div className="session-item-meta">
                        <span className="session-turn-badge">
                          {s.turnCount} turn{s.turnCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="session-actions">
                      <button
                        type="button"
                        className="session-action-btn"
                        onClick={(e) => handleStartRename(s, e)}
                        title="Rename conversation"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        className="session-action-btn delete"
                        onClick={(e) => void onDeleteSession(s.id, e)}
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
    </>
  );
};
