export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  ready: boolean;
  streak: number;
}

export const MOCK_SONGS: Song[] = [
  { id: "1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", albumArt: "🌃", duration: 200 },
  { id: "2", title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", albumArt: "👑", duration: 355 },
  { id: "3", title: "Shape of You", artist: "Ed Sheeran", album: "÷", albumArt: "🔷", duration: 234 },
  { id: "4", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", albumArt: "🚀", duration: 203 },
  { id: "5", title: "Bad Guy", artist: "Billie Eilish", album: "WHEN WE ALL FALL ASLEEP", albumArt: "🖤", duration: 194 },
  { id: "6", title: "Uptown Funk", artist: "Bruno Mars", album: "Uptown Special", albumArt: "🎸", duration: 270 },
  { id: "7", title: "Rolling in the Deep", artist: "Adele", album: "21", albumArt: "🔥", duration: 228 },
  { id: "8", title: "Starboy", artist: "The Weeknd", album: "Starboy", albumArt: "⭐", duration: 230 },
  { id: "9", title: "Don't Start Now", artist: "Dua Lipa", album: "Future Nostalgia", albumArt: "💃", duration: 183 },
  { id: "10", title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", albumArt: "🍉", duration: 174 },
];

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

export interface DailyCategory {
  id: string;
  emoji: string;
  title: string;
  description: string;
  streak: number;
}

export const DAILY_CATEGORIES: DailyCategory[] = [
  { id: "espanol", emoji: "🇪🇸", title: "Español del Día", description: "Lo más sonado ahora mismo en España", streak: 3 },
  { id: "global", emoji: "🌍", title: "Global Hits", description: "Los temazos internacionales del momento", streak: 1 },
  { id: "reggaeton", emoji: "🔥", title: "Reggaeton & Urbano Latino", description: "Bad Bunny, Karol G, Feid y mucho más", streak: 5 },
  { id: "clasicos", emoji: "💿", title: "Clásicos", description: "Hits de los 80, 90 y 2000 que todos conocemos", streak: 0 },
  { id: "comodin", emoji: "🎲", title: "Comodín", description: "Cualquier género, cualquier época. La más difícil", streak: 2 },
];

export function calculateScore(timeRemaining: number, maxTime: number, wrongAttempts: number): number {
  const baseScore = 1000;
  const timeRatio = timeRemaining / maxTime;
  const timeBonus = Math.round(baseScore * timeRatio);
  const penalty = wrongAttempts * 150;
  return Math.max(0, timeBonus - penalty);
}
