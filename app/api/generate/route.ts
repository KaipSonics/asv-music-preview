// app/api/generate/route.ts
// Серверный роут: принимает выбор пользователя, генерирует аудио.
// Работает на сервере Railway (вне РФ), поэтому пользователю VPN не нужен.

import { NextRequest, NextResponse } from "next/server";
import { generateAudio } from "@/lib/musicgen";
import {
  GENRE_OPTIONS,
  MOODS,
  TEMPOS,
  ELEMENTS,
  buildPrompt,
  buildTitle,
  buildSubtitle,
  type Selection,
  type Genre,
  type MoodLabel,
  type TempoLabel,
} from "@/lib/options";

// Генерация может занять до минуты — даём роуту время.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Собираем и валидируем выбор по элементам
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

    // Необязательный комментарий к референсу (помогает и модели, и заявке)
    const reference =
      typeof body.reference === "string" ? body.reference.trim().slice(0, 600) : "";

    let prompt = buildPrompt(sel);
    if (reference) prompt += ` Reference notes: ${reference}.`;

    const result = await generateAudio(prompt);

    return NextResponse.json({
      audioUrl: result.audioUrl,
      prompt,
      title: buildTitle(sel),
      subtitle: buildSubtitle(sel),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    console.error("Ошибка генерации:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
