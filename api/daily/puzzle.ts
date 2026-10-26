import { handler, json, requireEnum } from "../_lib/http.js";
import { DAILY_CATEGORIES, SNIPPET_STEPS, dailyTrack, puzzleNumber, todayInMadrid } from "../_lib/daily.js";

/**
 * GET /api/daily/puzzle?category=espanol
 * Devuelve el audio del reto de hoy, sin título ni artista.
 */
export const GET = handler(async (params) => {
  const category = requireEnum(params, "category", DAILY_CATEGORIES);
  const date = todayInMadrid();
  const track = await dailyTrack(category, date);

  return json(
    { date, number: puzzleNumber(date), category, previewUrl: track.previewUrl, steps: SNIPPET_STEPS },
    // Corto: la URL del audio caduca y el reto cambia a medianoche.
    { cache: "public, max-age=30, s-maxage=60" },
  );
});
