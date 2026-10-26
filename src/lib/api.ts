/**
 * Punto único de acceso al backend de PorcheJam.
 *
 * El backend vive en /api del mismo dominio (funciones de Vercel en producción y el
 * propio servidor de Vite en desarrollo), así que no hay URLs distintas por entorno.
 */
export const API_BASE = "/api";

type QueryValue = string | number | null | undefined;

/** Construye una URL del backend codificando correctamente cada parámetro. */
export function apiUrl(path: string, params: Record<string, QueryValue> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return `${API_BASE}/${path.replace(/^\/+/, "")}${qs ? `?${qs}` : ""}`;
}
