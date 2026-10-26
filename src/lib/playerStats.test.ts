import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./storage";
import {
  applyCloudStats,
  clearLocalProgress,
  readGuestSnapshot,
  readPlayerStats,
  recordMatchLocally,
  type MatchInput,
} from "./playerStats";
import { recordMatch } from "./cloud";

const soloGame = (score: number, extra: Partial<MatchInput> = {}): MatchInput => ({
  mode: "solo",
  modeKey: "solo-normal",
  score,
  correct: 4,
  rounds: 5,
  record: { playlist: "Éxitos", score: `${score} pts`, cover: "🎵", mode: "solo", specialMode: "Normal", accuracy: "4/5", topPlayers: null },
  ...extra,
});

beforeEach(() => localStorage.clear());

describe("recordMatchLocally", () => {
  it("suma partida, aciertos, rondas y modo en solitario", () => {
    recordMatchLocally(soloGame(800));
    recordMatchLocally(soloGame(500));
    const stats = readPlayerStats();
    expect(stats).toMatchObject({ soloGames: 2, totalCorrect: 8, totalRounds: 10, highScore: 800, favoriteMode: "Solitario - Normal" });
    expect(stats.recentMatches).toHaveLength(2);
    expect(stats.recentMatches[0].score).toBe("500 pts");
  });

  it("detecta récord nuevo solo cuando se supera", () => {
    expect(recordMatchLocally(soloGame(300)).isNewRecord).toBe(true);
    const second = recordMatchLocally(soloGame(200));
    expect(second.isNewRecord).toBe(false);
    expect(second.highScore).toBe(300);
  });

  it("las partidas de fiesta no tocan récord ni precisión", () => {
    recordMatchLocally({ ...soloGame(9999), mode: "party", modeKey: "party-survival" });
    const stats = readPlayerStats();
    expect(stats).toMatchObject({ partyGames: 1, soloGames: 0, highScore: 0, accuracy: null });
  });

  it("cuenta bombas sufridas en patata caliente", () => {
    recordMatchLocally(soloGame(0, { modeKey: "solo-contrarreloj", bombSuffered: true }));
    expect(localStorage.getItem(STORAGE_KEYS.bombsSuffered)).toBe("1");
  });

  it("limita el historial a 20 partidas", () => {
    for (let i = 0; i < 25; i++) recordMatchLocally(soloGame(i));
    expect(readPlayerStats().recentMatches).toHaveLength(20);
  });
});

describe("modo invitado sin cuentas configuradas", () => {
  it("recordMatch guarda en local aunque no haya Supabase", () => {
    const outcome = recordMatch(soloGame(1200));
    expect(outcome.isNewRecord).toBe(true);
    expect(readPlayerStats().soloGames).toBe(1);
  });
});

describe("sincronización con la cuenta", () => {
  it("applyCloudStats sustituye los datos locales por los de la nube", () => {
    recordMatchLocally(soloGame(100));
    applyCloudStats({ high_score: 5000, solo_games: 40, party_games: 3, total_correct: 120, total_rounds: 200, mode_tally: { "solo-normal": 40 } }, []);
    expect(readPlayerStats()).toMatchObject({ highScore: 5000, totalGames: 43, accuracy: 60, recentMatches: [] });
  });

  it("readGuestSnapshot recoge lo necesario para importar", () => {
    recordMatchLocally(soloGame(700));
    expect(readGuestSnapshot()).toMatchObject({ highScore: 700, soloGames: 1, totalCorrect: 4, totalRounds: 5, modeTally: { "solo-normal": 1 } });
  });

  it("clearLocalProgress borra progreso e identidad, no otros ajustes", () => {
    recordMatchLocally(soloGame(700));
    localStorage.setItem(STORAGE_KEYS.username, "Mario");
    localStorage.setItem("porchejam_cookie_consent", "accepted");
    clearLocalProgress();
    expect(readPlayerStats().totalGames).toBe(0);
    expect(localStorage.getItem(STORAGE_KEYS.username)).toBeNull();
    expect(localStorage.getItem("porchejam_cookie_consent")).toBe("accepted");
  });
});

describe("nombre público", () => {
  it("acepta nombres normales y rechaza los que la base de datos no admite", async () => {
    const { isValidUsername } = await import("./cloud");
    expect(isValidUsername("Mario")).toBe(true);
    expect(isValidUsername("Peña_23")).toBe(true);
    expect(isValidUsername("x")).toBe(false);
    expect(isValidUsername("🎧DJ")).toBe(false);
    expect(isValidUsername("<script>")).toBe(false);
  });
});
