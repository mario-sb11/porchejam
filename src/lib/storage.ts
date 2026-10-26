/**
 * Almacenamiento local del jugador invitado.
 *
 * Todo lo que guarda PorcheJam en el navegador usa el prefijo "porchejam_". Las versiones
 * anteriores usaban "porchify_"; `migrateLegacyStorage` copia esos datos una sola vez para que
 * nadie pierda su progreso al actualizar.
 *
 * Son datos necesarios para que el juego funcione (nombre, partidas, ajustes), no cookies de
 * seguimiento, así que no dependen del consentimiento de cookies.
 */

export const STORAGE_PREFIX = "porchejam_";
const LEGACY_PREFIX = "porchify_";

export const STORAGE_KEYS = {
  username: "porchejam_username",
  avatar: "porchejam_avatar",
  highScore: "porchejam_high_score",
  soloGames: "porchejam_solo_games",
  partyGames: "porchejam_party_games",
  totalCorrect: "porchejam_total_correct",
  totalRounds: "porchejam_total_rounds",
  modeTally: "porchejam_mode_tally",
  matchHistory: "porchejam_match_history",
  bombsSuffered: "porchejam_bombs_suffered",
  /** Cuenta a la que pertenece el progreso guardado; si falta, el progreso es de invitado. */
  account: "porchejam_account",
} as const;

/** El navegador puede bloquear localStorage (modo privado, permisos): nunca debe romper la app. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readNumber(key: string): number {
  const value = Number.parseInt(safeStorage()?.getItem(key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = safeStorage()?.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Copia las claves "porchify_*" a "porchejam_*" sin pisar datos nuevos, y borra las antiguas. */
export function migrateLegacyStorage(storage: Storage | null = safeStorage()): void {
  if (!storage) return;
  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(LEGACY_PREFIX)) legacyKeys.push(key);
    }
    for (const key of legacyKeys) {
      const newKey = STORAGE_PREFIX + key.slice(LEGACY_PREFIX.length);
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(newKey) === null) storage.setItem(newKey, value);
      storage.removeItem(key);
    }
  } catch {
    // Si el almacenamiento está lleno o bloqueado, la app sigue funcionando sin migrar.
  }
}
