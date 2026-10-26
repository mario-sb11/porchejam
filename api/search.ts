import { CACHE, handler, json, searchQuery } from "./_lib/http.js";
import { deezerGet, listOrEmpty, type DzArtist, type DzList, type DzPlaylist, type DzTrack } from "./_lib/deezer.js";

type SearchType = "artist" | "track" | "playlist";

/**
 * GET /api/search?q=texto&type=artist|track|playlist
 * Cualquier otro `type` se trata como playlist, igual que hacía el servidor original.
 */
export const GET = handler(async (params) => {
  const q = searchQuery(params);
  if (!q) return json([], { cache: CACHE.long });

  const rawType = params.get("type");
  const type: SearchType = rawType === "artist" || rawType === "track" ? rawType : "playlist";

  if (type === "artist") {
    const data = await listOrEmpty(deezerGet<DzList<DzArtist>>("/search/artist", { q, limit: 15 }));
    return json(
      (data.data ?? []).map((a) => ({ id: String(a.id), name: a.name, cover: a.picture_medium ?? "", type })),
      { cache: CACHE.long },
    );
  }

  if (type === "track") {
    const data = await listOrEmpty(deezerGet<DzList<DzTrack>>("/search", { q, limit: 15 }));
    return json(
      (data.data ?? []).map((t) => ({
        id: String(t.id),
        name: t.title,
        cover: t.album?.cover_medium ?? "",
        artistName: t.artist?.name ?? "",
        type,
      })),
      { cache: CACHE.long },
    );
  }

  const data = await listOrEmpty(deezerGet<DzList<DzPlaylist>>("/search/playlist", { q, limit: 15 }));
  return json(
    (data.data ?? []).map((p) => ({ id: String(p.id), name: p.title, cover: p.picture_medium ?? "", type })),
    { cache: CACHE.long },
  );
});
