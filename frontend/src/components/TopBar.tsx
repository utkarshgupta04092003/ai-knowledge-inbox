import { ChevronDown, FileCode2, Package, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface TopBarProps {
  onSearch?: (query: string) => void;
  onNavigate: (path: string) => void;
}

export function TopBar({ onSearch, onNavigate }: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById(
          "global-search-input",
        ) as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    if (onSearch) {
      onSearch(searchValue.trim());
    } else {
      onNavigate(`/query?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <header className="top-bar">
      <div
        className="mobile-brand"
        onClick={() => onNavigate("/")}
        role="button"
        tabIndex={0}
        title="Knowledge Inbox Home"
      >
        <div className="mobile-brand-icon">
          <Package size={16} />
        </div>
        <span className="mobile-brand-name">Inbox</span>
      </div>

      <form onSubmit={handleSearchSubmit} className="top-search-form">
        <Search size={16} className="top-search-icon" />
        <input
          id="global-search-input"
          type="text"
          className="top-search-input"
          placeholder="Search your knowledge..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <div className="top-search-shortcut">
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </div>
      </form>

      <div className="top-bar-right">
        <a
          href="/api-docs/"
          target="_blank"
          rel="noreferrer noopener"
          className="top-icon-btn"
          title="Open Swagger API documentation"
        >
          <FileCode2 size={16} />
        </a>

        <button type="button" className="top-icon-btn" title="Theme">
          <Sun size={16} />
        </button>

        <div className="user-profile-pill">
          <span className="user-avatar">U</span>
          <span className="user-name">Utkarsh Gupta</span>
          <ChevronDown size={14} className="user-chevron" />
        </div>
      </div>
    </header>
  );
}
