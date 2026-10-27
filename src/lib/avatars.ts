/**
 * Avatares de PorcheJam.
 *
 * Se dibujan en el propio navegador con DiceBear (versión fijada en package.json), así un avatar
 * se ve siempre igual en cualquier pantalla y dispositivo, sin depender de un servicio externo.
 * Este archivo solo sabe leer y escribir avatares (es ligero); el dibujo está en avatarRender.ts.
 *
 * Cada avatar se guarda como un texto corto (máx. 40 caracteres, igual que en la base de datos):
 *   "av:c:<14 caracteres>"  personaje creado en el editor (estilo Avataaars)
 *   "av:<estilo>:<semilla>" personaje de la galería de un estilo
 *   "sk:<id>"               personaje especial del catálogo
 *   "persona:<Nombre>"      formato antiguo (se sigue mostrando igual)
 *   "default"               formato antiguo: se sustituye por uno aleatorio fijo
 *   cualquier otro texto    emoji
 */

// ---------------------------------------------------------------------------
// Estilos de la galería
// ---------------------------------------------------------------------------

/** Estilos disponibles. El dibujo de cada uno se descarga solo cuando hace falta (avatarRender.ts). */
export const STYLES = {
  aa: { name: "Clásico" },
  ad: { name: "Aventura" },
  lo: { name: "Lorelei" },
  no: { name: "Boceto" },
  op: { name: "Peeps" },
  bs: { name: "Sonrisas" },
  bo: { name: "Robots" },
  px: { name: "Píxel" },
} as const;
export type StyleKey = keyof typeof STYLES;

/** Fondos de la casa (se ven bien sobre el tema oscuro). */
export const BACKGROUNDS = ["1ed760", "9b5de5", "f15bb5", "00bbf9", "fee440", "ff8c42", "3a86ff", "2ec4b6", "e63946", "1f2937"];

// ---------------------------------------------------------------------------
// Editor: opciones de Avataaars en un orden FIJO (el índice va dentro del texto guardado,
// así que estas listas solo pueden crecer por el final).
// ---------------------------------------------------------------------------

export const PARTS = {
  skin: ["614335", "ae5d29", "d08b5b", "edb98a", "fd9841", "ffdbb4", "f8d25c"],
  top: [
    "none", "shortFlat", "shortRound", "shortWaved", "shortCurly", "theCaesar", "theCaesarAndSidePart", "sides",
    "shavedSides", "fro", "froBand", "dreads", "dreads01", "dreads02", "frizzle", "shaggy", "shaggyMullet",
    "curly", "curvy", "bob", "bun", "bigHair", "longButNotTooLong", "miaWallace", "straight01", "straight02",
    "straightAndStrand", "frida", "hijab", "turban", "hat", "winterHat1", "winterHat02", "winterHat03", "winterHat04",
  ],
  hairColor: ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "c93305", "f59797", "ecdcbf", "e8e1e1"],
  facialHair: ["none", "beardLight", "beardMedium", "beardMajestic", "moustacheFancy", "moustacheMagnum"],
  facialHairColor: ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "c93305", "f59797", "ecdcbf", "e8e1e1"],
  accessories: ["none", "prescription01", "prescription02", "round", "kurt", "sunglasses", "wayfarers", "eyepatch"],
  clothing: ["hoodie", "graphicShirt", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck", "collarAndSweater", "blazerAndShirt", "blazerAndSweater", "overall"],
  clothesColor: ["262e33", "3c4f5c", "25557c", "5199e4", "65c9ff", "b1e2ff", "a7ffc4", "ffffb1", "ffafb9", "ff488e", "ff5c5c", "929598", "e6e6e6", "ffffff"],
  graphic: ["skull", "skullOutline", "bat", "bear", "deer", "diamond", "pizza", "cumbia", "hola", "resist"],
  eyes: ["default", "happy", "wink", "side", "squint", "surprised", "hearts", "eyeRoll", "winkWacky", "closed", "cry", "xDizzy"],
  eyebrows: ["defaultNatural", "default", "raisedExcitedNatural", "raisedExcited", "flatNatural", "upDownNatural", "upDown", "angryNatural", "angry", "sadConcernedNatural", "sadConcerned", "frownNatural", "unibrowNatural"],
  mouth: ["smile", "default", "twinkle", "tongue", "serious", "eating", "concerned", "disbelief", "grimace", "sad", "screamOpen", "vomit"],
  background: BACKGROUNDS,
  hatColor: ["262e33", "3c4f5c", "25557c", "5199e4", "65c9ff", "b1e2ff", "a7ffc4", "ffdeb5", "ffffb1", "ffafb9", "ff488e", "ff5c5c", "929598", "e6e6e6", "ffffff"],
} as const;

export type PartKey = keyof typeof PARTS;
export const PART_ORDER: PartKey[] = [
  "skin", "top", "hairColor", "facialHair", "facialHairColor", "accessories", "clothing",
  "clothesColor", "graphic", "eyes", "eyebrows", "mouth", "background", "hatColor",
];
export type CustomAvatar = Record<PartKey, number>;

