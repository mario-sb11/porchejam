// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as start } from "../../api/arena/start";
import { GET as audio } from "../../api/arena/audio";
import { normalizeTitle, pickRounds, shuffle } from "../../api/_lib/arena";

const SUPABASE = "https://abcdefghijklmnopqrst.supabase.co";
const TOKEN = "t".repeat(40);

const track = (id: number, title = `Canción ${id}`) => ({
  id: String(id),
  name: title,
  artist: `Artista ${id}`,
  previewUrl: `https://cdnt-preview.dzcdn.net/api/${id}.mp3`,
  cover: "https://cdn-images.dzcdn.net/c.jpg",
});

/** Generador pseudoaleatorio determinista para las pruebas. */
function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("pickRounds", () => {
  const pool = Array.from({ length: 30 }, (_, i) => track(i + 1));

  it("elige canciones distintas y una opción correcta coherente", () => {
    const rounds = pickRounds(pool, { rounds: 10, seconds: 15, answer: "facil" }, seeded());
    expect(rounds).toHaveLength(10);
    expect(new Set(rounds.map((r) => r.trackId)).size).toBe(10);
    for (const r of rounds) {
      expect(r.options).toHaveLength(4);
      expect(r.options![r.correct!]).toEqual({ title: r.title, artist: r.artist });
      expect(new Set(r.options!.map((o) => o.title)).size).toBe(4);
    }
  });

  it("no repite la misma canción con otro nombre (remaster, en vivo...)", () => {
    const dupes = [track(1, "Despacito"), track(2, "Despacito (Remix)"), track(3, "Despacito - Live"), track(4, "Otra"), track(5, "Más"), track(6, "Una")];
    const rounds = pickRounds(dupes, { rounds: 4, seconds: 10, answer: "medio" }, seeded());
    expect(rounds.filter((r) => normalizeTitle(r.title) === "despacito")).toHaveLength(1);
    expect(rounds.every((r) => r.options === null && r.correct === null)).toBe(true);
  });

  it("explica el problema si no hay canciones suficientes", () => {
    expect(() => pickRounds(pool.slice(0, 3), { rounds: 5, seconds: 10, answer: "dificil" })).toThrow(/solo tiene 3 canciones/);
  });

  it("descarta audios que no son de Deezer", () => {
    const evil = { ...track(99), previewUrl: "https://evil.example/a.mp3" };
    const rounds = pickRounds([evil, ...pool.slice(0, 5)], { rounds: 5, seconds: 10, answer: "medio" }, seeded());
    expect(rounds.map((r) => r.trackId)).not.toContain("99");
  });

  it("shuffle no pierde elementos", () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded()).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("/api/arena/start", () => {
  const rpcCalls: Array<{ fn: string; body: Record<string, unknown> }> = [];

  beforeEach(() => {
    rpcCalls.length = 0;
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("ARENA_SERVER_SECRET", "s".repeat(48));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function mockBackends(claimError?: { code: string; message: string }) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.origin === SUPABASE) {
          const fn = url.pathname.split("/").pop()!;
          const body = JSON.parse(String(init?.body));
          rpcCalls.push({ fn, body });
          if (fn === "arena_server_claim" && claimError) return new Response(JSON.stringify(claimError), { status: 400 });
          if (fn === "arena_server_claim") {
            return new Response(JSON.stringify({ settings: { rounds: 5, seconds: 10, answer: "facil" }, sources: [{ id: "123", type: "playlist" }] }));
          }
          return new Response(null, { status: 204 });
        }
        expect(url.origin).toBe("https://api.deezer.com");
        const index = Number(url.searchParams.get("index") ?? 0);
        const data = index === 0
          ? Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: `Tema ${i + 1}`, preview: `https://cdnt-preview.dzcdn.net/${i}.mp3`, artist: { id: 1, name: "A" } }))
          : [];
        return new Response(JSON.stringify({ data }));
      }),
    );
  }

  const post = (body: unknown) =>
    start(new Request("https://porche-jam.vercel.app/api/arena/start", { method: "POST", body: JSON.stringify(body) }));

  it("reclama la sala, elige canciones y las carga con el secreto del servidor", async () => {
    mockBackends();
    const res = await post({ code: "abc234", token: TOKEN });
    expect(res.status).toBe(200);
    expect(rpcCalls.map((c) => c.fn)).toEqual(["arena_server_claim", "arena_server_load"]);
    expect(rpcCalls[0].body).toMatchObject({ p_code: "ABC234", p_token: TOKEN, p_secret: "s".repeat(48) });
    const rounds = rpcCalls[1].body.p_rounds as Array<{ options: unknown[] }>;
    expect(rounds).toHaveLength(5);
    expect(rounds[0].options).toHaveLength(4);
    // La respuesta al navegador no lleva canciones
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rechaza códigos o tokens con formato raro sin llamar a nadie", async () => {
    mockBackends();
    expect((await post({ code: "../../x", token: TOKEN })).status).toBe(400);
    expect((await post({ code: "ABC234", token: "corto" })).status).toBe(400);
    expect((await start(new Request("https://x/api/arena/start", { method: "POST", body: "{no json" }))).status).toBe(400);
    expect((await start(new Request("https://x/api/arena/start", { method: "POST", body: "x".repeat(5000) }))).status).toBe(413);
    expect(rpcCalls).toHaveLength(0);
  });

  it("devuelve el mensaje de la base de datos si no es el anfitrión", async () => {
    mockBackends({ code: "42501", message: "Solo el anfitrión puede empezar la partida" });
    const res = await post({ code: "ABC234", token: TOKEN });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Solo el anfitrión puede empezar la partida");
  });

  it("si la música no da para la partida, libera la sala y lo explica", async () => {
    mockBackends();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.origin === SUPABASE) {
          const fn = url.pathname.split("/").pop()!;
          rpcCalls.push({ fn, body: JSON.parse(String(init?.body)) });
          if (fn === "arena_server_claim") {
            return new Response(JSON.stringify({ settings: { rounds: 20, seconds: 10, answer: "facil" }, sources: [{ id: "1", type: "album" }] }));
          }
          return new Response(null, { status: 204 });
        }
        return new Response(JSON.stringify({ data: [{ id: 1, title: "Única", preview: "https://cdnt-preview.dzcdn.net/1.mp3" }] }));
      }),
    );
    const res = await post({ code: "ABC234", token: TOKEN });
    expect(res.status).toBe(422);
    expect(rpcCalls.map((c) => c.fn)).toEqual(["arena_server_claim", "arena_server_abort"]);
  });

  it("sin configurar, responde 503 sin filtrar detalles", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("ARENA_SERVER_SECRET", "");
    mockBackends();
    const res = await post({ code: "ABC234", token: TOKEN });
    expect(res.status).toBe(503);
  });
});

describe("/api/arena/audio", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("ARENA_SERVER_SECRET", "s".repeat(48));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve solo el audio, no qué canción es", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) => {
        const url = new URL(String(input));
        if (url.origin === SUPABASE) return new Response("777");
        return new Response(JSON.stringify({ id: 777, title: "Secreto", preview: "https://cdnt-preview.dzcdn.net/777.mp3" }));
      }),
    );
    const res = await audio(new Request("https://x/api/arena/audio?code=ABC234&round=2"));
    const body = await res.json();
    expect(body).toEqual({ previewUrl: "https://cdnt-preview.dzcdn.net/777.mp3" });
    expect(JSON.stringify(body)).not.toContain("Secreto");
  });

  it("valida los parámetros", async () => {
    expect((await audio(new Request("https://x/api/arena/audio?code=ABC234&round=99"))).status).toBe(400);
    expect((await audio(new Request("https://x/api/arena/audio?code=abc&round=1"))).status).toBe(400);
  });
});
