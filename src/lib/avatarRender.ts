/**
 * Dibujo de avatares con DiceBear. Cada estilo se descarga por separado la primera vez que se
 * usa, para no cargar todos los diseños al abrir la app.
 */
import { createAvatar, type Style } from "@dicebear/core";
import { avatarRecipe, type StyleKey } from "@/lib/avatars";
import { SKINS } from "@/data/avatarCatalog";

type AnyStyle = Style<Record<string, unknown>>;

const LOADERS: Record<StyleKey, () => Promise<unknown>> = {
  aa: () => import("@dicebear/avataaars"),
  ad: () => import("@dicebear/adventurer"),
  lo: () => import("@dicebear/lorelei"),
  no: () => import("@dicebear/notionists"),
  op: () => import("@dicebear/open-peeps"),
  bs: () => import("@dicebear/big-smile"),
  bo: () => import("@dicebear/bottts"),
  px: () => import("@dicebear/pixel-art"),
};

const styles = new Map<StyleKey, Promise<AnyStyle>>();
const images = new Map<string, string>();

function loadStyle(key: StyleKey): Promise<AnyStyle> {
  let pending = styles.get(key);
  if (!pending) {
    pending = LOADERS[key]().then((mod) => mod as AnyStyle);
    pending.catch(() => styles.delete(key)); // si falla la red, se reintenta la próxima vez
    styles.set(key, pending);
  }
  return pending;
}

const cacheKey = (avatar: string, name: string) => `${avatar}|${avatar === "default" ? name : ""}`;

/** Imagen ya dibujada (sin esperar), si está en caché. */
export function cachedAvatarImage(avatar: string, name = "PorcheJam"): string | undefined {
  return images.get(cacheKey(avatar, name));
}

/** Devuelve "data:image/svg+xml..." para el avatar, o null si es un emoji o no es válido. */
export async function renderAvatar(avatar: string, name = "PorcheJam"): Promise<string | null> {
  const key = cacheKey(avatar, name);
  const hit = images.get(key);
  if (hit) return hit;
  const recipe = avatarRecipe(avatar, name, SKINS);
  if (!recipe) return null;
  const style = await loadStyle(recipe.style);
  const uri = createAvatar(style, recipe.options).toDataUri();
  if (images.size > 400) images.clear();
  images.set(key, uri);
  return uri;
}
