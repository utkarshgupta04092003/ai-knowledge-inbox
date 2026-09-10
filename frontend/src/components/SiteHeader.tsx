import { Inbox } from "lucide-react";
import type { HealthStatus } from "../hooks/useHealthStatus";

const statusLabel: Record<HealthStatus, string> = {
  checking: "Connecting",
  connected: "API online",
  error: "API offline",
};

export function SiteHeader({ status }: { status: HealthStatus }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Knowledge Inbox home">
        <span className="brand-mark">
          <Inbox size={20} strokeWidth={2.2} />
        </span>
        <span>
          <strong>Knowledge Inbox</strong>
          <small>AI workspace</small>
        </span>
      </a>

      <div className={`header-status status-${status}`}>
        <span className="status-dot" />
        {statusLabel[status]}
      </div>
    </header>
  );
}
