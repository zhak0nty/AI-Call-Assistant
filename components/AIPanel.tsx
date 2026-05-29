"use client";
import { useEffect, useRef } from "react";
import type { AIMessage } from "@/hooks/useAIAssistant";

interface Props {
  messages: AIMessage[];
  isProcessing: boolean;
}

function renderResponse(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("📝") || line.startsWith("💬") || line.startsWith("🔑")) {
        return (
          <p key={i} className="font-semibold mt-2 mb-1 text-sm" style={{ color: "#a5b4fc" }}>
            {line}
          </p>
        );
      }
      if (line.startsWith("•")) {
        return (
          <p key={i} className="text-sm pl-2 py-0.5" style={{ color: "var(--text-primary)" }}>
            {line}
          </p>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-1" />;
      return (
        <p key={i} className="text-sm" style={{ color: "var(--text-primary)" }}>
          {line}
        </p>
      );
    });
}

export default function AIPanel({ messages, isProcessing }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#a5b4fc" }}
        >
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          AI Ответы
        </span>
        {isProcessing && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(165,180,252,0.15)", color: "#a5b4fc" }}
          >
            Думаю...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-secondary)" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              AI ответы появятся здесь<br />автоматически
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="slide-in rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <div
              className="px-3 py-2 text-xs"
              style={{ background: "rgba(165,180,252,0.08)", color: "var(--text-secondary)" }}
            >
              <span style={{ color: "#a5b4fc" }}>→</span>{" "}
              <span className="italic truncate block max-w-full">
                &quot;{msg.trigger.slice(0, 80)}{msg.trigger.length > 80 ? "..." : ""}&quot;
              </span>
            </div>
            <div
              className="p-3"
              style={{ background: "var(--bg-card)" }}
            >
              {msg.response ? (
                <div className={msg.isStreaming ? "typing-cursor" : ""}>
                  {renderResponse(msg.response)}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Анализирую
                  </span>
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#a5b4fc",
                          animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
