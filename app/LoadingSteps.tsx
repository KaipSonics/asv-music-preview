"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Анализируем параметры…",
  "Подбираем настроение…",
  "Формируем структуру…",
  "Создаём варианты…",
];

export default function LoadingSteps() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => (prev + 1 < STEPS.length ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loading">
      <div className="equalizer">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="loading-steps">
        {STEPS.map((s, idx) => (
          <div
            key={s}
            className={`loading-step ${idx === i ? "active" : ""} ${
              idx < i ? "done" : ""
            }`}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="loading-hint">Обычно занимает 1–3 минуты — не закрывай вкладку</div>
    </div>
  );
}
