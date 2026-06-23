// app/api/generate/route.ts
// Серверный роут: принимает выбор пользователя, генерирует ОДИН референс-файл.
// Лимит: не более 5 генераций в сутки с одного IP.
//
// AUDIO_PROVIDER=demo → демо-клип (звук слышно, пока не подключён GenAPI).
// Любой другой провайдер → реальная генерация.

import { NextRequest, NextResponse } from "next/server";
import { generateAudio, startGenApi } from "@/lib/musicgen";
import {
  GENRE_OPTIONS,
  MOODS,
  TEMPOS,
  ELEMENTS,
  buildPrompt,
  getBpm,
  getSeconds,
  type Selection,
  type Genre,
  type MoodLabel,
  type TempoLabel,
} from "@/lib/options";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const DAILY_LIMIT = 5;
const DEMO_FILES = ["/demo/a.wav", "/demo/b.wav", "/demo/c.wav"];

// Счётчик генераций по IP (в памяти; сбрасывается при рестарте сервера).
const ipHits = new Map<string, { date: string; count: number }>();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Короткий код заявки
function makeCode(): string {
  return (
    "ASV-" +
    (Math.random().toString(36).slice(2, 6) + Date.now().toString(36).slice(-2)).toUpperCase()
  );
}

export async function POST(req: NextRequest) {
  try {
    // ── Лимит 5/сутки с IP ──
    const ip = clientIp(req);
    const rec = ipHits.get(ip);
    const day = today();
    const used = rec && rec.date === day ? rec.count : 0;
    if (used >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `Лимит ${DAILY_LIMIT} генераций в сутки исчерпан. Возвращайтесь завтра 🙂`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // ── Валидация выбора ──
    const sel = {} as Selection;
    for (const el of ELEMENTS) {
      const value = body[el.key] as Genre;
      if (!GENRE_OPTIONS.includes(value)) {
        return NextResponse.json(
          { error: `Неверный жанр для элемента «${el.label}»` },
          { status: 400 }
        );
      }
      sel[el.key] = value;
    }
    const mood = body.mood as MoodLabel;
    const tempo = body.tempo as TempoLabel;
    if (!MOODS.some((m) => m.label === mood)) {
      return NextResponse.json({ error: "Неверное настроение" }, { status: 400 });
    }
    if (!TEMPOS.some((t) => t.label === tempo)) {
      return NextResponse.json({ error: "Неверный темп" }, { status: 400 });
    }
    sel.mood = mood;
    sel.tempo = tempo;

    const reference =
      typeof body.reference === "string" ? body.reference.trim().slice(0, 600) : "";

    const code = makeCode();
    const basePrompt = buildPrompt(sel);
    const prompt = reference ? `${basePrompt} Reference notes: ${reference}.` : basePrompt;
    const seconds = getSeconds(sel);

    // ── Засчитываем попытку (до генерации, чтобы лимит работал и для async) ──
    const newCount = used + 1;
    ipHits.set(ip, { date: day, count: newCount });

    const meta = {
      beat: sel.beat,
      bass: sel.bass,
      melody: sel.melody,
      mood: sel.mood,
      tempo: sel.tempo,
    };
    const base = {
      code,
      reference,
      bpm: getBpm(sel),
      seconds,
      meta,
      remaining: DAILY_LIMIT - newCount,
    };

    // ── Генерация ──
    const provider = (process.env.AUDIO_PROVIDER || "demo").toLowerCase();

    if (provider === "demo") {
      return NextResponse.json({ ...base, audioUrl: DEMO_FILES[used % DEMO_FILES.length] });
    }

    if (provider === "genapi") {
      // Suno долгий (~2.5 мин): стартуем и отдаём requestId, клиент опрашивает
      const requestId = await startGenApi(prompt, { seconds, code, reference });
      return NextResponse.json({ ...base, pending: true, requestId });
    }

    // Быстрые провайдеры (fal/replicate/hf) — синхронно
    const r = await generateAudio(prompt, { seconds, code, reference });
    return NextResponse.json({ ...base, audioUrl: r.audioUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    console.error("Ошибка генерации:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
