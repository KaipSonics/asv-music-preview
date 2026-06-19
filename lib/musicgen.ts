// lib/musicgen.ts
// Генерация аудио-хука по текстовому промпту.
// Провайдер переключается переменной окружения AUDIO_PROVIDER:
//   - "fal"         (по умолчанию: fal.ai, стартовые бесплатные кредиты)
//   - "replicate"   (платно, качество выше)
//   - "huggingface" (устар.: serverless MusicGen закрыли, оставлено как запас)
//
// Возвращаем единый результат: { audioUrl, contentType }
//   - fal / Replicate -> audioUrl это обычная ссылка на аудиофайл
//   - HuggingFace     -> audioUrl это data:-URL (аудио зашито в base64)

export type GenResult = { audioUrl: string; contentType: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── fal.ai (стартовые кредиты) ─────────────────────────

async function generateFal(prompt: string): Promise<GenResult> {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("Нет ключа fal.ai. Задай FAL_KEY в переменных окружения (Railway → Variables).");
  }

  const model = process.env.FAL_MODEL || "fal-ai/stable-audio";
  const seconds = Number(process.env.FAL_SECONDS || 15);

  // Очередь fal: ставим задачу, затем опрашиваем статус.
  const submitRes = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, seconds_total: seconds }),
  });

  if (!submitRes.ok) {
    const txt = await submitRes.text();
    throw new Error(`fal.ai вернул ошибку ${submitRes.status}: ${txt.slice(0, 300)}`);
  }

  const submit = await submitRes.json();
  const statusUrl: string = submit.status_url;
  const responseUrl: string = submit.response_url;

  // Ждём готовности (обычно несколько секунд)
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const stRes = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
    const st = await stRes.json();
    if (st.status === "COMPLETED") break;
    if (st.status === "FAILED" || st.status === "ERROR") {
      throw new Error("fal.ai: генерация не удалась.");
    }
  }

  const finalRes = await fetch(responseUrl, { headers: { Authorization: `Key ${key}` } });
  const out = await finalRes.json();
  const url = out?.audio_file?.url || out?.audio?.url || out?.url;
  if (!url) {
    throw new Error("fal.ai не вернул аудио. Ответ: " + JSON.stringify(out).slice(0, 200));
  }
  return { audioUrl: url, contentType: out?.audio_file?.content_type || "audio/mpeg" };
}

// ───────────────────────── Hugging Face (бесплатно) ─────────────────────────

async function generateHuggingFace(prompt: string): Promise<GenResult> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error(
      "Нет токена Hugging Face. Задай HF_TOKEN в переменных окружения (Railway → Variables)."
    );
  }

  const model = process.env.HF_MODEL || "facebook/musicgen-small";
  const url = `https://api-inference.huggingface.co/models/${model}`;

  // Модель на бесплатном тарифе может «просыпаться» (cold start) — пробуем несколько раз.
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "audio/wav",
      },
      body: JSON.stringify({
        inputs: prompt,
        options: { wait_for_model: true },
      }),
    });

    const contentType = res.headers.get("content-type") || "";

    // Успех: пришли байты аудио
    if (res.ok && contentType.startsWith("audio")) {
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString("base64");
      return {
        audioUrl: `data:${contentType};base64,${base64}`,
        contentType,
      };
    }

    // Модель ещё грузится — HF отдаёт JSON с estimated_time
    if (res.status === 503) {
      let wait = 8;
      try {
        const j = await res.json();
        if (typeof j.estimated_time === "number") wait = Math.min(j.estimated_time, 20);
      } catch {}
      await sleep(wait * 1000);
      continue;
    }

    // Превышен лимит бесплатного тарифа
    if (res.status === 429) {
      throw new Error(
        "Достигнут дневной лимит бесплатного тарифа Hugging Face. Попробуй позже или подключи Replicate."
      );
    }

    const txt = await res.text();
    throw new Error(`Hugging Face вернул ошибку ${res.status}: ${txt.slice(0, 300)}`);
  }

  throw new Error("Модель Hugging Face не успела прогреться. Попробуй ещё раз через минуту.");
}

// ───────────────────────── Replicate (платно) ─────────────────────────

async function generateReplicate(prompt: string): Promise<GenResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Нет токена Replicate. Задай REPLICATE_API_TOKEN в переменных окружения.");
  }

  const version =
    process.env.REPLICATE_MODEL_VERSION ||
    "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb";

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      input: { prompt, duration: 8, output_format: "mp3" },
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Replicate вернул ошибку ${createRes.status}: ${txt.slice(0, 300)}`);
  }

  let prediction = await createRes.json();

  while (!["succeeded", "failed", "canceled"].includes(prediction.status)) {
    await sleep(2000);
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    prediction = await pollRes.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`Генерация Replicate не удалась: ${prediction.status}. ${prediction.error || ""}`);
  }

  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  return { audioUrl: output, contentType: "audio/mpeg" };
}

// ───────────────────────── Точка входа ─────────────────────────

export async function generateAudio(prompt: string): Promise<GenResult> {
  const provider = (process.env.AUDIO_PROVIDER || "fal").toLowerCase();
  if (provider === "replicate") return generateReplicate(prompt);
  if (provider === "huggingface") return generateHuggingFace(prompt);
  return generateFal(prompt);
}
