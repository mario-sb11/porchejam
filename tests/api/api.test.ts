// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as tracks } from "../../api/tracks";
import { GET as search } from "../../api/search";
import { GET as topPlaylists } from "../../api/top-playlists";
import { GET as raceConnections } from "../../api/race/connections";

type Route = (url: URL) => unknown;

/** Simula la API de Deezer: cada ruta devuelve el JSON indicado. */
function mockDeezer(routes: Record<string, Route | unknown>) {
  const calls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const url = new URL(String(input));
      calls.push(url);
      expect(url.origin).toBe("https://api.deezer.com");
      const route = routes[url.pathname];
      if (route === undefined) return new Response(JSON.stringify({ error: { code: 800, message: "no data" } }));
      const body = typeof route === "function" ? (route as Route)(url) : route;
      return new Response(JSON.stringify(body));
    }),
  );
  return calls;
}

const req = (path: string) => new Request(`https://porche-jam.vercel.app${path}`);

const dzTrack = (id: number, preview = `https://cdnt-preview.dzcdn.net/${id}.mp3`) => ({
  id,
  title: `Canción ${id}`,
  preview,
  artist: { id: 1, name: "Artista", picture_medium: "artist.jpg" },
  album: { id: 9, title: "Álbum", cover_medium: "album.jpg" },
});

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

describe("/api/tracks", () => {
  it("devuelve el mismo formato que el servidor antiguo y descarta canciones sin preview", async () => {
    const calls = mockDeezer({
      "/playlist/123/tracks": { data: [dzTrack(1), dzTrack(2, "")], next: "https://api.deezer.com/next" },
    });
    const res = await tracks(req("/api/tracks?id=123&type=playlist&index=50"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tracks: [{ id: "1", name: "Canción 1", artist: "Artista", previewUrl: "https://cdnt-preview.dzcdn.net/1.mp3", cover: "album.jpg" }],
      nextIndex: 100,
    });
    expect(calls[0].searchParams.get("index")).toBe("50");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });

  it("nextIndex es null en la última página", async () => {
    mockDeezer({ "/artist/5/top": { data: [dzTrack(1)] } });
    const body = await (await tracks(req("/api/tracks?id=5&type=artist"))).json();
    expect(body.nextIndex).toBeNull();
  });

  it("soporta álbumes usando la portada del álbum", async () => {
    mockDeezer({
      "/album/7/tracks": { data: [{ ...dzTrack(3), album: undefined }] },
      "/album/7": { id: 7, title: "X", cover_medium: "cover7.jpg" },
    });
    const body = await (await tracks(req("/api/tracks?id=7&type=album"))).json();
    expect(body.tracks[0].cover).toBe("cover7.jpg");
  });

  it("una playlist inexistente devuelve lista vacía, no un error", async () => {
    mockDeezer({});
    const res = await tracks(req("/api/tracks?id=999&type=playlist"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracks: [], nextIndex: null });
  });

  it.each([
    "/api/tracks?id=../../user/me&type=playlist",
    "/api/tracks?id=123&type=user",
    "/api/tracks?id=123&type=playlist&index=-5",
    "/api/tracks?id=123&type=playlist&index=999999",
    "/api/tracks?type=playlist",
  ])("rechaza parámetros no válidos: %s", async (path) => {
    const fetchSpy = mockDeezer({});
    const res = await tracks(req(path));
    expect(res.status).toBe(400);
    expect(fetchSpy).toHaveLength(0);
  });

  it("reintenta cuando Deezer avisa de límite de peticiones", async () => {
    let attempts = 0;
    mockDeezer({
      "/playlist/1/tracks": () => (++attempts < 2 ? { error: { code: 4, message: "Quota limit exceeded" } } : { data: [dzTrack(1)] }),
    });
    const res = await tracks(req("/api/tracks?id=1&type=playlist"));
    expect(res.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it("si Deezer sigue saturado responde error controlado sin filtrar detalles", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockDeezer({ "/playlist/1/tracks": { error: { code: 4, message: "Quota limit exceeded" } } });
    const res = await tracks(req("/api/tracks?id=1&type=playlist"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Error interno" });
  });
});

describe("/api/search", () => {
  it("busca artistas y codifica el texto de búsqueda", async () => {
    const calls = mockDeezer({ "/search/artist": { data: [{ id: 4, name: "Rosalía", picture_medium: "r.jpg" }] } });
    const body = await (await search(req("/api/search?q=rosal%C3%ADa%20%26%20co&type=artist"))).json();
    expect(body).toEqual([{ id: "4", name: "Rosalía", cover: "r.jpg", type: "artist" }]);
    expect(calls[0].searchParams.get("q")).toBe("rosalía & co");
  });

  it("busca canciones con su artista", async () => {
    mockDeezer({ "/search": { data: [dzTrack(8)] } });
    const body = await (await search(req("/api/search?q=hola&type=track"))).json();
    expect(body[0]).toMatchObject({ id: "8", artistName: "Artista", cover: "album.jpg", type: "track" });
  });

  it("sin texto no llama a Deezer", async () => {
    const calls = mockDeezer({});
    const body = await (await search(req("/api/search?q=%20%20&type=artist"))).json();
    expect(body).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("limita la longitud de la búsqueda", async () => {
    const calls = mockDeezer({ "/search/playlist": { data: [] } });
    await search(req(`/api/search?q=${"a".repeat(500)}`));
    expect(calls[0].searchParams.get("q")).toHaveLength(100);
  });
});

describe("/api/top-playlists", () => {
  it("devuelve las playlists destacadas", async () => {
    mockDeezer({ "/search/playlist": { data: [{ id: 1, title: "Éxitos", picture_medium: "p.jpg", nb_tracks: 50 }] } });
    const body = await (await topPlaylists(req("/api/top-playlists"))).json();
    expect(body).toEqual([{ id: "1", name: "Éxitos", cover: "p.jpg", songCount: 50, type: "playlist" }]);
  });
});

describe("/api/race/connections", () => {
  it("artista: canciones, álbumes y similares", async () => {
    mockDeezer({
      "/artist/1": { id: 1, name: "Artista" },
      "/artist/1/top": { data: [dzTrack(2)] },
      "/artist/1/albums": { data: [{ id: 3, title: "Disco", cover_medium: "d.jpg" }] },
      "/artist/1/related": { data: [{ id: 4, name: "Otro", picture_medium: "o.jpg" }] },
    });
    const { options } = await (await raceConnections(req("/api/race/connections?id=1&type=artist"))).json();
    expect(options.map((o: { title: string }) => o.title)).toEqual(["Canciones Populares", "Álbumes Destacados", "Artistas Similares"]);
  });

  it("artista sin similares usa el modo rescate", async () => {
    mockDeezer({
      "/artist/1": { id: 1, name: "Zzz" },
      "/search/artist": { data: [{ id: 1, name: "Zzz" }] },
      "/chart/0/artists": { data: [{ id: 50, name: "Top" }] },
    });
    const { options } = await (await raceConnections(req("/api/race/connections?id=1&type=artist"))).json();
    expect(options.at(-1).title).toBe("Top Global (Modo Rescate)");
  });

  it("canción inexistente devuelve opciones vacías", async () => {
    mockDeezer({});
    const res = await raceConnections(req("/api/race/connections?id=77&type=track"));
    expect(await res.json()).toEqual({ options: [] });
  });

  it("parámetros no válidos devuelven 400 con options vacío", async () => {
    mockDeezer({});
    const res = await raceConnections(req("/api/race/connections?id=abc&type=artist"));
    expect(res.status).toBe(400);
    expect((await res.json()).options).toEqual([]);
  });
});
