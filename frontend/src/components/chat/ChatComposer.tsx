import { Loader2, Search, Sparkles } from "lucide-react";
import React from "react";

interface ChatComposerProps {
  question: string;
  onChangeQuestion: (val: string) => void;
  onSubmit: (query?: string) => void;
  loading: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  question,
  onChangeQuestion,
  onSubmit,
  loading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="chat-composer">
      <form onSubmit={handleSubmit} className="composer-input-row">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="composer-input"
          placeholder="Ask a follow-up or query your inbox knowledge..."
          value={question}
          onChange={(e) => onChangeQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="composer-send-btn"
          disabled={loading || !question.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Send
            </>
          )}
        </button>
      </form>
    </div>
  );
};
