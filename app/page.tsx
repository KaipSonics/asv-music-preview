"use client";

import { useEffect, useState } from "react";
import {
  GENRE_OPTIONS,
  ELEMENTS,
  DEFAULTS,
  MOODS,
  TEMPOS,
  type Genre,
  type MoodLabel,
  type TempoLabel,
} from "@/lib/options";
import VariantCard, { type Meta, type Variant } from "./VariantCard";
import LoadingSteps from "./LoadingSteps";

const TELEGRAM_URL = "https://t.me/asv_familyl";
const STORAGE_KEY = "asv:lastResult";

type GenResult = { meta: Meta; variants: Variant[] };

export default function Home() {
  // Жанр по каждому элементу
  const [beat, setBeat] = useState<Genre>(DEFAULTS.beat);
  const [bass, setBass] = useState<Genre>(DEFAULTS.bass);
  const [melody, setMelody] = useState<Genre>(DEFAULTS.melody);

  const [mood, setMood] = useState<MoodLabel>("Энергичный");
  const [tempo, setTempo] = useState<TempoLabel>("Mid");
  const [reference, setReference] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);

  const setters: Record<string, (v: Genre) => void> = {
    beat: setBeat,
    bass: setBass,
    melody: setMelody,
  };
  const values: Record<string, Genre> = { beat, bass, melody };

  // Восстанавливаем последнюю генерацию из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setResult(JSON.parse(raw) as GenResult);
    } catch {}
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beat, bass, melody, mood, tempo, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сгенерировать");
      const r: GenResult = { meta: data.meta, variants: data.variants };
      setResult(r);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
      } catch {}
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header className="hero">
        <div className="logo">
          <span className="logo-asv">ASV</span>
          <span className="logo-prod">production</span>
        </div>
        <h1>Собери референс будущего трека</h1>
        <p>
          Выбери бит, бас, мелодию, настроение и темп. Получи несколько
          вариантов музыкального превью будущего трека.
        </p>
      </header>

      <section className="panel">
        {/* Элементы трека — выпадающие списки */}
        <div className="field">
          <div className="field-label">Жанр по элементам</div>
          <div className="elements">
            {ELEMENTS.map((el) => (
              <label className="element-row" key={el.key}>
                <span className="element-name">{el.label}</span>
                <div className="select-wrap">
                  <select
                    value={values[el.key]}
                    onChange={(e) => setters[el.key](e.target.value as Genre)}
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
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

        {/* Темп */}
        <div className="field">
          <div className="field-label">Темп</div>
          <div className="chips">
            {TEMPOS.map((t) => (
              <button
                key={t.label}
                className={`chip ${tempo === t.label ? "active" : ""}`}
                onClick={() => setTempo(t.label)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Комментарий к референсу */}
        <div className="field ref">
          <div className="field-label">
            Комментарий к референсу <span>(необязательно)</span>
          </div>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={600}
            placeholder="На что ориентироваться: примеры треков, артисты, нужный вайб, инструменты…"
          />
        </div>

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading}
          type="button"
        >
          {loading ? "Создаём…" : "Создать превью"}
        </button>

        {loading && <LoadingSteps />}
        {error && <div className="status error">⚠ {error}</div>}
      </section>

      {/* Результаты */}
      {result && !loading && (
        <section className="results">
          <h2 className="results-title">Варианты превью</h2>
          <div className="results-grid">
            {result.variants.map((v, i) => (
              <VariantCard key={v.name} variant={v} meta={result.meta} index={i} />
            ))}
          </div>

          {/* Блок усиления конверсии */}
          <div className="convert">
            <h3>Понравилось направление?</h3>
            <p>
              Мы можем создать полноценную аранжировку на основе выбранного вайба.
            </p>
            <a
              className="convert-btn"
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Обсудить проект →
            </a>
          </div>
        </section>
      )}

      <p className="footnote">
        Превью генерируется ИИ и доступно только для прослушивания. © ASV Production
      </p>
    </main>
  );
}
