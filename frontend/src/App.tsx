import { Hero } from "./components/Hero";
import { SiteHeader } from "./components/SiteHeader";
import { SystemStatus } from "./components/SystemStatus";
import { useHealthStatus } from "./hooks/useHealthStatus";

export default function App() {
  const health = useHealthStatus();

  return (
    <div className="app-shell">
      <SiteHeader status={health.status} />

      <main className="main-content">
        <Hero />
        <SystemStatus {...health} />
      </main>

      <footer>
        <span>Knowledge Inbox</span>
        <span className="footer-separator" />
        <span>Foundation build</span>
      </footer>
    </div>
  );
}
