import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Dices, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerAvatar from "@/components/PlayerAvatar";
import {
  PARTS,
  STYLES,
  decodeCustom,
  encodeCustom,
  randomCustom,
  type CustomAvatar,
  type PartKey,
  type StyleKey,
} from "@/lib/avatars";
import { EMOJI_AVATARS, GALLERY_SEEDS, RARITY_LABEL, SKINS, type Rarity } from "@/data/avatarCatalog";
import { cn } from "@/lib/utils";

type Tab = "editor" | "especiales" | "galeria" | "emojis";

const TABS: { id: Tab; label: string }[] = [
  { id: "editor", label: "Crea el tuyo" },
  { id: "especiales", label: "Especiales" },
  { id: "galeria", label: "Galería" },
  { id: "emojis", label: "Emojis" },
];

const RARITY_STYLE: Record<Rarity, string> = {
  comun: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  rara: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  epica: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  legendaria: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const NAMES: Partial<Record<PartKey, Record<string, string>>> = {
  facialHair: { none: "Sin barba", beardLight: "Barba corta", beardMedium: "Barba", beardMajestic: "Barba épica", moustacheFancy: "Bigote fino", moustacheMagnum: "Bigotazo" },
  accessories: { none: "Sin gafas", prescription01: "Gafas", prescription02: "Gafas finas", round: "Redondas", kurt: "Grunge", sunglasses: "De sol", wayfarers: "Wayfarer", eyepatch: "Parche" },
  clothing: { hoodie: "Sudadera", graphicShirt: "Camiseta con dibujo", shirtCrewNeck: "Camiseta", shirtScoopNeck: "Escote redondo", shirtVNeck: "Cuello de pico", collarAndSweater: "Jersey", blazerAndShirt: "Americana", blazerAndSweater: "Americana y jersey", overall: "Peto" },
  graphic: { skull: "Calavera", skullOutline: "Calavera fina", bat: "Murciélago", bear: "Oso", deer: "Ciervo", diamond: "Diamante", pizza: "Pizza", cumbia: "Cumbia", hola: "Hola", resist: "Resist" },
};

const HEADWEAR = new Set(["hijab", "turban", "hat", "winterHat1", "winterHat02", "winterHat03", "winterHat04"]);

/** Fila del editor que recorre opciones con flechas. */
const Cycler = ({ label, part, value, onChange }: { label: string; part: PartKey; value: number; onChange: (v: number) => void }) => {
  const list = PARTS[part];
  const name = NAMES[part]?.[list[value]] ?? (part === "top" && list[value] === "none" ? "Sin pelo" : `${value + 1} de ${list.length}`);
  const step = (d: number) => onChange((value + d + list.length) % list.length);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1 justify-end">
        <button type="button" onClick={() => step(-1)} className="p-1.5 rounded-full hover:bg-white/10" aria-label={`${label}: anterior`}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold w-32 text-center truncate" aria-live="polite">{name}</span>
        <button type="button" onClick={() => step(1)} className="p-1.5 rounded-full hover:bg-white/10" aria-label={`${label}: siguiente`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/** Fila del editor con muestras de color. */
const Swatches = ({ label, part, value, onChange }: { label: string; part: PartKey; value: number; onChange: (v: number) => void }) => (
  <div className="space-y-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {PARTS[part].map((color, i) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${label} ${i + 1}`}
          onClick={() => onChange(i)}
          className={cn("w-7 h-7 rounded-full border-2 transition", value === i ? "border-white scale-110" : "border-transparent")}
          style={{ backgroundColor: `#${color}` }}
        />
      ))}
    </div>
  </div>
);

interface Props {
  open: boolean;
  current: string;
  name: string;
  onClose: () => void;
  onSave: (avatar: string) => void;
}

