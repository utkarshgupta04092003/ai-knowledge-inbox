import { RagQueryPanel } from "../components/RagQueryPanel";

interface AskAiViewProps {
  initialQuestion?: string;
  onNavigate: (path: string) => void;
}

export function AskAiView({ initialQuestion, onNavigate }: AskAiViewProps) {
  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">Ask AI</h1>
          <p className="view-subtitle">
            Synthesize grounded answers strictly from your personal notes and
            ingested web content using iterative Self-RAG.
          </p>
        </div>
      </div>

      <RagQueryPanel
        initialQuestion={initialQuestion}
        onNavigate={onNavigate}
      />
    </div>
  );
}
