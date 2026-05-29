"use client";
import { useCallback, useRef, useState } from "react";

export interface AIMessage {
  id: string;
  trigger: string;
  response: string;
  timestamp: Date;
  isStreaming: boolean;
}

// Send to AI only when there are enough words AND speech paused for 3s
const MIN_WORDS = 12;
const PAUSE_BEFORE_SEND_MS = 3000;

export function useAIAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const sendToAI = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;

    const messageId = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: messageId, trigger: text, response: "", timestamp: new Date(), isStreaming: true },
    ]);
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullResponse += parsed.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, response: fullResponse } : m))
              );
            }
          } catch { /* skip */ }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, response: "Ошибка соединения с AI.", isStreaming: false }
            : m
        )
      );
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  const handleNewTranscript = useCallback(
    (text: string) => {
      pendingTextRef.current += " " + text;

      if (timerRef.current) clearTimeout(timerRef.current);

      const wordCount = pendingTextRef.current.trim().split(/\s+/).length;

      // Fire timer: if enough words — short pause (3s), if not — wait longer
      const delay = wordCount >= MIN_WORDS ? PAUSE_BEFORE_SEND_MS : PAUSE_BEFORE_SEND_MS + 2000;

      timerRef.current = setTimeout(() => {
        const toSend = pendingTextRef.current.trim();
        const words = toSend.split(/\s+/).length;
        if (toSend && words >= MIN_WORDS && !isProcessingRef.current) {
          sendToAI(toSend);
          pendingTextRef.current = "";
        }
      }, delay);
    },
    [sendToAI]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    pendingTextRef.current = "";
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { messages, isProcessing, handleNewTranscript, clearMessages, sendToAI };
}
