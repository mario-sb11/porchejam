/**
 * Canción del Día: elige de forma determinista una canción por categoría y día.
 *
 * - Todos los jugadores reciben la misma canción el mismo día (hora de Madrid).
 * - No hace falta base de datos: la elección es una función pura de (fecha, categoría, sal).
 * - Se usa "rendezvous hashing" sobre los ids de las canciones: si la playlist cambia durante
 *   el día (las listas de éxitos se actualizan), la canción elegida solo cambia si desaparece.
 * - La respuesta nunca se envía al cliente antes de tiempo: solo la URL del audio. Las
 *   respuestas se comprueban en el servidor.
 */
import { createHash } from "node:crypto";
import { HttpError } from "./http.js";
import { deezerGet, listOrEmpty, type DzList, type DzTrack } from "./deezer.js";

export const DAILY_CATEGORIES = ["espanol", "global", "reggaeton", "clasicos", "comodin"] as const;
export type DailyCategory = (typeof DAILY_CATEGORIES)[number];

/** Playlists de Deezer de las que sale cada categoría. */
const SOURCES: Record<Exclude<DailyCategory, "comodin">, string[]> = {
  espanol: ["1116190041"], // Top Spain (oficial de Deezer)
  global: ["3155776842"], // Top Worldwide (oficial de Deezer)
  reggaeton: ["1273315391", "789123393"], // Reggaeton Hits + Reggaeton Classics
  clasicos: ["8948895482", "7708767222"], // pop español 80-90 y éxitos latinos 90-2010
};

export function sourcesFor(category: DailyCategory): string[] {
  if (category === "comodin") return Object.values(SOURCES).flat();
  return SOURCES[category];
}

/** Fecha del reto en formato AAAA-MM-DD, siempre con la hora de España. */
export function todayInMadrid(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Número de reto (para compartir: "Canción del Día #123"). */
export function puzzleNumber(date: string): number {
  const launch = Date.UTC(2026, 9, 26); // 26 de octubre de 2026
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - launch) / 86_400_000) + 1;
}

export interface DailyTrack {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  cover: string;
}

const salt = () => process.env.DAILY_SALT ?? "porchejam";

function weight(seed: string, trackId: string): string {
  return createHash("sha256").update(`${seed}:${trackId}`).digest("hex");
}

/** Elige la canción: la de menor peso para la semilla del día. Exportada para los tests. */
export function pickTrack(tracks: DailyTrack[], date: string, category: DailyCategory): DailyTrack | null {
  const seed = `${salt()}:${date}:${category}`;
  let best: DailyTrack | null = null;
  let bestWeight = "";
  for (const track of tracks) {
    const w = weight(seed, track.id);
    if (best === null || w < bestWeight) {
      best = track;
      bestWeight = w;
    }
  }
  return best;
}

// Caché en memoria por instancia: evita repetir las mismas llamadas a Deezer en cada intento.
const poolCache = new Map<string, { expires: number; tracks: DailyTrack[] }>();
const POOL_TTL_MS = 5 * 60_000;

async function loadPool(category: DailyCategory): Promise<DailyTrack[]> {
  const key = category;
  const cached = poolCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.tracks;

  const pages = await Promise.all(
    sourcesFor(category).flatMap((playlistId) =>
      // Solo las 50 primeras de cada lista: en las de éxitos son las más conocidas.
      [0].map((index) => listOrEmpty(deezerGet<DzList<DzTrack>>(`/playlist/${playlistId}/tracks`, { limit: 50, index }))),
    ),
  );

  const byId = new Map<string, DailyTrack>();
  for (const page of pages) {
    for (const t of page.data ?? []) {
      if (!t.preview || byId.has(String(t.id))) continue;
      byId.set(String(t.id), {
        id: String(t.id),
        name: t.title,
        artist: t.artist?.name ?? "",
        previewUrl: t.preview,
        cover: t.album?.cover_medium ?? "",
      });
    }
  }
  const tracks = [...byId.values()];
  if (tracks.length > 0) poolCache.set(key, { expires: Date.now() + POOL_TTL_MS, tracks });
  return tracks;
}

export async function dailyTrack(category: DailyCategory, date: string): Promise<DailyTrack> {
  const track = pickTrack(await loadPool(category), date, category);
  if (!track) throw new HttpError(503, "No hay canción disponible ahora mismo");
  return track;
}

/** Solo se puede jugar (y comprobar respuestas) del reto de hoy. */
export function requireToday(date: string | null): string {
  const today = todayInMadrid();
  if (date !== today) throw new HttpError(409, "El reto ha cambiado: recarga para jugar el de hoy");
  return today;
}

/** Normaliza títulos y artistas para aceptar versiones ("Remix", "feat.", tildes...). */
export function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s-\s.*$/, " ")
    .replace(/\b(feat|ft)\b.*$/, " ")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

export function sameSong(a: { name: string; artist: string }, b: { name: string; artist: string }): boolean {
  const mainArtist = (s: string) => normalizeTitle(s.split(/,|&| x | y /i)[0] ?? s);
  const title = normalizeTitle(a.name);
  return title !== "" && title === normalizeTitle(b.name) && mainArtist(a.artist) === mainArtist(b.artist);
}

/** Tiempo de cada intento en segundos (estilo Heardle). */
export const SNIPPET_STEPS = [1, 2, 4, 7, 11, 16] as const;

/** Solo para tests. */
export function resetDailyCacheForTests(): void {
  poolCache.clear();
}
