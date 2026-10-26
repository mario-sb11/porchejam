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
