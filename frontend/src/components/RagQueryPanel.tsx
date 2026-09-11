import {
  AlertTriangle,
  Bot,
  Cpu,
  Edit2,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  askQueryStream,
  createSession,
  deleteSession,
  fetchSessionById,
  fetchSessions,
  updateSessionTitle,
  type ChatSessionDetail,
  type ChatSessionSummary,
  type ChatTurnData,
} from "../services/api.js";
import { ChatComposer } from "./chat/ChatComposer.js";
import { ChatSidebar } from "./chat/ChatSidebar.js";
import { ChatTurnItem } from "./chat/ChatTurnItem.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";

interface RagQueryPanelProps {
  initialQuestion?: string;
  onNavigate?: (path: string) => void;
}

export function RagQueryPanel({
  initialQuestion,
  onNavigate,
}: RagQueryPanelProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<ChatSessionDetail | null>(
    null,
  );
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>("");
  const [streamingStatus, setStreamingStatus] = useState<string>(
    "Searching knowledge library...",
  );
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionDetail?.turns, loadingQuery, pendingQuestion, streamingAnswer]);

  useEffect(() => {
    let ignore = false;
    fetchSessions()
      .then(async (list) => {
        if (ignore) return;
        if (list.length > 0) {
          setSessions(list);
          setActiveSessionId((prev) => prev ?? list[0].id);
        } else {
          const fresh = await createSession("New Conversation");
          if (ignore) return;
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Failed to load chat sessions.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingSessions(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;

    let ignore = false;
    fetchSessionById(activeSessionId)
      .then((detail) => {
        if (!ignore) {
          setSessionDetail(detail);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Failed to load session details.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingDetail(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeSessionId]);

  const handleSendQuery = async (queryText?: string) => {
    const targetQuery = (queryText ?? question).trim();
    if (!targetQuery || loadingQuery) return;

    setQuestion("");
    setPendingQuestion(targetQuery);
    setStreamingAnswer("");
    setStreamingStatus("Searching knowledge inbox...");
    setLoadingQuery(true);
    setErrorMessage(null);

    const currentSessionId = activeSessionId ?? undefined;
    let resolvedSessionId = currentSessionId;

    try {
      const response = await askQueryStream(targetQuery, currentSessionId, {
        onSessionId: (sid) => {
          resolvedSessionId = sid;
          if (sid !== activeSessionId) {
            setActiveSessionId(sid);
          }
        },
        onStatus: (st) => {
          setStreamingStatus(st.message);
        },
        onDelta: (delta) => {
          setStreamingAnswer((prev) => prev + delta);
        },
      });

      const targetSessionId = response.sessionId ?? resolvedSessionId;
      if (targetSessionId && targetSessionId !== activeSessionId) {
        setActiveSessionId(targetSessionId);
      }

      if (targetSessionId) {
        const freshDetail = await fetchSessionById(targetSessionId);
        setSessionDetail(freshDetail);
      }

      const list = await fetchSessions();
      setSessions(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to execute query.",
      );
    } finally {
      setPendingQuestion(null);
      setStreamingAnswer("");
      setLoadingQuery(false);
    }
  };

  const initialTriggered = useRef(false);
  useEffect(() => {
    if (
      !initialQuestion?.trim() ||
      initialTriggered.current ||
      !activeSessionId
    )
      return;
    initialTriggered.current = true;

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("q")) {
        url.searchParams.delete("q");
        const cleanUrl = url.pathname + (url.search ? url.search : "");
        window.history.replaceState(null, "", cleanUrl);
      }
    } catch {
      // Ignore if URL parsing fails
    }

    const timer = window.setTimeout(() => {
      void handleSendQuery(initialQuestion.trim());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQuestion, activeSessionId]);

  const handleNewChat = async () => {
    try {
      setErrorMessage(null);
      const newSess = await createSession("New Conversation");
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setMobileSidebarOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to create new chat session.",
      );
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    try {
      const updated = await updateSessionTitle(id, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)),
      );
      if (sessionDetail?.id === id) {
        setSessionDetail((prev) =>
          prev ? { ...prev, title: updated.title } : prev,
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to rename session.",
      );
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }
    try {
      await deleteSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          void handleNewChat();
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete session.",
      );
    }
  };

  const totalSessionTokens = sessionDetail?.turns.reduce(
    (acc, turn) => ({
      prompt: acc.prompt + (turn.promptTokens ?? 0),
      completion: acc.completion + (turn.completionTokens ?? 0),
      total: acc.total + (turn.totalTokens ?? 0),
    }),
    { prompt: 0, completion: 0, total: 0 },
  ) ?? { prompt: 0, completion: 0, total: 0 };

  return (
    <div className="chat-layout">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loadingSessions={loadingSessions}
        mobileSidebarOpen={mobileSidebarOpen}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setMobileSidebarOpen(false);
        }}
        onNewChat={() => void handleNewChat()}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className="chat-main">
        <header className="chat-main-header">
          <div className="chat-header-title-wrap">
            <button
              type="button"
              className="mobile-session-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <MessageSquare size={14} />
              Chats ({sessions.length})
            </button>
            <h2 className="chat-header-title" title={sessionDetail?.title}>
              {sessionDetail?.title ?? "Conversation"}
            </h2>
            {sessionDetail && (
              <button
                type="button"
                className="session-action-btn"
                style={{ opacity: 1 }}
                onClick={() => {
                  const newTitle = window.prompt(
                    "Enter new conversation title:",
                    sessionDetail.title,
                  );
                  if (newTitle?.trim()) {
                    void handleRenameSession(sessionDetail.id, newTitle.trim());
                  }
                }}
                title="Rename conversation"
              >
                <Edit2 size={13} />
              </button>
            )}
          </div>

          <div className="chat-header-tokens">
            {totalSessionTokens.total > 0 && (
              <span
                className="token-pill"
                title="Aggregate token metrics for this chat session"
              >
                <Cpu size={12} style={{ marginRight: "2px" }} />
                In: <strong>{totalSessionTokens.prompt}</strong> &bull; Out:{" "}
                <strong>{totalSessionTokens.completion}</strong> &bull; Total:{" "}
                <strong>{totalSessionTokens.total}</strong>
              </span>
            )}
          </div>
        </header>

        <div className="chat-thread">
          {loadingDetail && !sessionDetail ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                gap: "8px",
              }}
            >
              <Loader2 size={20} className="spin" />
              Loading conversation...
            </div>
          ) : sessionDetail?.turns.length === 0 && !pendingQuestion ? (
            <div className="empty-state" style={{ margin: "auto 0" }}>
              <Sparkles size={36} color="var(--primary)" />
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                Start a New Discussion
              </h3>
              <p>
                Ask questions grounded strictly in your personal notes and
                ingested URLs. Answers are iteratively graded with Self-RAG.
              </p>
            </div>
          ) : (
            <>
              {sessionDetail?.turns.map((turn: ChatTurnData) => (
                <ChatTurnItem
                  key={turn.id}
                  turn={turn}
                  onNavigate={onNavigate}
                />
              ))}

              {pendingQuestion && (
                <div className="chat-turn-group">
                  <div className="user-msg-row">
                    <div className="user-bubble">
                      <div>{pendingQuestion}</div>
                      <div className="user-bubble-footer">
                        <span>Thinking...</span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={15} color="var(--text-secondary)" />
                    </div>
                  </div>

                  <div className="assistant-msg-row">
                    <div className="assistant-avatar">
                      <Bot size={16} />
                    </div>
                    {streamingAnswer ? (
                      <div className="assistant-bubble" style={{ flex: 1 }}>
                        <div className="assistant-bubble-header">
                          <div className="assistant-badges">
                            <span className="telemetry-pill">
                              <Loader2
                                size={11}
                                className="spin"
                                style={{
                                  marginRight: "5px",
                                  display: "inline-block",
                                  verticalAlign: "middle",
                                }}
                              />
                              Streaming response...
                            </span>
                          </div>
                        </div>

                        <div className="assistant-markdown-wrap">
                          <MarkdownRenderer content={streamingAnswer} />
                          <span className="streaming-cursor">▊</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="loading-box"
                        style={{ margin: 0, flex: 1 }}
                      >
                        <Loader2
                          size={18}
                          className="spin"
                          color="var(--primary-hover)"
                        />
                        <div>{streamingStatus}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {errorMessage && (
            <div className="alert alert-error">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <ChatComposer
          question={question}
          onChangeQuestion={setQuestion}
          onSubmit={handleSendQuery}
          loading={loadingQuery}
        />
      </main>
    </div>
  );
}