const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";

export function encodeCustom(custom: CustomAvatar): string {
  return "av:c:" + PART_ORDER.map((k) => B36[Math.max(0, Math.min(custom[k] ?? 0, PARTS[k].length - 1))]).join("");
}

export function decodeCustom(avatar: string): CustomAvatar | null {
  const match = /^av:c:([0-9a-z]{14})$/.exec(avatar);
  if (!match) return null;
  const custom = {} as CustomAvatar;
  PART_ORDER.forEach((k, i) => {
    const index = B36.indexOf(match[1][i]);
    custom[k] = index < PARTS[k].length ? index : 0;
  });
  return custom;
}

export function randomCustom(random: () => number = Math.random): CustomAvatar {
  const pick = (k: PartKey) => Math.floor(random() * PARTS[k].length);
  const custom = {} as CustomAvatar;
  for (const k of PART_ORDER) custom[k] = pick(k);
  // Que la mayoría tenga pelo, ropa sin dibujo raro y sin parche en el ojo.
  if (random() < 0.15) custom.top = 0;
  if (random() < 0.6) custom.facialHair = 0;
  if (random() < 0.6) custom.accessories = 0;
  if (PARTS.accessories[custom.accessories] === "eyepatch") custom.accessories = 0;
  if (["cry", "xDizzy"].includes(PARTS.eyes[custom.eyes])) custom.eyes = 1;
  if (["vomit", "sad", "screamOpen"].includes(PARTS.mouth[custom.mouth])) custom.mouth = 0;
  return custom;
}

export function randomAvatar(): string {
  return encodeCustom(randomCustom());
}

/** Opciones de DiceBear para un personaje del editor. */
export function customToOptions(c: CustomAvatar): Record<string, unknown> {
  const top = PARTS.top[c.top];
  const facialHair = PARTS.facialHair[c.facialHair];
  const accessories = PARTS.accessories[c.accessories];
  return {
    seed: "porchejam",
    skinColor: [PARTS.skin[c.skin]],
    top: top === "none" ? ["shortFlat"] : [top],
    topProbability: top === "none" ? 0 : 100,
    hairColor: [PARTS.hairColor[c.hairColor]],
    hatColor: [PARTS.hatColor[c.hatColor]],
    facialHair: facialHair === "none" ? ["beardLight"] : [facialHair],
    facialHairProbability: facialHair === "none" ? 0 : 100,
    facialHairColor: [PARTS.facialHairColor[c.facialHairColor]],
    accessories: accessories === "none" ? ["round"] : [accessories],
    accessoriesProbability: accessories === "none" ? 0 : 100,
    clothing: [PARTS.clothing[c.clothing]],
    clothesColor: [PARTS.clothesColor[c.clothesColor]],
    clothingGraphic: [PARTS.graphic[c.graphic]],
    eyes: [PARTS.eyes[c.eyes]],
    eyebrows: [PARTS.eyebrows[c.eyebrows]],
    mouth: [PARTS.mouth[c.mouth]],
    backgroundColor: [PARTS.background[c.background]],
  };
}

// ---------------------------------------------------------------------------
// Qué hay que dibujar para cada avatar
// ---------------------------------------------------------------------------

const SEED = /^[A-Za-z0-9_-]{1,24}$/;

export interface AvatarRecipe {
  style: StyleKey;
  options: Record<string, unknown>;
}

/** Traduce el texto guardado a estilo + opciones de DiceBear, o null si es un emoji/no válido. */
export function avatarRecipe(avatar: string, name = "PorcheJam", skins: { id: string; style: StyleKey; options: Record<string, unknown> }[] = []): AvatarRecipe | null {
  const custom = decodeCustom(avatar);
  if (custom) return { style: "aa", options: customToOptions(custom) };
  if (avatar.startsWith("sk:")) {
    const skin = skins.find((s) => s.id === avatar.slice(3));
    return skin ? { style: skin.style, options: { ...skin.options } } : null;
  }
  if (avatar.startsWith("av:")) {
    const [, styleKey, seed] = avatar.split(":");
    if (styleKey in STYLES && SEED.test(seed ?? "")) {
      return { style: styleKey as StyleKey, options: { seed, backgroundColor: BACKGROUNDS } };
    }
    return null;
  }
  if (avatar === "default" || avatar.startsWith("persona:")) {
    const seed = avatar === "default" ? name : avatar.slice("persona:".length);
    return { style: "aa", options: { seed: seed.slice(0, 40), backgroundColor: BACKGROUNDS } };
  }
  return null;
}

/** ¿Es un emoji (o texto) en lugar de una ilustración? */
export function isEmojiAvatar(avatar: string): boolean {
  return !/^(av:|sk:|persona:|default$)/.test(avatar);
}
