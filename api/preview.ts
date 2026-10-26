import { CACHE, handler, json, requireId } from "./_lib/http.js";
import { DeezerError, NO_DATA_CODE, deezerGet, type DzTrack } from "./_lib/deezer.js";

/**
 * GET /api/preview?id=123 — URL de preview recién firmada para una canción.
 *
 * Deezer firma cada preview con una caducidad corta (~15 min). En partidas largas el cliente
 * pide aquí una URL nueva justo antes de reproducir una canción cuya URL esté a punto de caducar.
 */
export const GET = handler(async (params) => {
  const id = requireId(params);
  try {
    const track = await deezerGet<DzTrack>(`/track/${id}`);
    return json({ previewUrl: track.preview || null }, { cache: CACHE.preview });
  } catch (error) {
    if (error instanceof DeezerError && error.code === NO_DATA_CODE) return json({ previewUrl: null }, { cache: CACHE.preview });
    throw error;
  }
});
