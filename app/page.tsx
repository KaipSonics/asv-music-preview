"use client";

import { useState } from "react";
import {
  GENRES,
  MOODS,
  TEMPO_MIN,
  TEMPO_MAX,
  TEMPO_DEFAULT,
  type Genre,
  type Mood,
} from "@/lib/options";

const TELEGRAM_URL = "https://t.me/asv_familyl";

type Result = { audioUrl: string; title: string; prompt: string };

export default function Home() {
  const [genre, setGenre] = useState<Genre>("Pop");
  const [mood, setMood] = useState<Mood>("Energetic");
  const [tempo, setTempo] = useState<number>(TEMPO_DEFAULT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, mood, tempo }),
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
          Генератор <span className="accent">аудио-превью</span>
        </h1>
        <p>
          Выбери жанр, настроение и темп — нейросеть создаст короткий хук.
          Послушай и обсуди свой трек с нами.
        </p>
      </header>

      <section className="panel">
        {/* Жанр */}
        <div className="field">
          <div className="field-label">Жанр</div>
          <div className="chips">
            {GENRES.map((g) => (
              <button
                key={g}
                className={`chip ${genre === g ? "active" : ""}`}
                onClick={() => setGenre(g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Настроение */}
        <div className="field">
          <div className="field-label">Настроение</div>
          <div className="chips">
            {MOODS.map((m) => (
              <button
                key={m}
                className={`chip ${mood === m ? "active" : ""}`}
                onClick={() => setMood(m)}
                type="button"
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Темп */}
        <div className="field">
          <div className="field-label">Темп</div>
          <div className="tempo-row">
            <input
              type="range"
              min={TEMPO_MIN}
              max={TEMPO_MAX}
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
            />
            <div className="tempo-value">
              {tempo} <span>BPM</span>
            </div>
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
            <div className="desc">{tempo} BPM · превью-хук</div>
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
