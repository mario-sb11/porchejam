import { beforeEach, describe, expect, it } from "vitest";
import { currentStreak, readProgress, saveProgress, shareText, todayInMadrid } from "./daily";

beforeEach(() => localStorage.clear());

const won = (attempts: number) => ({
  status: "won" as const,
  guesses: [...Array.from({ length: attempts - 1 }, () => ({ kind: "skip" as const })), { kind: "correct" as const, label: "X" }],
});
const lost = { status: "lost" as const, guesses: Array.from({ length: 6 }, () => ({ kind: "skip" as const })) };

describe("progreso diario", () => {
  it("guarda y recupera el progreso de hoy", () => {
    saveProgress("espanol", "2026-10-26", { status: "playing", guesses: [{ kind: "wrong", label: "Otra" }] });
    expect(readProgress("espanol", "2026-10-26").guesses).toHaveLength(1);
    expect(readProgress("global", "2026-10-26").guesses).toHaveLength(0);
  });

  it("un día nuevo empieza de cero", () => {
    saveProgress("espanol", "2026-10-26", won(2));
    expect(readProgress("espanol", "2026-10-27")).toEqual({ guesses: [], status: "playing" });
  });
});

describe("rachas", () => {
  it("cuenta días seguidos acertados", () => {
    saveProgress("global", "2026-10-24", won(1));
    saveProgress("global", "2026-10-25", won(3));
    saveProgress("global", "2026-10-26", won(2));
    expect(currentStreak("global", "2026-10-26")).toBe(3);
  });

  it("si hoy aún no has jugado, la racha de ayer sigue viva", () => {
    saveProgress("global", "2026-10-25", won(1));
    expect(currentStreak("global", "2026-10-26")).toBe(1);
  });

  it("fallar o saltarse un día rompe la racha", () => {
    saveProgress("global", "2026-10-23", won(1));
    saveProgress("global", "2026-10-25", lost);
    expect(currentStreak("global", "2026-10-26")).toBe(0);
  });

  it("cruza meses correctamente", () => {
    saveProgress("clasicos", "2026-10-31", won(1));
    saveProgress("clasicos", "2026-11-01", won(1));
    expect(currentStreak("clasicos", "2026-11-01")).toBe(2);
  });
});

describe("compartir", () => {
  it("resume los intentos con cuadros", () => {
    expect(shareText("espanol", 7, won(3))).toContain("🔊⬛⬛🟩⬜⬜⬜ 3/6");
    expect(shareText("espanol", 7, lost)).toContain("X/6");
  });

  it("usa la fecha de Madrid", () => {
    expect(todayInMadrid(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
  });
});
