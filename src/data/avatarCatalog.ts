/**
 * Catálogo de avatares: galería por estilos y personajes especiales.
 *
 * Los personajes especiales son arquetipos musicales inventados (no personas reales).
 * Cada uno tiene rareza y un precio en monedas pensado para una futura tienda: de momento
 * todos son gratis (`price: 0`) y `released` marca los disponibles.
 */

export type Rarity = "comun" | "rara" | "epica" | "legendaria";

export const RARITY_LABEL: Record<Rarity, string> = {
  comun: "Común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

export interface Skin {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  /** Precio en monedas en la futura tienda (0 = gratis). */
  price: number;
  style: "aa" | "bo" | "px" | "ad" | "lo" | "no" | "op" | "bs";
  options: Record<string, unknown>;
}

const aa = (o: Record<string, unknown>) => ({
  seed: "porchejam",
  topProbability: 100,
  facialHairProbability: o.facialHair ? 100 : 0,
  accessoriesProbability: o.accessories ? 100 : 0,
  ...o,
});

export const SKINS: Skin[] = [
  {
    id: "trap",
    name: "Trapero de barrio",
    description: "Gafas de sol de noche y capucha puesta.",
    rarity: "rara",
    price: 0,
    style: "aa",
    options: aa({ top: ["winterHat03"], hatColor: ["262e33"], accessories: ["sunglasses"], facialHair: ["beardLight"], facialHairColor: ["2c1b18"], clothing: ["hoodie"], clothesColor: ["262e33"], eyes: ["squint"], eyebrows: ["flatNatural"], mouth: ["serious"], skinColor: ["d08b5b"], backgroundColor: ["9b5de5"] }),
  },
  {
    id: "perreo",
    name: "Rey del perreo",
    description: "Degradado perfecto y diamante en el pecho.",
    rarity: "epica",
    price: 0,
    style: "aa",
    options: aa({ top: ["theCaesarAndSidePart"], hairColor: ["2c1b18"], accessories: ["wayfarers"], facialHair: ["beardMedium"], facialHairColor: ["2c1b18"], clothing: ["graphicShirt"], clothingGraphic: ["diamond"], clothesColor: ["ff488e"], eyes: ["wink"], eyebrows: ["raisedExcitedNatural"], mouth: ["twinkle"], skinColor: ["ae5d29"], backgroundColor: ["f15bb5"] }),
  },
  {
    id: "diva",
    name: "Diva del pop",
    description: "Melena de escenario y corazones en los ojos.",
    rarity: "epica",
    price: 0,
    style: "aa",
    options: aa({ top: ["bigHair"], hairColor: ["f59797"], clothing: ["shirtScoopNeck"], clothesColor: ["ff488e"], eyes: ["hearts"], eyebrows: ["raisedExcitedNatural"], mouth: ["smile"], skinColor: ["ffdbb4"], backgroundColor: ["fee440"] }),
  },
  {
    id: "rockera",
    name: "Rockera",
    description: "Calavera, mullet y cero paciencia.",
    rarity: "rara",
    price: 0,
    style: "aa",
    options: aa({ top: ["shaggyMullet"], hairColor: ["262e33"], clothing: ["graphicShirt"], clothingGraphic: ["skull"], clothesColor: ["262e33"], eyes: ["eyeRoll"], eyebrows: ["angryNatural"], mouth: ["tongue"], skinColor: ["edb98a"], backgroundColor: ["e63946"] }),
  },
  {
    id: "cumbiero",
    name: "Cumbiero",
    description: "Si suena cumbia, sale a bailar.",
    rarity: "comun",
    price: 0,
    style: "aa",
    options: aa({ top: ["hat"], hatColor: ["e6e6e6"], facialHair: ["moustacheFancy"], facialHairColor: ["2c1b18"], clothing: ["graphicShirt"], clothingGraphic: ["cumbia"], clothesColor: ["ffffb1"], eyes: ["happy"], eyebrows: ["defaultNatural"], mouth: ["smile"], skinColor: ["d08b5b"], backgroundColor: ["ff8c42"] }),
  },
  {
    id: "flamenca",
    name: "Flamenca",
    description: "Flores en el pelo y palmas a compás.",
    rarity: "rara",
    price: 0,
    style: "aa",
    options: aa({ top: ["frida"], hairColor: ["2c1b18"], clothing: ["shirtVNeck"], clothesColor: ["ff5c5c"], eyes: ["default"], eyebrows: ["raisedExcitedNatural"], mouth: ["smile"], skinColor: ["edb98a"], backgroundColor: ["e63946"] }),
  },
  {
    id: "abuelo",
    name: "Abuelo rockero",
    description: "Vio a todos en directo antes que tú.",
    rarity: "epica",
    price: 0,
    style: "aa",
    options: aa({ top: ["shaggy"], hairColor: ["e8e1e1"], accessories: ["kurt"], facialHair: ["beardMajestic"], facialHairColor: ["e8e1e1"], clothing: ["blazerAndShirt"], clothesColor: ["262e33"], eyes: ["happy"], eyebrows: ["defaultNatural"], mouth: ["twinkle"], skinColor: ["ffdbb4"], backgroundColor: ["3a86ff"] }),
  },
  {
    id: "indie",
    name: "Indie de festival",
    description: "Gafas redondas y la pulsera del último festival.",
    rarity: "comun",
    price: 0,
    style: "aa",
    options: aa({ top: ["bun"], hairColor: ["b58143"], accessories: ["round"], clothing: ["overall"], clothesColor: ["a7ffc4"], eyes: ["side"], eyebrows: ["defaultNatural"], mouth: ["default"], skinColor: ["fd9841"], backgroundColor: ["2ec4b6"] }),
  },
  {
    id: "rastas",
    name: "Alma reggae",
    description: "Buen rollo y bajos que retumban.",
    rarity: "rara",
    price: 0,
    style: "aa",
    options: aa({ top: ["dreads"], hairColor: ["4a312c"], facialHair: ["beardLight"], facialHairColor: ["4a312c"], clothing: ["shirtCrewNeck"], clothesColor: ["a7ffc4"], eyes: ["closed"], eyebrows: ["defaultNatural"], mouth: ["smile"], skinColor: ["614335"], backgroundColor: ["fee440"] }),
  },
  {
    id: "hijab",
    name: "Productora",
    description: "Controla la mesa de mezclas como nadie.",
    rarity: "rara",
    price: 0,
    style: "aa",
    options: aa({ top: ["hijab"], hatColor: ["9b5de5"], accessories: ["prescription02"], clothing: ["blazerAndSweater"], clothesColor: ["25557c"], eyes: ["happy"], eyebrows: ["defaultNatural"], mouth: ["smile"], skinColor: ["ae5d29"], backgroundColor: ["00bbf9"] }),
  },
  {
    id: "robot-dj",
    name: "DJ Robot",
    description: "Pincha 24/7 y nunca se cansa.",
    rarity: "legendaria",
    price: 0,
    style: "bo",
    options: { seed: "DJ-Porche", backgroundColor: ["1f2937"] },
  },
  {
    id: "pixel",
    name: "Gamer retro",
    description: "Se sabe todas las bandas sonoras de 8 bits.",
    rarity: "epica",
    price: 0,
    style: "px",
    options: { seed: "Arcade", backgroundColor: ["9b5de5"] },
  },
];

/** Semillas fijas para la galería de cada estilo (siempre salen los mismos personajes). */
export const GALLERY_SEEDS = [
  "Luna", "Kai", "Noa", "Leo", "Vega", "Iker", "Alba", "Nico", "Sara", "Hugo", "Maya", "Bruno",
  "Lola", "Dani", "Irene", "Mateo", "Aitana", "Omar", "Nerea", "Yeray", "Zoe", "Elio", "Rocio", "Adri",
];

export const EMOJI_AVATARS = ["🎧", "🎸", "🎤", "🥁", "🎹", "🎷", "🎺", "🪩", "🦝", "🔥", "⚡", "👑", "😎", "🤘", "💃", "🕺"];
