import { CACHE, handler, json, requireEnum, requireId } from "../_lib/http.js";
import {
  DeezerError,
  NO_DATA_CODE,
  deezerGet,
  type DzAlbum,
  type DzArtist,
  type DzList,
  type DzTrack,
} from "../_lib/deezer.js";

const NODE_TYPES = ["artist", "track", "album"] as const;

interface RaceItem { id: string; name: string; type: "artist" | "track" | "album"; cover: string; artistName?: string }
interface RaceGroup { title: string; items: RaceItem[] }

/** Lista de Deezer que nunca rompe la respuesta: si falla, devuelve vacío. */
async function safeList<T>(path: string, query: Record<string, string | number> = {}): Promise<T[]> {
  try {
    return (await deezerGet<DzList<T>>(path, query)).data ?? [];
  } catch {
    return [];
  }
}

/** Objeto de Deezer o null si no existe. Otros errores se propagan. */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await deezerGet<T>(path);
  } catch (error) {
    if (error instanceof DeezerError && error.code === NO_DATA_CODE) return null;
    throw error;
  }
}

const artistItem = (a: DzArtist): RaceItem => ({ id: String(a.id), name: a.name, type: "artist", cover: a.picture_medium ?? "" });
const trackItem = (t: DzTrack, cover?: string): RaceItem => ({
  id: String(t.id),
  name: t.title,
  type: "track",
  artistName: t.artist?.name ?? "",
  cover: cover ?? t.album?.cover_medium ?? "",
});

async function fromArtist(id: string): Promise<RaceGroup[]> {
  const artist = await getOrNull<DzArtist>(`/artist/${id}`);
  const artistName = artist?.name ?? "Artista";

  const [tracks, albums, related] = await Promise.all([
    safeList<DzTrack>(`/artist/${id}/top`, { limit: 10 }),
    safeList<DzAlbum>(`/artist/${id}/albums`, { limit: 5 }),
    safeList<DzArtist>(`/artist/${id}/related`, { limit: 8 }),
  ]);

  let relatedArtists = related;
  let relatedTitle = "Artistas Similares";

  // Sin similares: artistas con nombre parecido.
  if (relatedArtists.length === 0) {
    relatedArtists = (await safeList<DzArtist>("/search/artist", { q: artistName, limit: 10 })).filter(
      (a) => String(a.id) !== id,
    );
    relatedTitle = "Artistas con Nombre Similar";
  }
  // Tampoco: top global para que la partida nunca se quede sin salida.
  if (relatedArtists.length === 0) {
    relatedArtists = await safeList<DzArtist>("/chart/0/artists", { limit: 8 });
    relatedTitle = "Top Global (Modo Rescate)";
  }

  const groups: RaceGroup[] = [];
  if (tracks.length) groups.push({ title: "Canciones Populares", items: tracks.map((t) => trackItem(t)) });
  if (albums.length) {
    groups.push({
      title: "Álbumes Destacados",
      items: albums.map((a) => ({ id: String(a.id), name: a.title, type: "album", artistName: "Álbum", cover: a.cover_medium ?? "" })),
    });
  }
  if (relatedArtists.length) groups.push({ title: relatedTitle, items: relatedArtists.map(artistItem) });
  return groups;
}

async function fromTrack(id: string): Promise<RaceGroup[]> {
  const track = await getOrNull<DzTrack>(`/track/${id}`);
  if (!track?.artist) return [];

  let trackArtists = (track.contributors ?? []).map(artistItem);
  if (trackArtists.length === 0) trackArtists = [artistItem(track.artist)];

  const mainArtistId = String(track.artist.id);
  let [topTracks, similarArtists] = await Promise.all([
    safeList<DzTrack>(`/artist/${mainArtistId}/top`, { limit: 8 }),
    safeList<DzArtist>(`/artist/${mainArtistId}/related`, { limit: 8 }),
  ]);
  let similarTitle = "Artistas Similares";
  let tracksTitle = "Otras canciones del artista";

  if (similarArtists.length === 0) {
    similarArtists = (await safeList<DzArtist>("/search/artist", { q: track.artist.name, limit: 8 })).filter(
      (a) => String(a.id) !== mainArtistId,
    );
    similarTitle = "Artistas con Nombre Similar";
  }
  // Artista con una sola canción: canciones con título parecido.
  if (topTracks.length <= 1) {
    topTracks = await safeList<DzTrack>("/search", { q: track.title, limit: 8 });
    tracksTitle = "Canciones con Título Similar";
  }

  const recommended = topTracks.filter((t) => String(t.id) !== id).map((t) => trackItem(t));

  const groups: RaceGroup[] = [];
  if (trackArtists.length) groups.push({ title: "Artistas en esta pista", items: trackArtists });
  if (track.album) {
    groups.push({
      title: "Pertenece al Álbum",
      items: [{ id: String(track.album.id), name: track.album.title, type: "album", cover: track.album.cover_medium ?? "" }],
    });
  }
  if (recommended.length) groups.push({ title: tracksTitle, items: recommended });
  if (similarArtists.length) groups.push({ title: similarTitle, items: similarArtists.map(artistItem) });
  return groups;
}

async function fromAlbum(id: string): Promise<RaceGroup[]> {
  const album = await getOrNull<DzAlbum>(`/album/${id}`);
  if (!album) return [];

  const groups: RaceGroup[] = [];
  if (album.artist) groups.push({ title: "Artista del Álbum", items: [artistItem(album.artist)] });
  const tracks = (album.tracks?.data ?? []).map((t) => trackItem(t, album.cover_medium ?? ""));
  if (tracks.length) groups.push({ title: "Canciones en el Álbum", items: tracks });
  return groups;
}

/** GET /api/race/connections?id=123&type=artist|track|album — opciones para avanzar en Music Race. */
export const GET = handler(
  async (params) => {
    const id = requireId(params);
    const type = requireEnum(params, "type", NODE_TYPES);

    const options = type === "artist" ? await fromArtist(id) : type === "track" ? await fromTrack(id) : await fromAlbum(id);
    return json({ options }, { cache: CACHE.long });
  },
  { options: [] },
);
