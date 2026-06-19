// lib/options.ts
// Единый источник правды для вариантов выбора и сборки промпта.
//
// Концепция «эклектики»: пользователь собирает трек по элементам —
// у каждого элемента (бит/бас/мелодия) может быть свой жанр.
// Настроение и темп — общие на весь трек.
//
// На экране показываем русские подписи (темп — короткими англ. словами),
// а нейросети отправляем английские подсказки — модели понимают их точнее.
// BPM рассчитывается от жанра БИТА (драмки) и выбранного темпа.

// ───────────────────────── Жанры ─────────────────────────

export const ANY = "Любой";

export const GENRES = [
  "Pop",
  "House",
  "Hip-Hop",
  "Trap",
  "DnB",
  "Rock",
  "Dancehall",
] as const;

export type Genre = (typeof GENRES)[number];
export type GenreOrAny = Genre | typeof ANY;

export const GENRE_OPTIONS: GenreOrAny[] = [ANY, ...GENRES];

const GENRE_EN: Record<Genre, string> = {
  Pop: "pop",
  House: "house",
  "Hip-Hop": "hip-hop",
  Trap: "trap",
  DnB: "drum and bass",
  Rock: "rock",
  Dancehall: "dancehall",
};

// Характерный BPM по жанру бита: [slow, mid, fast]
const BPM: Record<Genre, [number, number, number]> = {
  Pop: [100, 115, 128],
  House: [118, 123, 128],
  "Hip-Hop": [80, 90, 100],
  Trap: [130, 140, 150],
  DnB: [170, 174, 176],
  Rock: [100, 120, 140],
  Dancehall: [90, 100, 105],
};
const BPM_ANY: [number, number, number] = [90, 115, 140];

// ───────────────────────── Элементы трека ─────────────────────────

export const ELEMENTS = [
  { key: "beat", label: "Бит", role: "beat and drums" },
  { key: "bass", label: "Бас", role: "bassline" },
  { key: "melody", label: "Мелодия", role: "melody and harmony" },
] as const;

export type ElementKey = (typeof ELEMENTS)[number]["key"];

// ───────────────────────── Настроение ─────────────────────────

export const MOODS = [
  { label: "Романтика", hint: "romantic, warm, tender, emotional" },
  { label: "Мечтательно", hint: "dreamy, airy, atmospheric yet warm, uplifting" },
  { label: "Энергично", hint: "energetic, driving, punchy" },
  { label: "Агрессивно", hint: "aggressive, hard, dark, intense" },
  { label: "Грусть", hint: "melancholic, sad, minor key, emotional" },
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
  beat: GenreOrAny;
  bass: GenreOrAny;
  melody: GenreOrAny;
  mood: MoodLabel;
  tempo: TempoLabel;
};

// ───────────────────────── Сборка промпта ─────────────────────────

export function buildPrompt(sel: Selection): string {
  const parts: string[] = [];
  for (const el of ELEMENTS) {
    const g = sel[el.key] as GenreOrAny;
    if (g !== ANY) parts.push(`${GENRE_EN[g as Genre]} ${el.role}`);
  }

  const layers =
    parts.length > 0
      ? `eclectic instrumental track combining ${parts.join(", ")}`
      : "modern instrumental track";

  const moodHint = MOODS.find((m) => m.label === sel.mood)?.hint || "";

  const tempo = TEMPOS.find((t) => t.label === sel.tempo);
  const idx = tempo?.idx ?? 1;
  const bpmArr = sel.beat !== ANY ? BPM[sel.beat as Genre] : BPM_ANY;
  const bpm = bpmArr[idx];

  return `${layers}. Mood: ${moodHint}. ${tempo?.hint || ""}, around ${bpm} bpm. high quality, catchy hook, no vocals.`;
}

// Короткое читаемое название результата
export function buildTitle(sel: Selection): string {
  return `${sel.mood} · ${sel.tempo}`;
}

// Описание комбинации элементов на русском (для карточки результата)
export function buildSubtitle(sel: Selection): string {
  const named = ELEMENTS.filter((el) => (sel[el.key] as GenreOrAny) !== ANY).map(
    (el) => `${el.label}: ${sel[el.key]}`
  );
  return named.length ? named.join(" · ") : "Микс на усмотрение нейросети";
}
