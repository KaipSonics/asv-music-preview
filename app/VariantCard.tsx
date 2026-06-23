"use client";

import { useEffect, useRef, useState } from "react";

export type Meta = {
  beat: string;
  bass: string;
  melody: string;
  mood: string;
  tempo: string;
};

export type RefItem = {
  code: string;
  audioUrl: string;
  meta: Meta;
  reference?: string;
};

// Превью ограничено минутой
const PREVIEW_LIMIT = 60;

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VariantCard({
  item,
  title,
  open,
  onToggle,
}: {
  item: RefItem;
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCur(a.currentTime);
      if (a.currentTime >= PREVIEW_LIMIT) {
        a.pause();
        a.currentTime = 0;
        setPlaying(false);
        setCur(0);
      }
    };
    const onMeta = () => setDur(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      if (a.currentTime >= PREVIEW_LIMIT - 0.2) a.currentTime = 0;
      a.play();
      setPlaying(true);
    }
  }

  const effDur = dur ? Math.min(dur, PREVIEW_LIMIT) : 0;

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !effDur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * effDur;
  }

  function copyCode(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(item.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pct = effDur ? (cur / effDur) * 100 : 0;
  const m = item.meta;

  return (
    <div className={`vcard ${open ? "open" : ""}`}>
      <div className="vcard-row" onClick={onToggle}>
        <button
          className={`play-btn-sm ${playing ? "is-playing" : ""}`}
          onClick={togglePlay}
          type="button"
          aria-label={playing ? "Пауза" : "Слушать"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="16" height="16">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="vcard-row-main">
          <span className="vcard-name">{title}</span>
          <span className="vcard-row-sub">
            {m.mood} · {m.tempo} · {m.beat}/{m.bass}/{m.melody}
          </span>
        </div>

        <span className="vcard-chevron" aria-hidden>
          ▾
        </span>
      </div>

      {open && (
        <div className="vcard-body">
          <div className="player">
            <div className="player-body">
              <div className="progress" onClick={seek}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="time">
                <span>{fmt(cur)}</span>
                <span>{fmt(effDur)}</span>
              </div>
            </div>
          </div>

          <div className="vcard-meta">
            <span>
              <i>Бит</i>
              {m.beat}
            </span>
            <span>
              <i>Бас</i>
              {m.bass}
            </span>
            <span>
              <i>Мелодия</i>
              {m.melody}
            </span>
          </div>

          <div className="vcard-code">
            <span className="vcard-code-label">Код</span>
            <span className="vcard-code-value">{item.code}</span>
            <button type="button" className="copy-btn" onClick={copyCode}>
              {copied ? "Скопировано ✓" : "Скопировать"}
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />
    </div>
  );
}
