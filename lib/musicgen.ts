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

// Доп. параметры генерации: длительность (под нужное число тактов),
// код заявки и комментарий к референсу (для будущей привязки в GenAPI).
export type GenOpts = { seconds?: number; code?: string; reference?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── fal.ai (стартовые кредиты) ─────────────────────────

async function generateFal(prompt: string, opts?: GenOpts): Promise<GenResult> {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("Нет ключа fal.ai. Задай FAL_KEY в переменных окружения (Railway → Variables).");
  }

  const model = process.env.FAL_MODEL || "fal-ai/stable-audio";
  const seconds = opts?.seconds ?? Number(process.env.FAL_SECONDS || 15);

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

async function generateReplicate(prompt: string, opts?: GenOpts): Promise<GenResult> {
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
      input: { prompt, duration: opts?.seconds ?? 8, output_format: "mp3" },
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

// ───────────────────────── GenAPI (gen-api.ru, рубли) ─────────────────────────
// Suno генерит ~2.5 мин, поэтому работаем асинхронно: старт → опрос.

const GENAPI_BASE = "https://api.gen-api.ru/api/v1";

// Запускаем генерацию, возвращаем request_id. Код заявки и референс
// зашиваем в title — ASV находит по нему генерацию в истории GenAPI.
export async function startGenApi(prompt: string, opts?: GenOpts): Promise<string> {
  const key = process.env.GENAPI_KEY;
  if (!key) throw new Error("Нет ключа GenAPI. Задай GENAPI_KEY в переменных окружения.");
  const model = process.env.GENAPI_MODEL || "suno";

  const code = opts?.code || "ASV";
  const ref = opts?.reference ? ` :: ${opts.reference}` : "";
  const title = `${code}${ref}`.slice(0, 90);

  const res = await fetch(`${GENAPI_BASE}/networks/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      tags: prompt.slice(0, 400),
      make_instrumental: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.request_id) {
    throw new Error(`GenAPI вернул ошибку: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return String(data.request_id);
}

// Опрос статуса. Возвращает audioUrl, когда готово.
export async function pollGenApi(
  requestId: string
): Promise<{ status: string; audioUrl?: string; error?: string }> {
  const key = process.env.GENAPI_KEY;
  if (!key) throw new Error("Нет ключа GenAPI.");
  const res = await fetch(`${GENAPI_BASE}/request/get/${requestId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json().catch(() => ({}));
  const status: string = data.status || "unknown";

  if (status === "success") {
    const arr: unknown[] = Array.isArray(data.result) ? data.result : [];
    let url = arr.find((x) => typeof x === "string" && (x as string).endsWith(".mp3")) as
      | string
      | undefined;
    if (!url && Array.isArray(data.full_response)) {
      const found = data.full_response.find(
        (x: { url?: string }) => typeof x?.url === "string"
      );
      url = found?.url;
    }
    if (!url) return { status: "error", error: "GenAPI не вернул аудио" };
    return { status, audioUrl: url };
  }
  if (status === "failed" || status === "error") {
    return { status, error: data.error || "Генерация GenAPI не удалась" };
  }
  return { status: "processing" };
}

export async function generateAudio(
  prompt: string,
  opts?: GenOpts
): Promise<GenResult> {
  const provider = (process.env.AUDIO_PROVIDER || "fal").toLowerCase();
  if (provider === "replicate") return generateReplicate(prompt, opts);
  if (provider === "huggingface") return generateHuggingFace(prompt);
  return generateFal(prompt, opts);
}
