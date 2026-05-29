"use client";
import { useCallback, useRef, useState } from "react";

const CHUNK_DURATION_MS = 3000;

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export type CaptureMode = "display" | "device" | null;

export interface UseSystemAudioReturn {
  isCapturing: boolean;
  captureMode: CaptureMode;
  audioDevices: AudioDevice[];
  error: string | null;
  startDisplayCapture: () => Promise<void>;
  startDeviceCapture: (deviceId: string) => Promise<void>;
  stopCapture: () => void;
  loadDevices: () => Promise<void>;
}

export function useSystemAudio(
  onTranscript: (text: string) => void
): UseSystemAudioReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isActiveRef = useRef(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>("");

  const getMimeType = () =>
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

  const sendBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1000) return;
      const form = new FormData();
      form.append("audio", blob, "chunk.webm");
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.text?.trim()) {
          const t = data.text.trim();
          // Skip if identical to previous segment (Whisper repeating itself on silence)
          if (t !== lastTranscriptRef.current) {
            lastTranscriptRef.current = t;
            setError(null);
            onTranscript(t);
          }
        }
      } catch (err) {
        console.error("Transcription fetch error:", err);
      }
    },
    [onTranscript]
  );

  // Stop-restart cycle: each cycle produces a valid, self-contained WebM file
  const runCycle = useCallback(() => {
    if (!isActiveRef.current || !audioStreamRef.current) return;

    const mimeType = getMimeType();
    const recorder = new MediaRecorder(audioStreamRef.current, { mimeType });
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      sendBlob(blob);
      if (isActiveRef.current) {
        // small gap to avoid overlapping recorders
        cycleTimerRef.current = setTimeout(runCycle, 100);
      }
    };

    recorder.start();

    cycleTimerRef.current = setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, CHUNK_DURATION_MS);
  }, [sendBlob]);

  const beginCapture = useCallback(
    (audioStream: MediaStream, mode: CaptureMode) => {
      audioStreamRef.current = audioStream;
      isActiveRef.current = true;
      setCaptureMode(mode);
      setIsCapturing(true);
      setError(null);
      runCycle();
    },
    [runCycle]
  );

  const stopCapture = useCallback(() => {
    isActiveRef.current = false;
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    setIsCapturing(false);
    setCaptureMode(null);
  }, []);

  const startDisplayCapture = useCallback(async () => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        audio: true,
        video: { frameRate: 1 },
      });

      displayStreamRef.current = displayStream;

      const audioTracks: MediaStreamTrack[] = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setError('Аудио не захвачено — при выборе вкладки поставь галочку "Поделиться звуком"');
        return;
      }

      const audioStream = new MediaStream(audioTracks);
      displayStream.getVideoTracks()[0]?.addEventListener("ended", stopCapture);
      audioTracks[0].addEventListener("ended", stopCapture);

      beginCapture(audioStream, "display");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "NotAllowedError") {
        setError(`Ошибка захвата: ${err.message}`);
      }
    }
  }, [beginCapture, stopCapture]);

  const startDeviceCapture = useCallback(
    async (deviceId: string) => {
      setError(null);
      try {
        // Use minimal constraints to avoid OverconstrainedError
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { ideal: deviceId } },
        });
        beginCapture(stream, "device");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Не удалось подключиться к устройству: ${msg}`);
      }
    },
    [beginCapture]
  );

  const loadDevices = useCallback(async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach((t) => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(
        all
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Микрофон (${d.deviceId.slice(0, 8)})`,
          }))
      );
    } catch (err) {
      console.error("Device list error:", err);
    }
  }, []);

  return {
    isCapturing,
    captureMode,
    audioDevices,
    error,
    startDisplayCapture,
    startDeviceCapture,
    stopCapture,
    loadDevices,
  };
}
