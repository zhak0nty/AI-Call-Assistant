"use client";
import { useEffect, useRef } from "react";
export interface DisplaySegment {
  id: string;
  text: string;
  timestamp: Date;
}

interface Props {
  segments: DisplaySegment[];
  interimText: string;
  isListening: boolean;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TranscriptPanel({
  segments,
  interimText,
  isListening,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments, interimText]);

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
          style={{ color: "var(--accent)" }}
        >
          <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Транскрипция
        </span>
        {isListening && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}
          >
            LIVE
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {segments.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-secondary)" }}>
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              Нажми кнопку записи<br />и начни говорить
            </p>
          </div>
        )}

        {segments.map((seg) => (
          <div
            key={seg.id}
            className="slide-in rounded-xl p-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {formatTime(seg.timestamp)}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {seg.text}
            </p>
          </div>
        ))}

        {interimText && (
          <div
            className="rounded-xl p-3"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid rgba(108,99,255,0.2)",
            }}
          >
            <p className="text-xs mb-1.5" style={{ color: "var(--accent)" }}>
              Слушаю...
            </p>
            <p className="text-sm leading-relaxed italic" style={{ color: "var(--text-secondary)" }}>
              {interimText}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
