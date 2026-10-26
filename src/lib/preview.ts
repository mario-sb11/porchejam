import { apiUrl } from "@/lib/api";

/** Margen mínimo de vida que debe tener una preview para reproducirla sin riesgo. */
const MIN_REMAINING_MS = 90_000;

/**
 * Las URLs de preview de Deezer llevan su caducidad firmada: `...?hdnea=exp=1792977868~...`.
 * Devuelve ese instante en milisegundos, o null si la URL no lo indica.
 */
export function previewExpiresAt(url: string): number | null {
  const match = /exp=(\d{9,11})/.exec(url);
  return match ? Number(match[1]) * 1000 : null;
}

export function isPreviewStale(url: string, now = Date.now()): boolean {
  const expiresAt = previewExpiresAt(url);
  return expiresAt !== null && expiresAt - now < MIN_REMAINING_MS;
}

/**
 * Devuelve una URL de preview válida para la canción. Si la que tenemos está a punto de caducar
 * (partidas largas), pide una nueva al backend. Ante cualquier fallo devuelve la original.
 */
export async function freshPreviewUrl(track: { id: string; previewUrl?: string | null }): Promise<string | null> {
  const current = track.previewUrl ?? null;
  if (current && !isPreviewStale(current)) return current;
  try {
    const res = await fetch(apiUrl("preview", { id: track.id }));
    if (!res.ok) return current;
    const data = (await res.json()) as { previewUrl: string | null };
    return data.previewUrl ?? current;
  } catch {
    return current;
  }
}
