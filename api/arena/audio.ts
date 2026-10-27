import { CACHE, HttpError, handler, json } from "../_lib/http.js";
import { DeezerError, NO_DATA_CODE, deezerGet, type DzTrack } from "../_lib/deezer.js";
import { ROOM_CODE, serverRpc } from "../_lib/arena.js";

/**
 * GET /api/arena/audio?code=ABC234&round=3
 * Audio recién firmado de la ronda que se está jugando, por si el que se cargó al empezar ha
 * caducado (Deezer firma las previews ~15 min). No revela qué canción es.
 */
export const GET = handler(async (params) => {
  const code = (params.get("code") ?? "").trim().toUpperCase();
  const round = params.get("round") ?? "";
  if (!ROOM_CODE.test(code) || !/^([1-9]|1\d|20)$/.test(round)) throw new HttpError(400, "Parámetros no válidos");

  const trackId = await serverRpc<number | null>("arena_server_track", { p_code: code, p_round: Number(round) });
  if (!trackId) throw new HttpError(404, "Esa ronda no está en juego");
  try {
    const track = await deezerGet<DzTrack>(`/track/${trackId}`);
    return json({ previewUrl: track.preview || null }, { cache: CACHE.preview });
  } catch (error) {
    if (error instanceof DeezerError && error.code === NO_DATA_CODE) return json({ previewUrl: null }, { cache: CACHE.preview });
    throw error;
  }
});
