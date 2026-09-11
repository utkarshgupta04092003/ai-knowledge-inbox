import { Home, Plus, BookOpen, MessageSquare, Settings, HelpCircle, Package } from "lucide-react";
import type { Route } from "../router";

interface SidebarProps {
  currentRoute: Route;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const isHome = currentRoute.name === "home";
  const isAdd = currentRoute.name === "add";
  const isLibrary = currentRoute.name === "library" || currentRoute.name === "item-detail";
  const isQuery = currentRoute.name === "query";

  return (
    <aside className="app-sidebar" aria-label="Application Sidebar">
      {/* Brand */}
      <div
        className="sidebar-brand"
        onClick={() => onNavigate("/")}
        role="button"
        tabIndex={0}
      >
        <div className="sidebar-brand-icon">
          <Package size={18} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">Knowledge Inbox</span>
          <span className="sidebar-brand-tagline">Save. Search. Understand.</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-nav-btn ${isHome ? "active" : ""}`}
          onClick={() => onNavigate("/")}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isAdd ? "active" : ""}`}
          onClick={() => onNavigate("/add")}
        >
          <Plus size={18} />
          <span>Add Knowledge</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isLibrary ? "active" : ""}`}
          onClick={() => onNavigate("/library")}
        >
          <BookOpen size={18} />
          <span>Library</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isQuery ? "active" : ""}`}
          onClick={() => onNavigate("/query")}
        >
          <MessageSquare size={18} />
          <span>Ask AI</span>
        </button>
      </nav>

      {/* Bottom section */}
      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-nav-btn secondary-btn"
          onClick={() => onNavigate("/api-docs/")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <a
          href="/api-docs/"
          target="_blank"
          rel="noreferrer noopener"
          className="sidebar-nav-btn secondary-btn"
        >
          <HelpCircle size={18} />
          <span>Help</span>
        </a>

        {/* Callout Card */}
        <div className="sidebar-callout-card">
          <strong className="callout-title">
            Your knowledge today, better decisions tomorrow.
          </strong>
          <p className="callout-desc">
            A simpler way to turn information into insights.
          </p>
          <div className="callout-wave" />
        </div>
      </div>
    </aside>
  );
}
