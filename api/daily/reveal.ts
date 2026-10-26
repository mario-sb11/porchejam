import { handler, json, requireEnum } from "../_lib/http.js";
import { DAILY_CATEGORIES, dailyTrack, requireToday } from "../_lib/daily.js";

/**
 * GET /api/daily/reveal?category=espanol&date=2026-10-26
 * Desvela la canción del día al terminar la partida.
 */
export const GET = handler(async (params) => {
  const category = requireEnum(params, "category", DAILY_CATEGORIES);
  const date = requireToday(params.get("date"));
  const { id, name, artist, cover } = await dailyTrack(category, date);
  return json({ id, name, artist, cover }, { cache: "public, max-age=60, s-maxage=600" });
});
