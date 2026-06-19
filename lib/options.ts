// lib/options.ts
// Единый источник правды для вариантов выбора и сборки промпта.

export const GENRES = ["Pop", "House", "Hip-Hop", "Trap", "EDM"] as const;
export const MOODS = [
  "Summer",
  "Romantic",
  "Atmospheric",
  "Energetic",
  "Aggressive",
  "Sad",
] as const;

export type Genre = (typeof GENRES)[number];
export type Mood = (typeof MOODS)[number];

export const TEMPO_MIN = 80;
export const TEMPO_MAX = 160;
export const TEMPO_DEFAULT = 124;

// Подсказки на английском дают MusicGen более точный результат.
const MOOD_HINTS: Record<Mood, string> = {
  Summer: "bright, sunny, tropical vibe, uplifting",
  Romantic: "warm, soft, emotional, tender",
  Atmospheric: "ambient, spacious, dreamy, cinematic",
  Energetic: "high energy, driving, punchy, danceable",
  Aggressive: "hard, dark, intense, heavy bass",
  Sad: "melancholic, minor key, emotional, slow",
};

const GENRE_HINTS: Record<Genre, string> = {
  Pop: "catchy pop hook, modern radio production",
  House: "four-on-the-floor house groove, deep bassline",
  "Hip-Hop": "hip-hop beat, boom-bap drums, vinyl texture",
  Trap: "trap beat, 808 bass, crisp hi-hats, dark",
  EDM: "festival EDM, big synth lead, energetic drop",
};

export function buildPrompt(genre: Genre, mood: Mood, tempo: number): string {
  return [
    GENRE_HINTS[genre],
    MOOD_HINTS[mood],
    `${tempo} bpm`,
    "instrumental hook, high quality, no vocals",
  ].join(", ");
}
