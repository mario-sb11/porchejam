import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/storage";
import {
  LOCAL_HISTORY_LIMIT,
  applyCloudStats,
  readGuestSnapshot,
  recordMatchLocally,
  type CloudStats,
  type MatchInput,
  type MatchOutcome,
  type MatchRecord,
} from "@/lib/playerStats";

export interface Profile {
  id: string;
  username: string;
  avatar: string;
}

function setLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: la app sigue funcionando */
  }
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function pullStatsIntoLocal(userId: string): Promise<void> {
  if (!supabase) return;
  const [{ data: stats }, { data: matches }] = await Promise.all([
    supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("matches").select("record").eq("user_id", userId).order("played_at", { ascending: false }).limit(LOCAL_HISTORY_LIMIT),
  ]);
  if (stats) {
    applyCloudStats(stats as CloudStats, (matches ?? []).map((m) => m.record as MatchRecord));
  }
}

/**
 * Tras iniciar sesión: sube una sola vez el progreso de invitado, descarga el de la cuenta y
 * deja el perfil en el navegador para que todas las pantallas lo lean como siempre.
 */
export async function syncAfterLogin(user: User): Promise<Profile | null> {
  if (!supabase) return null;

  const { data: profile } = await supabase.from("profiles").select("id, username, avatar").eq("id", user.id).maybeSingle();
  const { data: stats } = await supabase.from("player_stats").select("guest_imported_at").eq("user_id", user.id).maybeSingle();

  if (stats && !stats.guest_imported_at) {
    const guest = readGuestSnapshot();
    await supabase.rpc("import_guest_stats", {
      p_high_score: guest.highScore,
      p_solo_games: guest.soloGames,
      p_party_games: guest.partyGames,
      p_total_correct: guest.totalCorrect,
      p_total_rounds: guest.totalRounds,
      p_mode_tally: guest.modeTally,
      p_matches: guest.matches,
    });

    // Si como invitado ya había elegido avatar, se conserva en la cuenta.
    const localAvatar = localStorage.getItem(STORAGE_KEYS.avatar);
    if (profile && profile.avatar === "default" && localAvatar && localAvatar !== "default") {
      await supabase.from("profiles").update({ avatar: localAvatar }).eq("id", user.id);
      profile.avatar = localAvatar;
    }
  }

  await pullStatsIntoLocal(user.id);

  if (profile) {
    setLocal(STORAGE_KEYS.username, profile.username);
    setLocal(STORAGE_KEYS.avatar, profile.avatar);
  }
  return profile as Profile | null;
}

/**
 * Registra una partida: siempre en el navegador (al instante, también sin conexión) y,
 * si hay sesión, en la cuenta. Un fallo de red nunca rompe la pantalla de resultados.
 */
export function recordMatch(input: MatchInput): MatchOutcome {
  const outcome = recordMatchLocally(input);
  void (async () => {
    if (!supabase || !(await currentUserId())) return;
    const { data, error } = await supabase.rpc("record_match", {
      p_mode: input.mode,
      p_mode_key: input.modeKey,
      p_score: Math.round(input.score),
      p_correct: input.correct,
      p_rounds: input.rounds,
      p_record: outcome.saved,
    });
    if (error) {
      console.warn("[cuenta] No se pudo guardar la partida en la nube:", error.message);
      return;
    }
    if (data) applyCloudStats(data as CloudStats);
  })();
  return outcome;
}

export async function updateAvatar(avatar: string): Promise<void> {
  setLocal(STORAGE_KEYS.avatar, avatar);
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  await supabase.from("profiles").update({ avatar }).eq("id", userId);
}
