/**
 * Puntos de una ronda: hasta 1000 según el tiempo que quede, menos 150 por cada fallo.
 * (La Arena Online calcula sus puntos en el servidor con su propia fórmula.)
 */
export function calculateScore(timeRemaining: number, maxTime: number, wrongAttempts: number): number {
  const baseScore = 1000;
  const timeRatio = maxTime > 0 ? timeRemaining / maxTime : 0;
  const timeBonus = Math.round(baseScore * timeRatio);
  const penalty = wrongAttempts * 150;
  return Math.max(0, timeBonus - penalty);
}
