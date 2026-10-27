/**
 * Servidor de la Arena Online.
 *
 * El navegador nunca sabe qué canción va a sonar: este servidor elige las canciones en Deezer y
 * las guarda en la base de datos con un secreto (ARENA_SERVER_SECRET) que solo conoce Vercel.
 * La base de datos guarda únicamente el hash de ese secreto.
 */
import { HttpError } from "./http.js";
import { fetchTrackPage, type SourceType, type Track } from "./tracks.js";

export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const PLAYER_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

export type AnswerMode = "facil" | "medio" | "dificil";
export interface ArenaSettings { rounds: number; seconds: number; answer: AnswerMode }
export interface ArenaSource { id: string; type: SourceType }

export interface ArenaRound {
  trackId: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl: string;
  options: { title: string; artist: string }[] | null;
  correct: number | null;
}

function config() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.ARENA_SERVER_SECRET;
  if (!url || !key || !secret || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    throw new HttpError(503, "La Arena Online no está configurada");
  }
  return { url, key, secret };
}

/** Errores que lanzan nuestras funciones de la base de datos: su mensaje es apto para el jugador. */
const PLAYER_ERRORS: Record<string, number> = { P0001: 409, P0002: 404, "22023": 400, "42501": 403 };

/** Llama a una función `public.arena_server_*` añadiendo el secreto del servidor. */
export async function serverRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { url, key, secret } = config();
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_secret: secret, ...args }),
    signal: AbortSignal.timeout(8_000),
  });
  const text = await response.text();
  if (!response.ok) {
    let body: { code?: string; message?: string } = {};
    try {
      body = JSON.parse(text);
    } catch {
      /* respuesta no JSON */
    }
    const status = body.code ? PLAYER_ERRORS[body.code] : undefined;
    if (status) throw new HttpError(status, body.message ?? "No se pudo completar");
    throw new Error(`Supabase ${fn} respondió ${response.status}: ${text.slice(0, 200)}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

/** Normaliza un título para detectar canciones repetidas (misma lógica que en la base de datos). */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .split(" - ")[0]
    .replace(/\s(feat|ft)\.?\s.*$/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Baraja con Fisher-Yates usando un generador inyectable (para poder probarlo). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Elige las canciones de la partida: sin repetir título y, en modo fácil, con 3 opciones falsas
 * de títulos distintos. Lanza un error comprensible si la música no da para tantas rondas.
 */
export function pickRounds(pool: Track[], settings: ArenaSettings, random: () => number = Math.random): ArenaRound[] {
  const seen = new Set<string>();
  const unique: Track[] = [];
  for (const track of pool) {
    const key = normalizeTitle(track.name);
    if (!key || seen.has(key) || !/^https:\/\/[a-z0-9-]+\.dzcdn\.net\//.test(track.previewUrl)) continue;
    seen.add(key);
    unique.push(track);
  }

  const needed = settings.answer === "facil" ? Math.max(settings.rounds, 4) : settings.rounds;
  if (unique.length < needed) {
    throw new HttpError(
      422,
      `Esta música solo tiene ${unique.length} canciones distintas con audio y hacen falta ${needed}. Elige otra lista o menos rondas.`,
    );
  }

  const chosen = shuffle(unique, random).slice(0, settings.rounds);
  return chosen.map((track) => {
    let options: ArenaRound["options"] = null;
    let correct: number | null = null;
    if (settings.answer === "facil") {
      const distractors = shuffle(unique.filter((t) => t.id !== track.id), random).slice(0, 3);
      const all = shuffle([track, ...distractors], random);
      options = all.map((t) => ({ title: t.name, artist: t.artist }));
      correct = all.indexOf(track);
    }
    return {
      trackId: track.id,
      title: track.name,
      artist: track.artist,
      cover: track.cover,
      previewUrl: track.previewUrl,
      options,
      correct,
    };
  });
}

/** Junta canciones de todas las fuentes elegidas (hasta 2 páginas por fuente, 4 a la vez). */
export async function loadPool(sources: ArenaSource[]): Promise<Track[]> {
  const pages: Array<{ source: ArenaSource; index: number }> = [];
  for (const source of sources) {
    pages.push({ source, index: 0 });
    if (source.type === "playlist") pages.push({ source, index: 50 });
  }
  const results: Track[][] = [];
  for (let i = 0; i < pages.length; i += 4) {
    const batch = await Promise.all(
      pages.slice(i, i + 4).map(({ source, index }) =>
        fetchTrackPage(source.type, source.id, index)
          .then((page) => page.tracks)
          .catch(() => []),
      ),
    );
    results.push(...batch);
  }
  return results.flat();
}
