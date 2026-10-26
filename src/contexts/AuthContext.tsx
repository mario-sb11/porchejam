import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountsEnabled, enabledProviders, supabase, type AuthProvider } from "@/lib/supabase";
import { syncAfterLogin, type Profile } from "@/lib/cloud";
import { clearLocalProgress } from "@/lib/playerStats";

interface AuthState {
  /** Hay cuentas activadas en este despliegue. */
  accountsEnabled: boolean;
  providers: ReadonlySet<AuthProvider>;
  session: Session | null;
  profile: Profile | null;
  /** Comprobando la sesión o sincronizando datos tras iniciarla. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Borra la cuenta y todos sus datos (derecho de supresión). */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** URL a la que vuelve el usuario tras iniciar sesión: siempre el propio dominio. */
const redirectTo = () => `${window.location.origin}/`;

export function AuthProviderRoot({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const handleSession = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        syncedUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }
      // Supabase repite SIGNED_IN al volver a la pestaña: no hace falta resincronizar.
      if (syncedUserId.current === next.user.id) return;
      syncedUserId.current = next.user.id;
      setLoading(true);
      try {
        const synced = await syncAfterLogin(next.user);
        if (active) setProfile(synced);
      } catch (error) {
        console.warn("[cuenta] Error sincronizando tras iniciar sesión", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => handleSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      // Solo reaccionamos a cambios reales de sesión; la renovación del token no requiere resincronizar.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Diferido: las llamadas a Supabase dentro del callback pueden bloquearlo.
        setTimeout(() => handleSession(next), 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    // En un dispositivo compartido, el siguiente invitado no debe ver tu progreso.
    clearLocalProgress();
    setProfile(null);
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    await signOut();
  }, [signOut]);

  const value = useMemo<AuthState>(
    () => ({
      accountsEnabled,
      providers: enabledProviders,
      session,
      profile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      deleteAccount,
    }),
    [session, profile, loading, signInWithGoogle, signInWithEmail, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProviderRoot");
  return ctx;
}
