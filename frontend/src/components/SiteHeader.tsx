import {
  ExternalLink,
  FileCode2,
  FolderOpen,
  Inbox,
  Plus,
  Sparkles,
} from "lucide-react";
import type { HealthStatus } from "../hooks/useHealthStatus";

export type NavTab = "query" | "feed" | "add";

const statusLabel: Record<HealthStatus, string> = {
  checking: "Connecting",
  connected: "API online",
  error: "API offline",
};

interface SiteHeaderProps {
  status: HealthStatus;
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  itemCount?: number;
}

export function SiteHeader({
  status,
  activeTab = "query",
  onTabChange,
  itemCount = 0,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Knowledge Inbox home">
        <span className="brand-mark">
          <Inbox size={20} strokeWidth={2.2} />
        </span>
        <span>
          <strong>Knowledge Inbox</strong>
          <small>Self-RAG workspace</small>
        </span>
      </a>

      {onTabChange && (
        <nav
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
          aria-label="Primary navigation"
        >
          <button
            type="button"
            className={`nav-tab ${activeTab === "query" ? "active" : ""}`}
            onClick={() => onTabChange("query")}
          >
            <Sparkles size={15} />
            Ask & Search
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "feed" ? "active" : ""}`}
            onClick={() => onTabChange("feed")}
          >
            <FolderOpen size={15} />
            Inbox
            {itemCount > 0 && <span className="badge">{itemCount}</span>}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "add" ? "active" : ""}`}
            onClick={() => onTabChange("add")}
          >
            <Plus size={15} />
            Add Content
          </button>
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <a
          href="/api-docs/"
          target="_blank"
          rel="noreferrer noopener"
          className="nav-link-ext"
          title="Open Swagger API documentation"
        >
          <FileCode2 size={15} />
          <span>Swagger Docs</span>
          <ExternalLink size={12} />
        </a>

        <div className={`header-status status-${status}`}>
          <span className="status-dot" />
          {statusLabel[status]}
        </div>
      </div>
    </header>
  );
}
