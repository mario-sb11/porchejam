export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  ready: boolean;
  streak: number;
}

export const MOCK_PLAYERS: Player[] = [
  { id: "1", name: "DJ_Master", avatar: "🎧", score: 4200, ready: true, streak: 5 },
  { id: "2", name: "BeatDropper", avatar: "🎵", score: 3800, ready: true, streak: 3 },
  { id: "3", name: "VinylQueen", avatar: "👸", score: 3500, ready: false, streak: 2 },
  { id: "4", name: "SoundWave", avatar: "🌊", score: 2900, ready: true, streak: 0 },
  { id: "5", name: "NeonRider", avatar: "🏍️", score: 2100, ready: false, streak: 1 },
];

export const CHALLENGE_TYPES = [
  { id: "first5", label: "Primeros 5 Segundos", icon: "⚡", description: "Adivina la canción con los primeros 5 segundos" },
  { id: "random", label: "Fragmento Aleatorio", icon: "🎲", description: "Suena una parte al azar de la canción" },
  { id: "album", label: "Adivina el Álbum", icon: "💿", description: "Di a qué álbum pertenece la canción" },
  { id: "artist", label: "Adivina el Artista", icon: "🎤", description: "Escucha el fragmento y escribe el artista" },
  { id: "cover", label: "La Portada", icon: "🖼️", description: "La carátula aparece pixelada y se va aclarando" },
  { id: "year", label: "Adivina el Año", icon: "🎼", description: "Escucha y escribe el año de la canción" },
];

export function calculateScore(timeRemaining: number, maxTime: number, wrongAttempts: number): number {
  const baseScore = 1000;
  const timeRatio = timeRemaining / maxTime;
  const timeBonus = Math.round(baseScore * timeRatio);
  const penalty = wrongAttempts * 150;
  return Math.max(0, timeBonus - penalty);
}
