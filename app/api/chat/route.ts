import { NextRequest } from "next/server";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM = `Ты умный AI-ассистент для помощи во время звонков и встреч.
Тебе передаётся транскрипция разговора в реальном времени.
Твоя задача:
1. Кратко резюмировать о чём говорит собеседник (1-2 предложения)
2. Предложить 2-3 готовых ответа или реплики которые можно использовать
3. Выделить ключевые факты, вопросы или задачи если они есть

Отвечай на русском языке. Будь конкретным и кратким. Формат:
📝 **Суть:** [краткое резюме]
💬 **Варианты ответа:**
• [вариант 1]
• [вариант 2]
• [вариант 3]
🔑 **Ключевое:** [важные детали, если есть]`;

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();

  if (!transcript?.trim()) {
    return new Response(`data: ${JSON.stringify({ error: "Empty transcript" })}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_key_here") {
    const msg = "⚠️ Добавь GROQ_API_KEY в файл .env.local (бесплатно на console.groq.com)";
    return new Response(
      `data: ${JSON.stringify({ text: msg })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const groqRes = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      stream: true,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Транскрипция:\n"${transcript}"` },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return new Response(
      `data: ${JSON.stringify({ text: `Ошибка Groq: ${err}` })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // Forward Groq SSE stream, extracting text deltas
  const encoder = new TextEncoder();
  const reader = groqRes.body!.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
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
            const text = parsed.choices?.[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          } catch { /* skip malformed */ }
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
