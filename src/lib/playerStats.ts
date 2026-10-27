import { STORAGE_KEYS, readJson, readNumber } from "@/lib/storage";

/** Partida tal y como la guarda la pantalla de resumen (PostGameSummary). */
export interface MatchRecord {
  id: number;
  playlist: string;
  score: string;
  date: string;
  cover: string;
  mode: "solo" | "party" | string;
  specialMode: string;
  accuracy: string;
  topPlayers: { name: string; emoji: string; score: number }[] | null;
  /** Solo en partidas de El Infiltrado. */
  imposterName?: string;
  trackName?: string;
  trackArtist?: string;
}

export interface PlayerStats {
  highScore: number;
  soloGames: number;
  partyGames: number;
  totalGames: number;
  totalCorrect: number;
  totalRounds: number;
  /** Porcentaje 0-100 de aciertos en solitario, o null si aún no hay rondas. */
  accuracy: number | null;
  favoriteMode: string | null;
  recentMatches: MatchRecord[];
}

const SPECIAL_MODE_NAMES: Record<string, string> = {
  normal: "Normal",
  contrarreloj: "Patata Caliente",
  inverso: "Inverso",
  survival: "Supervivencia",
};

/** Traduce una clave del contador de modos ("solo-survival", "party-imposter-mixto") a texto legible. */
export function describeModeKey(key: string): string {
  const [mode, special, reveal] = key.split("-");
  if (special === "online") return "Arena Online";
  if (special === "imposter") {
    const revealName = reveal ? reveal.charAt(0).toUpperCase() + reveal.slice(1) : "Mixto";
    return `Infiltrado - ${revealName}`;
  }
  return `${mode === "solo" ? "Solitario" : "Fiesta"} - ${SPECIAL_MODE_NAMES[special] ?? special}`;
}

/** Lee las estadísticas del jugador invitado desde el almacenamiento del navegador. */
export function readPlayerStats(): PlayerStats {
  const soloGames = readNumber(STORAGE_KEYS.soloGames);
  const partyGames = readNumber(STORAGE_KEYS.partyGames);
  const totalRounds = readNumber(STORAGE_KEYS.totalRounds);
  // Nunca más aciertos que rondas (protege de datos antiguos inconsistentes).
  const totalCorrect = Math.min(readNumber(STORAGE_KEYS.totalCorrect), totalRounds || Infinity);

  const tally = readJson<Record<string, number>>(STORAGE_KEYS.modeTally, {});
  const favoriteKey = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    highScore: readNumber(STORAGE_KEYS.highScore),
    soloGames,
    partyGames,
    totalGames: soloGames + partyGames,
    totalCorrect,
    totalRounds,
    accuracy: totalRounds > 0 ? Math.round((totalCorrect / totalRounds) * 100) : null,
    favoriteMode: favoriteKey ? describeModeKey(favoriteKey) : null,
    recentMatches: readJson<MatchRecord[]>(STORAGE_KEYS.matchHistory, []),
  };
}

// ---------------------------------------------------------------------------
// Registro de partidas
// ---------------------------------------------------------------------------

/** Máximo de partidas que se guardan en el historial local. */
export const LOCAL_HISTORY_LIMIT = 20;

export interface MatchInput {
  mode: "solo" | "party";
  /** Clave del contador de modos: "solo-survival", "party-imposter-mixto"... */
  modeKey: string;
  /** Puntuación numérica (en fiesta, la del ganador). */
  score: number;
  correct: number;
  rounds: number;
  /** Datos para mostrar la partida en el historial. */
  record: Omit<MatchRecord, "id" | "date">;
  /** Patata caliente: al jugador le explotó la bomba. */
  bombSuffered?: boolean;
}

export interface MatchOutcome {
  isNewRecord: boolean;
  highScore: number;
  saved: MatchRecord;
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* almacenamiento lleno o bloqueado: la partida se juega igual */
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* idem */
  }
}

