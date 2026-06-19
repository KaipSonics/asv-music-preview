// app/api/generate/route.ts
// Серверный роут: принимает выбор пользователя, генерирует аудио через MusicGen.
// Работает на сервере Railway (вне РФ), поэтому пользователю VPN не нужен.

import { NextRequest, NextResponse } from "next/server";
import { generateAudio } from "@/lib/musicgen";
import {
  GENRES,
  MOODS,
  TEMPO_MIN,
  TEMPO_MAX,
  buildPrompt,
  type Genre,
  type Mood,
} from "@/lib/options";

// Генерация может занять до минуты — даём роуту время.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const genre = body.genre as Genre;
    const mood = body.mood as Mood;
    const tempo = Number(body.tempo);

    // Валидация входных данных
    if (!GENRES.includes(genre)) {
      return NextResponse.json({ error: "Неверный жанр" }, { status: 400 });
    }
    if (!MOODS.includes(mood)) {
      return NextResponse.json({ error: "Неверное настроение" }, { status: 400 });
    }
    if (!Number.isFinite(tempo) || tempo < TEMPO_MIN || tempo > TEMPO_MAX) {
      return NextResponse.json({ error: "Неверный темп" }, { status: 400 });
    }

    const prompt = buildPrompt(genre, mood, tempo);
    const result = await generateAudio(prompt);

    return NextResponse.json({
      audioUrl: result.audioUrl,
      prompt,
      title: `${mood} ${genre}`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    console.error("Ошибка генерации:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
