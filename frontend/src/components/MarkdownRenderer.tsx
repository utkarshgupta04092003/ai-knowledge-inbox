import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses bracket citations like [Source 1], [Source 2] into styled citation pills.
 */
function renderTextWithCitations(text: string): React.ReactNode {
  const citationRegex = /(\[Source\s+\d+\])/g;
  const parts = text.split(citationRegex);

  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (citationRegex.test(part)) {
      return (
        <span key={index} className="markdown-citation-pill">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          p({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return renderTextWithCitations(child);
              }
              return child;
            });
            return <p>{processedChildren}</p>;
          },
          li({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return renderTextWithCitations(child);
              }
              return child;
            });
            return <li>{processedChildren}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
