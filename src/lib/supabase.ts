import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase (cuentas y estadísticas en la nube).
 *
 * Es opcional: si no hay variables de entorno, la app funciona igual que siempre en modo
 * invitado, guardando todo en el navegador. La clave publicable está pensada para ir en el
 * cliente; la seguridad la ponen las políticas RLS y las funciones de la base de datos.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export type AuthProvider = "google" | "email";

/** Métodos de acceso activados (VITE_AUTH_PROVIDERS="google,email"). Sin Supabase, ninguno. */
export const enabledProviders: ReadonlySet<AuthProvider> = new Set(
  supabase
    ? String(import.meta.env.VITE_AUTH_PROVIDERS ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter((p): p is AuthProvider => p === "google" || p === "email")
    : [],
);

export const accountsEnabled = enabledProviders.size > 0;
