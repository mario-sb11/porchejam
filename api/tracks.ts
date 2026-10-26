import { CACHE, handler, json, optionalIndex, requireEnum, requireId } from "./_lib/http.js";
import { deezerGet, listOrEmpty, type DzAlbum, type DzList, type DzTrack } from "./_lib/deezer.js";

const PAGE_SIZE = 50;
const SOURCE_TYPES = ["playlist", "artist", "album"] as const;

/**
 * GET /api/tracks?id=123&type=playlist|artist|album&index=0
 * Devuelve canciones con preview de 30 s y el índice de la siguiente página (o null).
 */
export const GET = handler(async (params) => {
  const id = requireId(params);
  const type = requireEnum(params, "type", SOURCE_TYPES);
  const index = optionalIndex(params);

  const page = { limit: PAGE_SIZE, index };
  let data: DzList<DzTrack>;
  let albumCover = "";

  if (type === "artist") {
    data = await listOrEmpty(deezerGet<DzList<DzTrack>>(`/artist/${id}/top`, page));
  } else if (type === "playlist") {
    data = await listOrEmpty(deezerGet<DzList<DzTrack>>(`/playlist/${id}/tracks`, page));
  } else {
    // Las canciones de un álbum no traen la portada; se pide el álbum aparte.
    const [tracks, album] = await Promise.all([
      listOrEmpty(deezerGet<DzList<DzTrack>>(`/album/${id}/tracks`, page)),
      deezerGet<DzAlbum>(`/album/${id}`).catch(() => null),
    ]);
    data = tracks;
    albumCover = album?.cover_medium ?? "";
  }

  const tracks = (data.data ?? [])
    .filter((t) => Boolean(t.preview))
    .map((t) => ({
      id: String(t.id),
      name: t.title,
      artist: t.artist?.name ?? "",
      previewUrl: t.preview as string,
      cover: t.album?.cover_medium || albumCover || t.artist?.picture_medium || "",
    }));

  const nextIndex = data.next ? index + PAGE_SIZE : null;
  return json({ tracks, nextIndex }, { cache: CACHE.tracks });
});
