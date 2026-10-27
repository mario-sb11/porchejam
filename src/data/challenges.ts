/**
 * Desafíos de PorcheJam tal y como existen en el juego. Se usan en la pantalla de modos como
 * tarjetas informativas: el desafío no se elige aquí, sino dentro de cada modo de juego.
 */

export type PlayPlace = "solo" | "fiesta" | "arena" | "diario";

export const PLACE_LABELS: Record<PlayPlace, string> = {
  solo: "Jugar Solo",
  fiesta: "Fiesta Local",
  arena: "Arena Online",
  diario: "Canción del Día",
};

export interface Challenge {
  id: string;
  icon: string;
  title: string;
  /** Una línea para la cara delantera. */
  tagline: string;
  /** Dónde se encuentra. Vacío si aún no está disponible. */
  places: PlayPlace[];
  /** Cómo se juega, en dos o tres frases cortas. */
  howTo: string;
  /** Pista para encontrarlo dentro del modo. */
  where?: string;
  comingSoon?: boolean;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "normal",
    icon: "🎵",
    title: "Clásico",
    tagline: "Escucha y adivina antes de que acabe el tiempo",
    places: ["solo", "fiesta", "arena"],
    howTo: "Suena un fragmento y eliges la canción: 4 opciones, buscador o texto libre. Cuanto antes aciertes, más puntos.",
    where: "Ajustes de partida → Modo especial: Normal",
  },
  {
    id: "inverso",
    icon: "⏪",
    title: "Inverso",
    tagline: "La canción suena al revés",
    places: ["solo", "fiesta"],
    howTo: "El fragmento se reproduce del final al principio. Fíjate en el ritmo y en la voz: el estribillo se reconoce igual.",
    where: "Ajustes de partida → Modo especial: Inverso",
  },
  {
    id: "survival",
    icon: "☠️",
    title: "Supervivencia",
    tagline: "Cada fallo te cuesta una vida",
    places: ["solo", "fiesta"],
    howTo: "Empiezas con 1, 3 o 5 vidas. La partida sigue mientras te queden; en fiesta gana el último en pie.",
    where: "Ajustes de partida → Modo especial: Survival",
  },
  {
    id: "contrarreloj",
    icon: "⚡",
    title: "Contrarreloj",
    tagline: "Todas las que puedas en un tiempo límite",
    places: ["solo", "fiesta"],
    howTo: "En solitario tienes un reloj global. En fiesta es la Patata Caliente: si fallas pierdes segundos y a quien le explote la bomba, pierde.",
    where: "Ajustes de partida → Modo especial: Contrarreloj",
  },
  {
    id: "infiltrado",
    icon: "🕵️",
    title: "El Infiltrado",
    tagline: "Uno no conoce la canción y debe disimular",
    places: ["fiesta"],
    howTo: "Todos ven la canción menos el infiltrado, que solo recibe pistas. Dad pistas sin pasaros y votad quién finge.",
    where: "Fiesta Local → Modo de fiesta: El Infiltrado",
  },
  {
    id: "zumbadores",
    icon: "🔔",
    title: "Zumbadores",
    tagline: "El primero en pulsar responde",
    places: ["fiesta"],
    howTo: "Un solo móvil en la mesa y todos escuchan a la vez: quien pulse antes su nombre responde. Si falla, se queda fuera de esa ronda y pueden intentarlo los demás.",
    where: "Fiesta Local → Modo de fiesta: Zumbadores",
  },
  {
    id: "diario",
    icon: "📅",
    title: "Canción del Día",
    tagline: "La misma canción para todos, cada día",
    places: ["diario"],
    howTo: "Seis intentos: cada fallo o salto desbloquea más segundos. Comparte tu resultado sin destripar la canción.",
    where: "Inicio → Daily Track",
  },
  {
    id: "aleatorio",
    icon: "🎲",
    title: "Fragmento Aleatorio",
    tagline: "Suena una parte al azar de la canción",
    places: [],
    howTo: "Nada de estribillos fáciles: el fragmento puede empezar en cualquier punto del tema.",
    comingSoon: true,
  },
  {
    id: "artista",
    icon: "🎤",
    title: "Adivina el Artista",
    tagline: "No la canción: quién la canta",
    places: [],
    howTo: "Escucha y escribe el artista. Ideal para listas de un mismo género.",
    comingSoon: true,
  },
  {
    id: "portada",
    icon: "🖼️",
    title: "La Portada",
    tagline: "La carátula pixelada se va aclarando",
    places: [],
    howTo: "Sin audio: cuanto antes reconozcas el disco por su portada, más puntos.",
    comingSoon: true,
  },
];
