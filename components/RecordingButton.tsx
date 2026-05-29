"use client";

interface Props {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordingButton({
  isListening,
  isSupported,
  onStart,
  onStop,
}: Props) {
  if (!isSupported) {
    return (
      <div className="text-center">
        <p style={{ color: "var(--danger)" }} className="text-sm">
          Браузер не поддерживает распознавание речи.
        </p>
        <p style={{ color: "var(--text-secondary)" }} className="text-xs mt-1">
          Используйте Chrome или Edge
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={isListening ? onStop : onStart}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-200 cursor-pointer ${
          isListening
            ? "pulse-ring"
            : "hover:scale-105 active:scale-95"
        }`}
        style={{
          background: isListening
            ? "var(--danger)"
            : "linear-gradient(135deg, var(--accent), #8b5cf6)",
          boxShadow: isListening
            ? "0 0 20px rgba(239,68,68,0.3)"
            : "0 4px 20px rgba(108,99,255,0.3)",
        }}
      >
        {isListening ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      <span
        className="text-xs font-medium"
        style={{
          color: isListening ? "var(--danger)" : "var(--text-secondary)",
        }}
      >
        {isListening ? "● Идёт запись..." : "Нажми для начала"}
      </span>
    </div>
  );
}
