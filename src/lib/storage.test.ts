import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS, migrateLegacyStorage, readJson, readNumber } from "./storage";
import { readPlayerStats } from "./playerStats";

beforeEach(() => localStorage.clear());

describe("migrateLegacyStorage", () => {
  it("mueve los datos antiguos porchify_* a porchejam_*", () => {
    localStorage.setItem("porchify_high_score", "4200");
    localStorage.setItem("porchify_match_history", "[]");
    migrateLegacyStorage();
    expect(localStorage.getItem("porchejam_high_score")).toBe("4200");
    expect(localStorage.getItem("porchejam_match_history")).toBe("[]");
    expect(localStorage.getItem("porchify_high_score")).toBeNull();
  });

  it("no pisa datos nuevos ni borra claves que ya son porchejam_*", () => {
    localStorage.setItem("porchejam_high_score", "9000");
    localStorage.setItem("porchejam_username", "Mario");
    localStorage.setItem("porchify_high_score", "10");
    migrateLegacyStorage();
    expect(localStorage.getItem("porchejam_high_score")).toBe("9000");
    expect(localStorage.getItem("porchejam_username")).toBe("Mario");
  });

  it("es idempotente", () => {
    localStorage.setItem("porchify_solo_games", "3");
    migrateLegacyStorage();
    migrateLegacyStorage();
    expect(localStorage.getItem("porchejam_solo_games")).toBe("3");
  });

  it("no rompe si no hay almacenamiento", () => {
    expect(() => migrateLegacyStorage(null)).not.toThrow();
  });
});

describe("lectura segura", () => {
  it("devuelve valores por defecto ante datos corruptos", () => {
    localStorage.setItem("x", "{no es json");
    localStorage.setItem("n", "abc");
    expect(readJson("x", [])).toEqual([]);
    expect(readNumber("n")).toBe(0);
  });
});

describe("readPlayerStats", () => {
  it("calcula totales, precisión y modo favorito", () => {
    localStorage.setItem(STORAGE_KEYS.soloGames, "4");
    localStorage.setItem(STORAGE_KEYS.partyGames, "2");
    localStorage.setItem(STORAGE_KEYS.totalCorrect, "15");
    localStorage.setItem(STORAGE_KEYS.totalRounds, "20");
    localStorage.setItem(STORAGE_KEYS.modeTally, JSON.stringify({ "solo-survival": 3, "party-imposter-mixto": 5 }));
    const stats = readPlayerStats();
    expect(stats.totalGames).toBe(6);
    expect(stats.accuracy).toBe(75);
    expect(stats.favoriteMode).toBe("Infiltrado - Mixto");
  });

  it("sin datos no inventa nada", () => {
    const stats = readPlayerStats();
    expect(stats).toMatchObject({ totalGames: 0, accuracy: null, favoriteMode: null, recentMatches: [] });
  });
});
