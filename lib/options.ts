// lib/options.ts
// Единый источник правды для вариантов выбора и сборки промпта.
//
// Концепция «эклектики»: пользователь собирает трек по элементам —
// у каждого элемента (бит/бас/гармония/лид) может быть свой жанр.
// Настроение и «характер» (вместо BPM) — общие на весь трек.
//
// На экране показываем русские подписи, а нейросети отправляем
// английские подсказки (модели понимают их точнее).

// ───────────────────────── Жанры ─────────────────────────

export const ANY = "Любой";

export const GENRES = [
  "Pop",
  "House",
  "Hip-Hop",
  "Trap",
  "Drum n Bass",
  "Rock",
] as const;

export type Genre = (typeof GENRES)[number];
export type GenreOrAny = Genre | typeof ANY;

// Варианты для выбора по элементу: «Любой» + список жанров
export const GENRE_OPTIONS: GenreOrAny[] = [ANY, ...GENRES];

const GENRE_EN: Record<Genre, string> = {
  Pop: "pop",
  House: "house",
  "Hip-Hop": "hip-hop",
  Trap: "trap",
  "Drum n Bass": "drum and bass",
  Rock: "rock",
};

// ───────────────────────── Элементы трека ─────────────────────────

export const ELEMENTS = [
  { key: "beat", label: "Бит", role: "beat and drums" },
  { key: "bass", label: "Бас", role: "bassline" },
  { key: "harmony", label: "Гармония", role: "chords and harmony" },
  { key: "lead", label: "Лид", role: "lead melody" },
] as const;

export type ElementKey = (typeof ELEMENTS)[number]["key"];

// ───────────────────────── Настроение ─────────────────────────

export const MOODS = [
  { label: "Лето", hint: "summery, bright, tropical, uplifting" },
  { label: "Романтика", hint: "romantic, warm, tender, emotional" },
  { label: "Атмосфера", hint: "atmospheric, ambient, spacious, cinematic" },
  { label: "Энергично", hint: "energetic, driving, punchy" },
  { label: "Агрессивно", hint: "aggressive, hard, dark, intense" },
  { label: "Грусть", hint: "melancholic, sad, minor key, emotional" },
] as const;

export type MoodLabel = (typeof MOODS)[number]["label"];

// ───────────────────────── Характер (вместо BPM) ─────────────────────────

export const CHARACTERS = [
  { label: "Чилл", hint: "chill, slow, relaxed, downtempo" },
  { label: "Грув", hint: "groovy, mid-tempo, head-nodding" },
  { label: "Драйв", hint: "driving, upbeat, high energy" },
  { label: "Жёстко", hint: "hard, fast, intense, banging" },
] as const;

export type CharacterLabel = (typeof CHARACTERS)[number]["label"];

// ───────────────────────── Выбор пользователя ─────────────────────────

export type Selection = {
  beat: GenreOrAny;
  bass: GenreOrAny;
  harmony: GenreOrAny;
  lead: GenreOrAny;
  mood: MoodLabel;
  character: CharacterLabel;
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
  const charHint = CHARACTERS.find((c) => c.label === sel.character)?.hint || "";

  return `${layers}. Mood: ${moodHint}. ${charHint}. high quality, catchy hook, no vocals.`;
}

// Короткое читаемое название результата на русском
export function buildTitle(sel: Selection): string {
  return `${sel.mood} · ${sel.character}`;
}

// Описание комбинации элементов на русском (для карточки результата)
export function buildSubtitle(sel: Selection): string {
  const named = ELEMENTS.filter((el) => (sel[el.key] as GenreOrAny) !== ANY).map(
    (el) => `${el.label}: ${sel[el.key]}`
  );
  return named.length ? named.join(" · ") : "Микс на усмотрение нейросети";
}
