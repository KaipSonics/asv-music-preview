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
import VariantCard, { type RefItem } from "./VariantCard";
import LoadingSteps from "./LoadingSteps";

const VK_URL = "https://vk.com/asv_family";
const STORAGE_KEY = "asv:history";
const MAX_HISTORY = 5;

type Saved = RefItem & { num: number };

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
  const [history, setHistory] = useState<Saved[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  const setters: Record<string, (v: Genre) => void> = {
    beat: setBeat,
    bass: setBass,
    melody: setMelody,
  };
  const values: Record<string, Genre> = { beat, bass, melody };

  // Восстанавливаем сохранённые референсы
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as Saved[]);
    } catch {}
  }, []);

  function persist(list: Saved[]) {
    setHistory(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  const limitReached = remaining !== null && remaining <= 0;

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
      if (!res.ok) {
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        throw new Error(data.error || "Не удалось сгенерировать");
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);

      const nextNum = (history[0]?.num || 0) + 1;
      const item: Saved = {
        num: nextNum,
        code: data.code,
        audioUrl: data.audioUrl,
        reference: data.reference,
        meta: data.meta,
      };
      persist([item, ...history].slice(0, MAX_HISTORY));
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
          <span className="logo-prod">
            {"production".split("").map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </span>
        </div>
        <h1>Собери референс будущего трека</h1>
        <p>
          Выбери жанровую основу, элементы звучания, настроение и темп —
          получи несколько вариантов референса для аранжировки и продакшна.
        </p>
      </header>

      <section className="panel">
        {/* Элементы по жанрам — выпадающие списки */}
        <div className="field">
          <div className="field-label">Элементы по жанрам</div>
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
            {MOODS.map((mItem) => (
              <button
                key={mItem.label}
                className={`chip ${mood === mItem.label ? "active" : ""}`}
                onClick={() => setMood(mItem.label)}
                type="button"
              >
                {mItem.label}
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
          disabled={loading || limitReached}
          type="button"
        >
          {loading
            ? "Создаём…"
            : limitReached
            ? "Лимит на сегодня исчерпан"
            : "Создать референс"}
        </button>

        {remaining !== null && !loading && (
          <div className="limit-note">
            Осталось генераций сегодня: <b>{remaining}</b> из 5
          </div>
        )}

        {loading && <LoadingSteps />}
        {error && <div className="status error">⚠ {error}</div>}
      </section>

      {/* Сохранённые референсы */}
      {history.length > 0 && !loading && (
        <section className="results">
          <h2 className="results-title">Твои референсы</h2>
          <p className="results-sub">
            Сохраняются последние {MAX_HISTORY}. Выбери лучший, скопируй его код
            и отправь нам в VK.
          </p>
          <div className="results-grid">
            {history.map((item, i) => (
              <VariantCard
                key={item.code}
                item={item}
                title={`Референс ${item.num}`}
                index={i}
              />
            ))}
          </div>

          {/* Блок усиления конверсии */}
          <div className="convert">
            <h3>Понравилось направление?</h3>
            <p>Мы создадим полноценную аранжировку на основе выбранного вайба.</p>
            <a
              className="convert-btn"
              href={VK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Оформить заявку в VK →
            </a>
            <p className="convert-hint">
              Скопируй код понравившегося референса и пришли его в сообщения
              нашего паблика — подберём по нему трек.
            </p>
          </div>
        </section>
      )}

      <p className="footnote">
        Референс генерируется ИИ и доступен только для прослушивания. © ASV Production
      </p>
    </main>
  );
}
