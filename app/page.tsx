"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSystemAudio } from "@/hooks/useSystemAudio";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import TranscriptPanel from "@/components/TranscriptPanel";
import type { DisplaySegment } from "@/components/TranscriptPanel";
import AIPanel from "@/components/AIPanel";

type AppMode = "mic" | "system";
type SystemSubMode = "display" | "device";

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("system");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [systemSubMode, setSystemSubMode] = useState<SystemSubMode>("display");
  const [elapsed, setElapsed] = useState(0);
  const [sysSegments, setSysSegments] = useState<DisplaySegment[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { messages, isProcessing, handleNewTranscript, clearMessages, sendToAI } =
    useAIAssistant();

  // ── Microphone mode (Web Speech API) ──────────────────────────────────
  const {
    isListening,
    segments: micSegments,
    interimText,
    startListening,
    stopListening,
    clearSegments: clearMicSegments,
    isSupported,
  } = useSpeechRecognition(handleNewTranscript);

  // ── System audio mode (MediaRecorder → Whisper) ───────────────────────
  const sysTranscriptHandler = useCallback(
    (text: string) => {
      setSysSegments((prev) => [
        ...prev,
        { id: `${Date.now()}`, text, timestamp: new Date() },
      ]);
      handleNewTranscript(text);
    },
    [handleNewTranscript]
  );

  const {
    isCapturing,
    audioDevices,
    error: sysError,
    startDisplayCapture,
    startDeviceCapture,
    stopCapture,
    loadDevices,
  } = useSystemAudio(sysTranscriptHandler);

  useEffect(() => {
    if (appMode === "system") loadDevices();
  }, [appMode, loadDevices]);

  // ── Timer ─────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────
  const isActive = appMode === "mic" ? isListening : isCapturing;

  const handleStart = useCallback(async () => {
    startTimer();
    if (appMode === "mic") {
      startListening();
    } else if (systemSubMode === "display") {
      await startDisplayCapture();
    } else if (selectedDevice) {
      await startDeviceCapture(selectedDevice);
    }
  }, [appMode, systemSubMode, selectedDevice, startListening, startDisplayCapture, startDeviceCapture, startTimer]);

  const handleStop = useCallback(() => {
    stopTimer();
    if (appMode === "mic") stopListening();
    else stopCapture();
  }, [appMode, stopListening, stopCapture, stopTimer]);

  const handleClear = useCallback(() => {
    clearMicSegments();
    clearMessages();
    setSysSegments([]);
    setElapsed(0);
  }, [clearMicSegments, clearMessages]);

  const handleAnalyzeAll = useCallback(() => {
    const all =
      appMode === "mic"
        ? micSegments.map((s) => s.text).join(" ")
        : sysSegments.map((s) => s.text).join(" ");
    if (all.trim()) sendToAI(all);
  }, [appMode, micSegments, sysSegments, sendToAI]);

  const segments: DisplaySegment[] =
    appMode === "mic"
      ? micSegments.map((s) => ({ id: s.id, text: s.text, timestamp: s.timestamp }))
      : sysSegments;

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const canStart =
    appMode === "mic"
      ? isSupported
      : systemSubMode === "display" || !!selectedDevice;

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 border-b"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6c63ff, #8b5cf6)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              AI Call Assistant
            </h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Транскрипция + AI в реальном времени
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isActive && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--danger)" }} />
              <span className="text-sm font-mono" style={{ color: "var(--danger)" }}>
                {formatElapsed(elapsed)}
              </span>
            </div>
          )}
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {segments.length} фраз · {messages.length} ответов
          </span>
          {segments.length > 0 && !isProcessing && (
            <button
              onClick={handleAnalyzeAll}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(108,99,255,0.25)" }}
            >
              Анализировать всё
            </button>
          )}
          {(segments.length > 0 || messages.length > 0) && (
            <button
              onClick={handleClear}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Очистить
            </button>
          )}
        </div>
      </header>

      {/* ── Controls bar ── */}
      <div
        className="shrink-0 px-5 py-3 border-b"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode tabs */}
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--bg-card)" }}>
            {(["system", "mic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { if (!isActive) setAppMode(m); }}
                disabled={isActive}
                className="text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer disabled:opacity-50"
                style={
                  appMode === m
                    ? { background: "var(--accent)", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {m === "system" ? "🎧 Аудио звонка" : "🎤 Микрофон"}
              </button>
            ))}
          </div>

          {/* System sub-mode */}
          {appMode === "system" && !isActive && (
            <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--bg-card)" }}>
              {(["display", "device"] as const).map((sm) => (
                <button
                  key={sm}
                  onClick={() => setSystemSubMode(sm)}
                  className="text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer"
                  style={
                    systemSubMode === sm
                      ? { background: "rgba(108,99,255,0.35)", color: "#c4b5fd" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {sm === "display" ? "📺 Вкладка браузера" : "🔊 Устройство (BlackHole)"}
                </button>
              ))}
            </div>
          )}

          {/* Device selector */}
          {appMode === "system" && systemSubMode === "device" && !isActive && (
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              <option value="">— выбери устройство —</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
          )}

          {/* Start / Stop */}
          <div className="ml-auto">
            {!isActive ? (
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(108,99,255,0.35)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                Начать запись
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer pulse-ring"
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(239,68,68,0.35)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Остановить
              </button>
            )}
          </div>
        </div>

        {/* Hints / errors */}
        <div className="mt-2">
          {sysError && (
            <p className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
              ⚠ {sysError}
            </p>
          )}
          {!sysError && appMode === "system" && systemSubMode === "display" && !isActive && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Выбери вкладку с звонком и поставь галочку{" "}
              <strong style={{ color: "var(--text-primary)" }}>&quot;Поделиться звуком&quot;</strong>
            </p>
          )}
          {!sysError && appMode === "system" && systemSubMode === "device" && !isActive && !selectedDevice && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Нет BlackHole? Установи:{" "}
              <span style={{ color: "#a5b4fc" }}>brew install blackhole-2ch</span>
              {" "}→ в Audio MIDI Setup создай Multi-Output Device (BlackHole + Динамики) → поставь его как системный выход звука
            </p>
          )}
          {appMode === "system" && isActive && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Запись идёт кусками по 6 сек → транскрибируется → отправляется в AI
            </p>
          )}
          {appMode === "mic" && !isActive && !isSupported && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              Браузер не поддерживает распознавание речи. Используй Chrome или Edge.
            </p>
          )}
        </div>
      </div>

      {/* ── Main panels ── */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col border-r"
          style={{ width: "45%", borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <TranscriptPanel
            segments={segments}
            interimText={appMode === "mic" ? interimText : ""}
            isListening={isActive}
          />
        </div>
        <div className="flex flex-col" style={{ width: "55%", background: "var(--bg-primary)" }}>
          <AIPanel messages={messages} isProcessing={isProcessing} />
        </div>
      </div>
    </div>
  );
}