/** Guarda una partida terminada en el almacenamiento del navegador. */
export function recordMatchLocally(input: MatchInput, now = new Date()): MatchOutcome {
  const previousHigh = readNumber(STORAGE_KEYS.highScore);
  let highScore = previousHigh;
  let isNewRecord = false;

  if (input.mode === "solo") {
    if (input.score > previousHigh && input.score > 0) {
      highScore = input.score;
      isNewRecord = true;
      writeNumber(STORAGE_KEYS.highScore, highScore);
    }
    writeNumber(STORAGE_KEYS.soloGames, readNumber(STORAGE_KEYS.soloGames) + 1);
    writeNumber(STORAGE_KEYS.totalCorrect, readNumber(STORAGE_KEYS.totalCorrect) + Math.max(0, input.correct));
    writeNumber(STORAGE_KEYS.totalRounds, readNumber(STORAGE_KEYS.totalRounds) + Math.max(0, input.rounds));
  } else {
    writeNumber(STORAGE_KEYS.partyGames, readNumber(STORAGE_KEYS.partyGames) + 1);
  }

  const tally = readJson<Record<string, number>>(STORAGE_KEYS.modeTally, {});
  tally[input.modeKey] = (tally[input.modeKey] || 0) + 1;
  writeJson(STORAGE_KEYS.modeTally, tally);

  if (input.bombSuffered) {
    writeNumber(STORAGE_KEYS.bombsSuffered, readNumber(STORAGE_KEYS.bombsSuffered) + 1);
  }

  const saved: MatchRecord = {
    ...input.record,
    id: now.getTime(),
    date: now.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
  };
  const history = readJson<MatchRecord[]>(STORAGE_KEYS.matchHistory, []);
  writeJson(STORAGE_KEYS.matchHistory, [saved, ...(Array.isArray(history) ? history : [])].slice(0, LOCAL_HISTORY_LIMIT));

  return { isNewRecord, highScore, saved };
}

/** Datos del jugador en el formato de la nube (tabla player_stats). */
export interface CloudStats {
  high_score: number;
  solo_games: number;
  party_games: number;
  total_correct: number;
  total_rounds: number;
  mode_tally: Record<string, number>;
}

/**
 * Sustituye las estadísticas locales por las de la cuenta: con sesión iniciada, la nube es la
 * fuente de verdad y el navegador solo actúa como caché para que las pantallas lean igual.
 */
export function applyCloudStats(stats: CloudStats, matches?: MatchRecord[]): void {
  writeNumber(STORAGE_KEYS.highScore, stats.high_score);
  writeNumber(STORAGE_KEYS.soloGames, stats.solo_games);
  writeNumber(STORAGE_KEYS.partyGames, stats.party_games);
  writeNumber(STORAGE_KEYS.totalCorrect, stats.total_correct);
  writeNumber(STORAGE_KEYS.totalRounds, stats.total_rounds);
  writeJson(STORAGE_KEYS.modeTally, stats.mode_tally ?? {});
  if (matches) writeJson(STORAGE_KEYS.matchHistory, matches.slice(0, LOCAL_HISTORY_LIMIT));
}

/** Datos locales de invitado listos para importarse a una cuenta nueva. */
export type GuestSnapshot = ReturnType<typeof readGuestSnapshot>;

export function readGuestSnapshot() {
  return {
    highScore: readNumber(STORAGE_KEYS.highScore),
    soloGames: readNumber(STORAGE_KEYS.soloGames),
    partyGames: readNumber(STORAGE_KEYS.partyGames),
    totalCorrect: readNumber(STORAGE_KEYS.totalCorrect),
    totalRounds: readNumber(STORAGE_KEYS.totalRounds),
    modeTally: readJson<Record<string, number>>(STORAGE_KEYS.modeTally, {}),
    matches: readJson<MatchRecord[]>(STORAGE_KEYS.matchHistory, []).slice(0, LOCAL_HISTORY_LIMIT),
  };
}

/** Borra el progreso guardado en este navegador (al cerrar sesión en un dispositivo compartido). */
export function clearLocalProgress(): void {
  for (const key of [
    STORAGE_KEYS.highScore,
    STORAGE_KEYS.soloGames,
    STORAGE_KEYS.partyGames,
    STORAGE_KEYS.totalCorrect,
    STORAGE_KEYS.totalRounds,
    STORAGE_KEYS.modeTally,
    STORAGE_KEYS.matchHistory,
    STORAGE_KEYS.bombsSuffered,
    STORAGE_KEYS.username,
    STORAGE_KEYS.avatar,
    STORAGE_KEYS.account,
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada que borrar */
    }
  }
}
