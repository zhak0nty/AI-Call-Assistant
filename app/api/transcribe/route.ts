import { NextRequest, NextResponse } from "next/server";

// Phrases Whisper commonly hallucinates on silence or near-silence
const HALLUCINATION_PATTERNS = [
  /^продолжение следует\.?\.?\.?$/i,
  /^subtitles? by/i,
  /^субтитры/i,
  /^amara\.org/i,
  /^www\./i,
  /^\[.{0,30}\]$/,          // [музыка], [тишина], [аплодисменты] etc
  /^\(.{0,30}\)$/,          // (music), (silence) etc
  /^(спасибо|thank you|thanks)\.?$/i,
  /^\.{1,5}$/,              // just dots
  /^-{1,5}$/,               // just dashes
  /^ладно\.?$/i,
  /^ок\.?$/i,
  /^да\.?$/i,
];

function isHallucination(text: string): boolean {
  if (!text || text.length < 2) return true;
  return HALLUCINATION_PATTERNS.some((re) => re.test(text.trim()));
}

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob | null;

  if (!audio || audio.size < 100) {
    return NextResponse.json({ text: "" });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = groqKey ?? openaiKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Нет API ключа для транскрипции. Добавь GROQ_API_KEY или OPENAI_API_KEY в .env.local" },
      { status: 500 }
    );
  }

  const apiUrl = groqKey ? GROQ_URL : OPENAI_URL;
  const model = groqKey ? "whisper-large-v3-turbo" : "whisper-1";

  const body = new FormData();
  body.append("file", audio, "audio.webm");
  body.append("model", model);
  body.append("language", "ru");
  body.append("response_format", "text");

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Whisper API error:", errText);
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const text = await res.text();
    const cleaned = text.trim();

    // Whisper hallucinations on silence — return empty so client skips
    if (isHallucination(cleaned)) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text: cleaned });
  } catch (err) {
    console.error("Transcribe fetch error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
