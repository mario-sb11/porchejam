import { apiUrl } from "@/lib/api";
import { readJson } from "@/lib/storage";

export type DailyCategoryId = "espanol" | "global" | "reggaeton" | "clasicos" | "comodin";

export interface DailyCategoryInfo {
  id: DailyCategoryId;
  emoji: string;
  title: string;
  description: string;
}

export const DAILY_CATEGORIES: DailyCategoryInfo[] = [
  { id: "espanol", emoji: "🇪🇸", title: "Español del Día", description: "Lo más sonado ahora mismo en España" },
  { id: "global", emoji: "🌍", title: "Global Hits", description: "Los temazos internacionales del momento" },
  { id: "reggaeton", emoji: "🔥", title: "Reggaeton & Urbano Latino", description: "Bad Bunny, Karol G, Feid y mucho más" },
  { id: "clasicos", emoji: "💿", title: "Clásicos", description: "Hits de los 80, 90 y 2000 que todos conocemos" },
  { id: "comodin", emoji: "🎲", title: "Comodín", description: "Cualquier género, cualquier época. La más difícil" },
];

export const MAX_ATTEMPTS = 6;

export type DailyGuess = { kind: "skip" } | { kind: "wrong"; label: string } | { kind: "correct"; label: string };
export type DailyStatus = "playing" | "won" | "lost";

export interface DailyProgress {
  guesses: DailyGuess[];
  status: DailyStatus;
}

export interface DailyPuzzle {
  date: string;
  number: number;
  category: DailyCategoryId;
  previewUrl: string;
  steps: number[];
}

export interface DailyAnswer {
  id: string;
  name: string;
  artist: string;
  cover: string;
}

const STATE_KEY = "porchejam_daily_state";
const HISTORY_KEY = "porchejam_daily_history";
const HISTORY_DAYS = 120;

type DailyState = { date: string; categories: Partial<Record<DailyCategoryId, DailyProgress>> };
type DailyHistory = Partial<Record<DailyCategoryId, Record<string, { won: boolean; attempts: number }>>>;

export function isDailyCategory(value: string | undefined): value is DailyCategoryId {
  return DAILY_CATEGORIES.some((c) => c.id === value);
}

export function categoryInfo(id: DailyCategoryId): DailyCategoryInfo {
  return DAILY_CATEGORIES.find((c) => c.id === id)!;
}

/** Fecha de hoy en España (el reto cambia a medianoche de Madrid). */
export function todayInMadrid(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento el reto se juega igual, solo no se recuerda */
  }
}

/** Progreso de hoy en una categoría (vacío si es un día nuevo). */
export function readProgress(category: DailyCategoryId, date: string): DailyProgress {
  const state = readJson<DailyState>(STATE_KEY, { date, categories: {} });
  if (state.date !== date) return { guesses: [], status: "playing" };
  return state.categories?.[category] ?? { guesses: [], status: "playing" };
}

export function saveProgress(category: DailyCategoryId, date: string, progress: DailyProgress): void {
  const state = readJson<DailyState>(STATE_KEY, { date, categories: {} });
  const next: DailyState = state.date === date ? state : { date, categories: {} };
  next.categories[category] = progress;
  write(STATE_KEY, next);

  if (progress.status !== "playing") {
    const history = readJson<DailyHistory>(HISTORY_KEY, {});
    const entries = { ...(history[category] ?? {}), [date]: { won: progress.status === "won", attempts: progress.guesses.length } };
    // Solo se guardan los últimos meses para no crecer sin límite.
    const trimmed = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => b.localeCompare(a)).slice(0, HISTORY_DAYS));
    write(HISTORY_KEY, { ...history, [category]: trimmed });
  }
}

/** Días seguidos acertando, contando hasta hoy (o hasta ayer si hoy aún no se ha jugado). */
export function currentStreak(category: DailyCategoryId, today: string): number {
  const days = readJson<DailyHistory>(HISTORY_KEY, {})[category] ?? {};
  let day = days[today] ? today : previousDay(today);
  let streak = 0;
  while (days[day]?.won) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

/** Texto para compartir, al estilo Wordle. */
export function shareText(category: DailyCategoryId, puzzleNumber: number, progress: DailyProgress): string {
  const info = categoryInfo(category);
  const blocks = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const g = progress.guesses[i];
    if (!g) return "⬜";
    return g.kind === "correct" ? "🟩" : g.kind === "skip" ? "⬛" : "🟥";
  }).join("");
  const result = progress.status === "won" ? `${progress.guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
  return `🎵 PorcheJam · ${info.title} #${puzzleNumber}\n🔊${blocks} ${result}\nhttps://porche-jam.vercel.app/cancion-del-dia`;
}

// ---------------------------------------------------------------------------
// Llamadas al backend
// ---------------------------------------------------------------------------

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `Error ${res.status}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export const fetchPuzzle = (category: DailyCategoryId) => getJson<DailyPuzzle>(apiUrl("daily/puzzle", { category }));

export const checkGuess = (category: DailyCategoryId, date: string, id: string) =>
  getJson<{ correct: boolean }>(apiUrl("daily/guess", { category, date, id }));

export const fetchAnswer = (category: DailyCategoryId, date: string) =>
  getJson<DailyAnswer>(apiUrl("daily/reveal", { category, date }));
