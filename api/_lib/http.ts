/**
 * Utilidades HTTP compartidas por las funciones de /api.
 * Los archivos dentro de carpetas que empiezan por "_" no se despliegan como endpoints.
 */

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Perfiles de caché para la CDN de Vercel. `s-maxage` lo respeta la CDN; `max-age` el navegador. */
export const CACHE = {
  /** Datos que cambian poco (búsquedas, conexiones de Music Race). */
  long: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  /**
   * Listas de canciones. Las URLs de preview de Deezer caducan ~15 min después de generarse,
   * así que la respuesta cacheada nunca puede tener más de 3 min (le quedan >= 12 min de vida).
   */
  tracks: "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
  /** Una sola preview recién firmada (ver /api/preview). */
  preview: "public, max-age=30, s-maxage=60",
  none: "no-store",
} as const;

const SECURITY_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export function json(data: unknown, init: { status?: number; cache?: string } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { ...SECURITY_HEADERS, "Cache-Control": init.cache ?? CACHE.none },
  });
}

// ---------------------------------------------------------------------------
// Validación de parámetros: todo lo que llega del cliente se trata como hostil.
// ---------------------------------------------------------------------------

const DEEZER_ID = /^\d{1,20}$/;

export function requireId(params: URLSearchParams, name = "id"): string {
  const value = params.get(name)?.trim() ?? "";
  if (!DEEZER_ID.test(value)) throw new HttpError(400, `Parámetro '${name}' no válido`);
  return value;
}

export function requireEnum<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T {
  const value = params.get(name)?.trim() ?? "";
  if (!(allowed as readonly string[]).includes(value)) {
    throw new HttpError(400, `Parámetro '${name}' no válido`);
  }
  return value as T;
}

export function optionalIndex(params: URLSearchParams, name = "index", max = 10_000): number {
  const raw = params.get(name);
  if (raw === null || raw === "") return 0;
  if (!/^\d{1,5}$/.test(raw)) throw new HttpError(400, `Parámetro '${name}' no válido`);
  const value = Number(raw);
  if (value > max) throw new HttpError(400, `Parámetro '${name}' fuera de rango`);
  return value;
}

/** Texto de búsqueda: se recorta, se eliminan caracteres de control y se limita la longitud. */
export function searchQuery(params: URLSearchParams, name = "q", maxLength = 100): string {
  return (params.get(name) ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Envuelve un handler para que cualquier error termine en una respuesta JSON controlada,
 * sin filtrar trazas internas al cliente.
 */
export function handler(
  fn: (params: URLSearchParams, request: Request) => Promise<Response>,
  fallback: Record<string, unknown> = {},
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(new URL(request.url).searchParams, request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message, ...fallback }, { status: error.status });
      }
      console.error("[api]", request.url, error);
      return json({ error: "Error interno", ...fallback }, { status: 502 });
    }
  };
}
