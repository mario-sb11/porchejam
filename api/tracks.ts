import { CACHE, handler, json, optionalIndex, requireEnum, requireId } from "./_lib/http.js";
import { SOURCE_TYPES, fetchTrackPage } from "./_lib/tracks.js";

/**
 * GET /api/tracks?id=123&type=playlist|artist|album&index=0
 * Devuelve canciones con preview de 30 s y el índice de la siguiente página (o null).
 */
export const GET = handler(async (params) => {
  const id = requireId(params);
  const type = requireEnum(params, "type", SOURCE_TYPES);
  const index = optionalIndex(params);
  return json(await fetchTrackPage(type, id, index), { cache: CACHE.tracks });
});
