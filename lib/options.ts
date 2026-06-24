// lib/options.ts
// Единый источник правды для вариантов выбора и сборки промпта.
//
// Концепция «эклектики»: пользователь собирает трек по элементам —
// у каждого элемента (бит/бас/мелодия) свой жанр.
// Настроение и темп — общие на весь трек.
//
// На экране показываем русские подписи (темп — короткими англ. словами),
// а нейросети отправляем английские подсказки — модели понимают их точнее.
// BPM рассчитывается от жанра БИТА (драмки) и выбранного темпа.

// ───────────────────────── Жанры ─────────────────────────

export const GENRES = [
  "POP",
  "POP DANCE",
  "HOUSE",
  "HIP-HOP",
  "TRAP",
  "DNB",
  "ROCK",
  "DANCEHALL",
] as const;

export type Genre = (typeof GENRES)[number];

export const GENRE_OPTIONS: Genre[] = [...GENRES];

// Чистые названия жанров (для бита-главного жанра и баса-влияния).
const GENRE_EN: Record<Genre, string> = {
  POP: "pop",
  "POP DANCE": "dance-pop",
  HOUSE: "house",
  "HIP-HOP": "hip-hop",
  TRAP: "trap",
  DNB: "drum and bass",
  ROCK: "rock",
  DANCEHALL: "dancehall",
};

// Очевидный инструмент мелодии по жанру (чтобы мелодию не игнорило).
const MELODY_INSTR: Record<Genre, string> = {
  POP: "synth",
  "POP DANCE": "synth",
  HOUSE: "piano",
  "HIP-HOP": "keys",
  TRAP: "bells",
  DNB: "synth",
  ROCK: "guitar",
  DANCEHALL: "guitar",
};

// Характерный BPM по жанру бита: [slow, mid, fast]
const BPM: Record<Genre, [number, number, number]> = {
  POP: [100, 115, 128],
  "POP DANCE": [118, 124, 128],
  HOUSE: [118, 123, 128],
  "HIP-HOP": [80, 90, 100],
  TRAP: [130, 140, 150],
  DNB: [170, 174, 176],
  ROCK: [100, 120, 140],
  DANCEHALL: [90, 100, 105],
};

// ───────────────────────── Элементы трека ─────────────────────────

export const ELEMENTS = [
  { key: "beat", label: "Бит", role: "beat and drums" },
  { key: "bass", label: "Бас", role: "bassline" },
  { key: "melody", label: "Мелодия", role: "melody and harmony" },
] as const;

export type ElementKey = (typeof ELEMENTS)[number]["key"];

// Жанры по умолчанию (эклектичный пример)
export const DEFAULTS: Record<ElementKey, Genre> = {
  beat: "TRAP",
  bass: "HOUSE",
  melody: "POP",
};

// ───────────────────────── Настроение ─────────────────────────

export const MOODS = [
  { label: "Летний", hint: "summery, bright, sunny, tropical, uplifting" },
  { label: "Романтичный", hint: "romantic, warm, tender, emotional" },
  { label: "Атмосферный", hint: "atmospheric, ambient, spacious, cinematic" },
  { label: "Грустный", hint: "melancholic, sad, minor key, emotional" },
  { label: "Энергичный", hint: "energetic, driving, punchy, high energy" },
  { label: "Дерзкий", hint: "bold, confident, swaggering, edgy" },
  { label: "Ночной", hint: "nocturnal, dark, moody, late-night, deep" },
] as const;

export type MoodLabel = (typeof MOODS)[number]["label"];

// ───────────────────────── Темп (BPM считается от жанра бита) ─────────────────────────

export const TEMPOS = [
  { label: "Slow", idx: 0 as const, hint: "slow tempo" },
  { label: "Mid", idx: 1 as const, hint: "medium tempo" },
  { label: "Fast", idx: 2 as const, hint: "fast tempo" },
] as const;

export type TempoLabel = (typeof TEMPOS)[number]["label"];

// ───────────────────────── Выбор пользователя ─────────────────────────

export type Selection = {
  beat: Genre;
  bass: Genre;
  melody: Genre;
  mood: MoodLabel;
  tempo: TempoLabel;
};

// ───────────────────────── Сборка промпта ─────────────────────────

// Структура трека: 4 такта хук + 4 такта куплет = 8 тактов
export const BARS_HOOK = 4;
export const BARS_VERSE = 4;
export const BARS_TOTAL = BARS_HOOK + BARS_VERSE;
const BEATS_PER_BAR = 4;

// BPM по жанру бита + выбранному темпу
export function getBpm(sel: Selection): number {
  const idx = TEMPOS.find((t) => t.label === sel.tempo)?.idx ?? 1;
  return BPM[sel.beat as Genre][idx];
}

// Длительность ровно под 8 тактов
export function getSeconds(sel: Selection): number {
  const bpm = getBpm(sel);
  return Math.round((BARS_TOTAL * BEATS_PER_BAR * 60) / bpm);
}

export function buildPrompt(sel: Selection): string {
  const mainGenre = GENRE_EN[sel.beat as Genre]; // бит = главный жанр (~50%)
  const bassGenre = GENRE_EN[sel.bass as Genre]; // бас = влияние (~25%)
  const melodyGenre = GENRE_EN[sel.melody as Genre]; // мелодия = влияние (~25%)
  const melodyInstr = MELODY_INSTR[sel.melody as Genre];
  const moodWord = (MOODS.find((m) => m.label === sel.mood)?.hint || "")
    .split(",")[0]
    .trim();
  const tempoHint = TEMPOS.find((t) => t.label === sel.tempo)?.hint || "tempo";
  const bpm = getBpm(sel);

  // Один цельный образ трека. Приоритет (на случай обрезки 200 символов):
  // настроение → темп → главный жанр (бит) → влияние баса → влияние мелодии.
  return (
    `${moodWord} ${mainGenre} instrumental track, ${tempoHint}, ${bpm} bpm, no vocals. ` +
    `With ${bassGenre} bass influence and ${melodyGenre} ${melodyInstr} melody. ` +
    `Steady repetitive loop.`
  ).slice(0, 195);
}

// Короткое читаемое название результата
export function buildTitle(sel: Selection): string {
  return `${sel.mood} · ${sel.tempo}`;
}

// Описание комбинации элементов на русском (для карточки результата)
export function buildSubtitle(sel: Selection): string {
  return ELEMENTS.map((el) => `${el.label}: ${sel[el.key]}`).join(" · ");
}
