import { CACHE, HttpError, handler, json } from "../_lib/http.js";
import {
  PLAYER_TOKEN,
  ROOM_CODE,
  loadPool,
  pickRounds,
  serverRpc,
  type ArenaSettings,
  type ArenaSource,
} from "../_lib/arena.js";

const MAX_BODY = 1_024;

/**
 * POST /api/arena/start  { code, token }
 * El anfitrión empieza la partida: el servidor comprueba que lo es, elige las canciones en Deezer
 * y las guarda. Ningún navegador recibe la lista de canciones.
 */
export const POST = handler(async (_params, request) => {
  const raw = await request.text();
  if (raw.length > MAX_BODY) throw new HttpError(413, "Petición demasiado grande");
  let body: { code?: unknown; token?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Petición no válida");
  }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!ROOM_CODE.test(code) || !PLAYER_TOKEN.test(token)) throw new HttpError(400, "Petición no válida");

  const claim = await serverRpc<{ settings: ArenaSettings; sources: ArenaSource[] }>("arena_server_claim", {
    p_code: code,
    p_token: token,
  });

  try {
    const pool = await loadPool(claim.sources);
    const rounds = pickRounds(pool, claim.settings);
    await serverRpc("arena_server_load", { p_code: code, p_rounds: rounds });
  } catch (error) {
    // La sala vuelve a la espera para poder reintentarlo (o cambiar de música).
    await serverRpc("arena_server_abort", { p_code: code }).catch(() => undefined);
    throw error;
  }
  return json({ ok: true }, { cache: CACHE.none });
});
