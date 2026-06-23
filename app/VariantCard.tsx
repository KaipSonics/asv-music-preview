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

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VariantCard({
  item,
  title,
  index,
}: {
  item: RefItem;
  title: string;
  index: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
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

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * dur;
  }

  function copyCode() {
    navigator.clipboard?.writeText(item.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pct = dur ? (cur / dur) * 100 : 0;
  const m = item.meta;

  return (
    <div className="vcard" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="vcard-head">
        <span className="vcard-name">{title}</span>
        <span className="vcard-badge">
          {m.mood} · {m.tempo}
        </span>
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

      <div className="player">
        <button
          className={`play-btn ${playing ? "is-playing" : ""}`}
          onClick={toggle}
          type="button"
          aria-label={playing ? "Пауза" : "Слушать"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="player-body">
          <div className="progress" onClick={seek}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="time">
            <span>{fmt(cur)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>
      </div>

      <div className="vcard-code">
        <span className="vcard-code-label">Код</span>
        <span className="vcard-code-value">{item.code}</span>
        <button type="button" className="copy-btn" onClick={copyCode}>
          {copied ? "Скопировано ✓" : "Скопировать"}
        </button>
      </div>

      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />
    </div>
  );
}
