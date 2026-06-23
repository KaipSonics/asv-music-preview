// app/api/generate/route.ts
// Серверный роут: принимает выбор пользователя, генерирует НЕСКОЛЬКО вариантов превью.
// Работает на сервере Railway (вне РФ), поэтому пользователю VPN не нужен.
//
// AUDIO_PROVIDER=demo → возвращаем заранее записанные демо-клипы (звук уже слышно,
// пока не подключён платный генератор). Любой другой провайдер → реальная генерация.

import { NextRequest, NextResponse } from "next/server";
import { generateAudio } from "@/lib/musicgen";
import {
  GENRE_OPTIONS,
  MOODS,
  TEMPOS,
  ELEMENTS,
  buildPrompt,
  type Selection,
  type Genre,
  type MoodLabel,
  type TempoLabel,
} from "@/lib/options";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const VARIANT_NAMES = ["Вариант A", "Вариант B", "Вариант C"];
const DEMO_FILES = ["/demo/a.wav", "/demo/b.wav", "/demo/c.wav"];

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

    const reference =
      typeof body.reference === "string" ? body.reference.trim().slice(0, 600) : "";

    const basePrompt = buildPrompt(sel);
    const prompt = reference ? `${basePrompt} Reference notes: ${reference}.` : basePrompt;

    // Метаданные — одни на все варианты (показываем в каждой карточке)
    const meta = {
      beat: sel.beat,
      bass: sel.bass,
      melody: sel.melody,
      mood: sel.mood,
      tempo: sel.tempo,
    };

    const provider = (process.env.AUDIO_PROVIDER || "demo").toLowerCase();

    let variants: { name: string; audioUrl: string }[];

    if (provider === "demo") {
      variants = VARIANT_NAMES.map((name, i) => ({ name, audioUrl: DEMO_FILES[i] }));
    } else {
      // Реальная генерация: 3 варианта параллельно, с лёгкой вариацией промпта
      const results = await Promise.all(
        VARIANT_NAMES.map((_, i) =>
          generateAudio(`${prompt} (variation ${i + 1})`)
        )
      );
      variants = results.map((r, i) => ({
        name: VARIANT_NAMES[i],
        audioUrl: r.audioUrl,
      }));
    }

    return NextResponse.json({ meta, variants, prompt });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    console.error("Ошибка генерации:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
