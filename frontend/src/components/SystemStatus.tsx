import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { HealthStatus } from "../hooks/useHealthStatus";

const statusContent = {
  checking: { label: "Checking connection", detail: "Contacting the API service" },
  connected: { label: "All systems operational", detail: "Frontend and API are connected" },
  error: { label: "API connection unavailable", detail: "Start the backend service and try again" },
} satisfies Record<HealthStatus, { label: string; detail: string }>;

interface SystemStatusProps {
  status: HealthStatus;
  latencyMs: number | null;
  checkHealth: () => Promise<void>;
}

function ConnectionIcon({ status }: { status: HealthStatus }) {
  if (status === "connected") return <ShieldCheck size={24} />;
  if (status === "error") return <AlertTriangle size={23} />;
  return <RefreshCw size={22} className="spin" />;
}

export function SystemStatus({ status, latencyMs, checkHealth }: SystemStatusProps) {
  const content = statusContent[status];
  const isChecking = status === "checking";

  return (
    <section className="system-card" aria-labelledby="system-heading">
      <div className="card-header">
        <div>
          <span className="section-label">System status</span>
          <h2 id="system-heading">Workspace connection</h2>
        </div>
        <div className="server-icon"><Server size={21} /></div>
      </div>

      <div className={`connection-panel status-${status}`}>
        <div className="connection-icon"><ConnectionIcon status={status} /></div>
        <div>
          <h3>{content.label}</h3>
          <p>{content.detail}</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <span>API endpoint</span>
          <strong><Cloud size={15} /> /health</strong>
        </div>
        <div className="metric">
          <span>Response time</span>
          <strong>{latencyMs === null ? "—" : `${latencyMs} ms`}</strong>
        </div>
      </div>

      <button
        className="refresh-button"
        type="button"
        onClick={() => void checkHealth()}
        disabled={isChecking}
      >
        <RefreshCw size={16} className={isChecking ? "spin" : ""} />
        {isChecking ? "Checking connection" : "Run health check"}
        {!isChecking && <ArrowRight size={16} />}
      </button>
    </section>
  );
}
