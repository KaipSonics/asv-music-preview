"use client";

import { useState } from "react";
import {
  ANY,
  GENRE_OPTIONS,
  ELEMENTS,
  MOODS,
  CHARACTERS,
  type GenreOrAny,
  type MoodLabel,
  type CharacterLabel,
} from "@/lib/options";

const TELEGRAM_URL = "https://t.me/asv_familyl";

type Result = { audioUrl: string; title: string; subtitle: string };

export default function Home() {
  // Жанр по каждому элементу (по умолчанию «Любой»)
  const [beat, setBeat] = useState<GenreOrAny>(ANY);
  const [bass, setBass] = useState<GenreOrAny>(ANY);
  const [harmony, setHarmony] = useState<GenreOrAny>(ANY);
  const [lead, setLead] = useState<GenreOrAny>(ANY);

  const [mood, setMood] = useState<MoodLabel>("Энергично");
  const [character, setCharacter] = useState<CharacterLabel>("Драйв");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const setters: Record<string, (v: GenreOrAny) => void> = {
    beat: setBeat,
    bass: setBass,
    harmony: setHarmony,
    lead: setLead,
  };
  const values: Record<string, GenreOrAny> = { beat, bass, harmony, lead };

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beat, bass, harmony, lead, mood, character }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сгенерировать");
      setResult(data as Result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header className="hero">
        <span className="badge">ASV Production</span>
        <h1>
          Собери свой <span className="accent">трек</span>
        </h1>
        <p>
          Выбери жанр для каждого элемента, настроение и характер —
          нейросеть соберёт уникальное превью. Эклектика приветствуется.
        </p>
      </header>

      <section className="panel">
        {/* Элементы трека */}
        <div className="field">
          <div className="field-label">Жанр по элементам</div>
          <div className="elements">
            {ELEMENTS.map((el) => (
              <div className="element-row" key={el.key}>
                <div className="element-name">{el.label}</div>
                <div className="chips">
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      className={`chip ${values[el.key] === g ? "active" : ""} ${
                        g === ANY ? "chip-any" : ""
                      }`}
                      onClick={() => setters[el.key](g)}
                      type="button"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Настроение */}
        <div className="field">
          <div className="field-label">Настроение</div>
          <div className="chips">
            {MOODS.map((m) => (
              <button
                key={m.label}
                className={`chip ${mood === m.label ? "active" : ""}`}
                onClick={() => setMood(m.label)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Характер (вместо BPM) */}
        <div className="field">
          <div className="field-label">Характер</div>
          <div className="chips">
            {CHARACTERS.map((c) => (
              <button
                key={c.label}
                className={`chip ${character === c.label ? "active" : ""}`}
                onClick={() => setCharacter(c.label)}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading}
          type="button"
        >
          {loading ? "Генерирую…" : "Создать превью"}
        </button>

        <div className={`status ${error ? "error" : ""}`}>
          {loading && (
            <>
              <span className="spinner" />
              Нейросеть работает — это может занять до минуты…
            </>
          )}
          {error && <>⚠ {error}</>}
        </div>

        {result && (
          <div className="result">
            <h3>{result.title}</h3>
            <div className="desc">{result.subtitle}</div>
            <audio controls controlsList="nodownload" src={result.audioUrl}>
              Ваш браузер не поддерживает аудио.
            </audio>
          </div>
        )}
      </section>

      <div className="cta">
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          Обсудить проект →
        </a>
      </div>

      <p className="footnote">
        Превью генерируется ИИ и доступно только для прослушивания. © ASV Production
      </p>
    </main>
  );
}
