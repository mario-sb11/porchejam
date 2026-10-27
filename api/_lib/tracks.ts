import { deezerGet, listOrEmpty, type DzAlbum, type DzList, type DzTrack } from "./deezer.js";

export const PAGE_SIZE = 50;
export const SOURCE_TYPES = ["playlist", "artist", "album"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  cover: string;
}

/** Una página de canciones con preview de 30 s de una playlist, artista o álbum. */
export async function fetchTrackPage(type: SourceType, id: string, index = 0): Promise<{ tracks: Track[]; nextIndex: number | null }> {
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

  return { tracks, nextIndex: data.next ? index + PAGE_SIZE : null };
}
