import { describe, expect, it } from "vitest";
import { PARTS, PART_ORDER, STYLES, avatarRecipe, decodeCustom, encodeCustom, isEmojiAvatar, randomCustom } from "./avatars";
import { renderAvatar } from "./avatarRender";
import { EMOJI_AVATARS, GALLERY_SEEDS, SKINS } from "@/data/avatarCatalog";

const svg = (uri: string | null) => decodeURIComponent((uri ?? "").replace(/^data:image\/svg\+xml;utf8,/, ""));

describe("avatares", () => {
  it("codifica y decodifica un personaje del editor en menos de 40 caracteres", () => {
    for (let i = 0; i < 50; i++) {
      const c = randomCustom();
      const text = encodeCustom(c);
      expect(text.length).toBeLessThanOrEqual(40);
      expect(decodeCustom(text)).toEqual(c);
    }
  });

  it("todas las listas caben en un carácter base 36", () => {
    for (const k of PART_ORDER) expect(PARTS[k].length).toBeLessThanOrEqual(36);
  });

  it("dibuja siempre lo mismo para el mismo avatar", async () => {
    const text = encodeCustom(randomCustom());
    expect(await renderAvatar(text)).toBe(await renderAvatar(text));
    expect(await renderAvatar("av:lo:Luna")).toMatch(/^data:image\/svg\+xml/);
  });

  it("dibuja todos los personajes del catálogo y un personaje de cada estilo", async () => {
    for (const skin of SKINS) {
      expect(skin.id.length + 3).toBeLessThanOrEqual(40);
      expect(svg(await renderAvatar(`sk:${skin.id}`))).toContain("<svg");
    }
    for (const key of Object.keys(STYLES)) {
      expect(svg(await renderAvatar(`av:${key}:${GALLERY_SEEDS[0]}`))).toContain("<svg");
    }
  });

  it("los formatos antiguos se siguen viendo y los emojis no se dibujan", async () => {
    expect(await renderAvatar("persona:Leo")).toMatch(/^data:image/);
    expect(await renderAvatar("default", "Mario")).toMatch(/^data:image/);
    for (const e of EMOJI_AVATARS) {
      expect(isEmojiAvatar(e)).toBe(true);
      expect(await renderAvatar(e)).toBeNull();
    }
  });

  it("ignora textos manipulados", () => {
    expect(avatarRecipe("av:zz:Luna")).toBeNull();
    expect(avatarRecipe('av:lo:"><script>')).toBeNull();
    expect(avatarRecipe("sk:no-existe", "x", SKINS)).toBeNull();
    expect(decodeCustom("av:c:zzzzzzzzzzzzzz")).not.toBeNull(); // índices fuera de rango → valores por defecto
  });
});
