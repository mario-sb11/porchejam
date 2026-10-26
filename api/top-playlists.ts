import { CACHE, handler, json } from "./_lib/http.js";
import { deezerGet, listOrEmpty, type DzList, type DzPlaylist } from "./_lib/deezer.js";

/** GET /api/top-playlists — playlists destacadas para la pantalla de selección. */
export const GET = handler(async () => {
  const data = await listOrEmpty(deezerGet<DzList<DzPlaylist>>("/search/playlist", { q: "Exitos España", limit: 12 }));

  const playlists = (data.data ?? []).map((p) => ({
    id: String(p.id),
    name: p.title,
    cover: p.picture_medium ?? "",
    songCount: p.nb_tracks || "Varias",
    type: "playlist" as const,
  }));

  return json(playlists, { cache: CACHE.long });
});
