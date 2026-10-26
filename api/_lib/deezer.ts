/**
 * Cliente mínimo de la API pública de Deezer.
 *
 * Deezer limita las peticiones por IP. Para no agotar ese cupo:
 *  - las respuestas de /api se cachean en la CDN de Vercel (ver CACHE en http.ts),
 *  - si Deezer responde "Quota limit exceeded" se reintenta con espera creciente,
 *  - cada llamada tiene un tiempo máximo para no dejar funciones colgadas.
 */

const DEEZER_BASE = "https://api.deezer.com";
const TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [400, 1_200];
/** Códigos de error de Deezer que indican límite de peticiones. */
const QUOTA_ERROR_CODES = new Set([4, 700]);

export class DeezerError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

type DeezerErrorBody = { error?: { code?: number; message?: string; type?: string } };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET a la API de Deezer. `path` siempre lo construye el servidor con valores ya validados;
 * nunca se concatena texto libre del cliente sin codificar.
 */
export async function deezerGet<T = unknown>(path: string, query: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(path, DEEZER_BASE);
  if (url.origin !== DEEZER_BASE) throw new DeezerError("Ruta de Deezer no permitida");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new DeezerError(`Deezer respondió ${response.status}`, response.status);

    const body = (await response.json()) as T & DeezerErrorBody;
    const code = body?.error?.code;
    if (code === undefined) return body;

    if (QUOTA_ERROR_CODES.has(code) && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    throw new DeezerError(body.error?.message ?? "Error de Deezer", code);
  }
}

/** Código con el que Deezer indica "no hay datos" (id inexistente, página vacía...). */
export const NO_DATA_CODE = 800;

/** Convierte un "no data" de Deezer en una lista vacía, como hacía el servidor original. */
export async function listOrEmpty<T>(request: Promise<DzList<T>>): Promise<DzList<T>> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof DeezerError && error.code === NO_DATA_CODE) return { data: [] };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Tipos parciales de Deezer (solo los campos que usamos)
// ---------------------------------------------------------------------------

export interface DzArtist { id: number; name: string; picture_medium?: string }
export interface DzAlbum { id: number; title: string; cover_medium?: string; artist?: DzArtist; tracks?: { data: DzTrack[] } }
export interface DzTrack {
  id: number;
  title: string;
  preview?: string;
  artist?: DzArtist;
  album?: DzAlbum;
  contributors?: DzArtist[];
}
export interface DzPlaylist { id: number; title: string; picture_medium?: string; nb_tracks?: number }
export interface DzList<T> { data?: T[]; next?: string; total?: number }
