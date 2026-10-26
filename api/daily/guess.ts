import { handler, json, requireEnum, requireId } from "../_lib/http.js";
import { deezerGet, type DzTrack } from "../_lib/deezer.js";
import { DAILY_CATEGORIES, dailyTrack, requireToday, sameSong } from "../_lib/daily.js";

/**
 * GET /api/daily/guess?category=espanol&date=2026-10-26&id=123
 * Comprueba en el servidor si la canción elegida es la de hoy. Acepta otras versiones de la
 * misma canción (mismo título normalizado y artista principal).
 */
export const GET = handler(async (params) => {
  const category = requireEnum(params, "category", DAILY_CATEGORIES);
  const date = requireToday(params.get("date"));
  const guessId = requireId(params);

  const answer = await dailyTrack(category, date);
  let correct = guessId === answer.id;
  if (!correct) {
    const guess = await deezerGet<DzTrack>(`/track/${guessId}`).catch(() => null);
    correct = Boolean(guess && sameSong({ name: guess.title, artist: guess.artist?.name ?? "" }, answer));
  }

  return json({ correct }, { cache: "public, max-age=60, s-maxage=600" });
});