/** Selector de avatar: editor por partes, personajes especiales, galería de estilos y emojis. */
const AvatarPicker = ({ open, current, name, onClose, onSave }: Props) => {
  const [tab, setTab] = useState<Tab>("editor");
  const [selected, setSelected] = useState(current);
  const [custom, setCustom] = useState<CustomAvatar>(() => decodeCustom(current) ?? randomCustom());
  const [galleryStyle, setGalleryStyle] = useState<StyleKey>("lo");

  useEffect(() => {
    if (!open) return;
    setSelected(current);
    const decoded = decodeCustom(current);
    if (decoded) setCustom(decoded);
    setTab(current.startsWith("sk:") ? "especiales" : current.startsWith("av:") && !decoded ? "galeria" : decoded || current === "default" || current.startsWith("persona:") ? "editor" : "emojis");
  }, [open, current]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const setPart = (part: PartKey) => (value: number) => {
    const next = { ...custom, [part]: value };
    setCustom(next);
    setSelected(encodeCustom(next));
  };

  const top = PARTS.top[custom.top];
  const gallery = useMemo(() => GALLERY_SEEDS.map((seed) => `av:${galleryStyle}:${seed}`), [galleryStyle]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Elige tu avatar"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold">Tu avatar</h3>
              <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center py-4">
              <PlayerAvatar avatar={selected} name={name} className="w-28 h-28 text-6xl ring-4 ring-primary/40" />
            </div>

            <div className="flex gap-1 px-4" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn("flex-1 text-xs font-semibold py-2 rounded-lg transition", tab === t.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" role="tabpanel">
              {tab === "editor" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const next = randomCustom();
                      setCustom(next);
                      setSelected(encodeCustom(next));
                    }}
                    className="w-full gap-2 border-white/15 bg-white/5"
                  >
                    <Dices className="w-4 h-4" /> Aleatorio
                  </Button>
                  <Swatches label="Piel" part="skin" value={custom.skin} onChange={setPart("skin")} />
                  <Cycler label="Pelo / gorro" part="top" value={custom.top} onChange={setPart("top")} />
                  {top !== "none" && !HEADWEAR.has(top) && (
                    <Swatches label="Color de pelo" part="hairColor" value={custom.hairColor} onChange={setPart("hairColor")} />
                  )}
                  {HEADWEAR.has(top) && (
                    <Swatches label="Color del gorro" part="hatColor" value={custom.hatColor} onChange={setPart("hatColor")} />
                  )}
                  <Cycler label="Barba" part="facialHair" value={custom.facialHair} onChange={setPart("facialHair")} />
                  {PARTS.facialHair[custom.facialHair] !== "none" && (
                    <Swatches label="Color de barba" part="facialHairColor" value={custom.facialHairColor} onChange={setPart("facialHairColor")} />
                  )}
                  <Cycler label="Gafas" part="accessories" value={custom.accessories} onChange={setPart("accessories")} />
                  <Cycler label="Ojos" part="eyes" value={custom.eyes} onChange={setPart("eyes")} />
                  <Cycler label="Cejas" part="eyebrows" value={custom.eyebrows} onChange={setPart("eyebrows")} />
                  <Cycler label="Boca" part="mouth" value={custom.mouth} onChange={setPart("mouth")} />
                  <Cycler label="Ropa" part="clothing" value={custom.clothing} onChange={setPart("clothing")} />
                  {PARTS.clothing[custom.clothing] === "graphicShirt" && (
                    <Cycler label="Dibujo" part="graphic" value={custom.graphic} onChange={setPart("graphic")} />
                  )}
                  <Swatches label="Color de la ropa" part="clothesColor" value={custom.clothesColor} onChange={setPart("clothesColor")} />
                  <Swatches label="Fondo" part="background" value={custom.background} onChange={setPart("background")} />
                </>
              )}

              {tab === "especiales" && (
                <div className="grid grid-cols-2 gap-3">
                  {SKINS.map((skin) => {
                    const value = `sk:${skin.id}`;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => setSelected(value)}
                        aria-pressed={selected === value}
                        className={cn("rounded-xl p-3 text-left border transition", selected === value ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10")}
                      >
                        <PlayerAvatar avatar={value} name={skin.name} className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm font-semibold truncate">{skin.name}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{skin.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", RARITY_STYLE[skin.rarity])}>{RARITY_LABEL[skin.rarity]}</span>
                          <span className="text-[10px] text-primary font-semibold">{skin.price === 0 ? "Gratis" : `🪙 ${skin.price}`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === "galeria" && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(STYLES) as StyleKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setGalleryStyle(key)}
                        aria-pressed={galleryStyle === key}
                        className={cn("text-xs px-3 py-1.5 rounded-full border", galleryStyle === key ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground")}
                      >
                        {STYLES[key].name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {gallery.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelected(value)}
                        aria-pressed={selected === value}
                        aria-label={`Personaje ${value.split(":")[2]}`}
                        className={cn("rounded-xl p-1 transition", selected === value ? "ring-2 ring-primary bg-primary/10" : "hover:bg-white/10")}
                      >
                        <PlayerAvatar avatar={value} name="" className="w-full h-auto aspect-square" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {tab === "emojis" && (
                <div className="grid grid-cols-4 gap-3">
                  {EMOJI_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelected(emoji)}
                      aria-pressed={selected === emoji}
                      className={cn("aspect-square rounded-xl text-4xl flex items-center justify-center transition", selected === emoji ? "ring-2 ring-primary bg-primary/10" : "bg-white/5 hover:bg-white/10")}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={() => onSave(selected)} disabled={selected === current} className="flex-1 font-bold">Guardar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarPicker;
