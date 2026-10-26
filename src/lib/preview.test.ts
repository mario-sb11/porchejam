import { afterEach, describe, expect, it, vi } from "vitest";
import { freshPreviewUrl, isPreviewStale, previewExpiresAt } from "./preview";

const url = (expSeconds: number) =>
  `https://cdnt-preview.dzcdn.net/api/1/1/a.mp3?hdnea=exp=${expSeconds}~acl=/api/1/1/a.mp3*~hmac=abc`;

afterEach(() => vi.unstubAllGlobals());

describe("caducidad de previews", () => {
  it("lee la caducidad firmada en la URL", () => {
    expect(previewExpiresAt(url(1792977868))).toBe(1792977868000);
    expect(previewExpiresAt("https://example.com/a.mp3")).toBeNull();
  });

  it("considera caducada una URL a la que le queda menos de 90 s", () => {
    const now = 1_000_000_000_000;
    expect(isPreviewStale(url(now / 1000 + 60), now)).toBe(true);
    expect(isPreviewStale(url(now / 1000 + 600), now)).toBe(false);
  });

  it("no pide nada si la URL sigue siendo válida", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const fresh = url(Math.floor(Date.now() / 1000) + 600);
    expect(await freshPreviewUrl({ id: "1", previewUrl: fresh })).toBe(fresh);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renueva una URL caducada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ previewUrl: "nueva.mp3" }))));
    expect(await freshPreviewUrl({ id: "1", previewUrl: url(1_700_000_000) })).toBe("nueva.mp3");
  });

  it("si el backend falla, devuelve la URL original", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await freshPreviewUrl({ id: "1", previewUrl: url(1_700_000_000) })).toBe(url(1_700_000_000));
  });
});
