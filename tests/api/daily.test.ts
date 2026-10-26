// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeTitle,
  pickTrack,
  puzzleNumber,
  resetDailyCacheForTests,
  sameSong,
  todayInMadrid,
  type DailyTrack,
} from "../../api/_lib/daily";
import { GET as puzzle } from "../../api/daily/puzzle";
import { GET as guess } from "../../api/daily/guess";
import { GET as reveal } from "../../api/daily/reveal";

const track = (id: number, name = `Canción ${id}`, artist = "Artista"): DailyTrack => ({
  id: String(id), name, artist, previewUrl: `https://cdnt-preview.dzcdn.net/${id}.mp3`, cover: "c.jpg",
});

const dz = (t: DailyTrack) => ({ id: Number(t.id), title: t.name, preview: t.previewUrl, artist: { id: 1, name: t.artist }, album: { id: 2, title: "A", cover_medium: t.cover } });

function mockPlaylists(tracks: DailyTrack[], extraTracks: Record<string, DailyTrack> = {}) {
  vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/playlist/")) {
      const index = Number(url.searchParams.get("index") ?? 0);
      return new Response(JSON.stringify({ data: index === 0 ? tracks.map(dz) : [] }));
    }
    const m = /^\/track\/(\d+)$/.exec(url.pathname);
    if (m && extraTracks[m[1]]) return new Response(JSON.stringify(dz(extraTracks[m[1]])));
    return new Response(JSON.stringify({ error: { code: 800, message: "no data" } }));
  }));
}

const req = (path: string) => new Request(`https://porche-jam.vercel.app${path}`);

beforeEach(() => resetDailyCacheForTests());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("elección de la canción del día", () => {
  const pool = Array.from({ length: 50 }, (_, i) => track(i + 1));

  it("es la misma para todos el mismo día", () => {
    expect(pickTrack(pool, "2026-10-26", "espanol")).toEqual(pickTrack([...pool].reverse(), "2026-10-26", "espanol"));
  });

  it("cambia según el día y la categoría", () => {
    const days = new Set(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"].map((d) => pickTrack(pool, d, "espanol")!.id));
    expect(days.size).toBeGreaterThan(1);
    expect(pickTrack(pool, "2026-10-26", "espanol")!.id).not.toBe(pickTrack(pool, "2026-10-26", "global")!.id);
  });

  it("no cambia aunque la playlist se reordene o pierda otras canciones", () => {
    const chosen = pickTrack(pool, "2026-10-26", "global")!;
    const shrunk = pool.filter((t, i) => t.id === chosen.id || i % 3 === 0);
    expect(pickTrack(shrunk, "2026-10-26", "global")!.id).toBe(chosen.id);
  });

  it("usa el día de Madrid, no el UTC", () => {
    // 23:30 UTC del 25 de octubre = 00:30 del 26 en Madrid (horario de invierno, UTC+1)
    expect(todayInMadrid(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    expect(puzzleNumber("2026-10-26")).toBe(1);
    expect(puzzleNumber("2026-11-05")).toBe(11);
  });
});

describe("comparación de respuestas", () => {
  it("acepta versiones de la misma canción", () => {
    expect(sameSong({ name: "Despechá (Remix)", artist: "ROSALÍA, Feid" }, { name: "DESPECHÁ", artist: "Rosalía" })).toBe(true);
    expect(sameSong({ name: "Flowers - Radio Edit", artist: "Miley Cyrus" }, { name: "Flowers", artist: "Miley Cyrus" })).toBe(true);
  });

  it("no confunde canciones distintas", () => {
    expect(sameSong({ name: "Flowers", artist: "Miley Cyrus" }, { name: "Flowers", artist: "Otro Artista" })).toBe(false);
    expect(sameSong({ name: "(Intro)", artist: "X" }, { name: "(Outro)", artist: "X" })).toBe(false);
  });

  it("normaliza tildes, feat y paréntesis", () => {
    expect(normalizeTitle("Tú Me Dejaste De Querer (feat. Rosalía)")).toBe("tu me dejaste de querer");
  });
});

describe("/api/daily", () => {
  const pool = Array.from({ length: 10 }, (_, i) => track(i + 1));

  it("puzzle da el audio pero nunca el título ni el artista", async () => {
    mockPlaylists(pool);
    const body = await (await puzzle(req("/api/daily/puzzle?category=espanol"))).json();
    expect(body.date).toBe(todayInMadrid());
    expect(body.previewUrl).toMatch(/^https:\/\/cdnt-preview/);
    expect(JSON.stringify(body)).not.toMatch(/Canción|Artista/);
  });

  it("guess acierta con la canción del día y falla con otra", async () => {
    mockPlaylists(pool);
    const date = todayInMadrid();
    const answer = await (await reveal(req(`/api/daily/reveal?category=global&date=${date}`))).json();
    const wrongId = answer.id === "1" ? "2" : "1";
    expect(await (await guess(req(`/api/daily/guess?category=global&date=${date}&id=${answer.id}`))).json()).toEqual({ correct: true });
    expect(await (await guess(req(`/api/daily/guess?category=global&date=${date}&id=${wrongId}`))).json()).toEqual({ correct: false });
  });

  it("guess acepta otra versión de la misma canción", async () => {
    const date = todayInMadrid();
    mockPlaylists(pool);
    const answer = await (await reveal(req(`/api/daily/reveal?category=global&date=${date}`))).json();
    resetDailyCacheForTests();
    mockPlaylists(pool, { "999": track(999, `${answer.name} (Live)`, answer.artist) });
    expect(await (await guess(req(`/api/daily/guess?category=global&date=${date}&id=999`))).json()).toEqual({ correct: true });
  });

  it("no deja comprobar ni desvelar retos de otros días", async () => {
    mockPlaylists(pool);
    expect((await reveal(req("/api/daily/reveal?category=global&date=2020-01-01"))).status).toBe(409);
    expect((await guess(req("/api/daily/guess?category=global&date=2020-01-01&id=1"))).status).toBe(409);
  });

  it("rechaza categorías desconocidas", async () => {
    mockPlaylists(pool);
    expect((await puzzle(req("/api/daily/puzzle?category=hackeo"))).status).toBe(400);
  });
});
