/**
 * Cliente de la Arena Online.
 *
 * Todo pasa por funciones de la base de datos (`arena_*`) que validan cada dato; el navegador
 * nunca ve qué canción suena hasta que termina la ronda. Para jugar no hace falta cuenta:
 * cada navegador tiene un token aleatorio que lo identifica dentro de sus salas.
 */
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/storage";

export type AnswerMode = "facil" | "medio" | "dificil";
export interface ArenaSettings { rounds: number; seconds: number; answer: AnswerMode }
export interface ArenaSourceInput { sources: { id: string; type: string }[]; label: string; cover: string }

export interface ArenaPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correct: number;
  online: boolean;
  answered: boolean;
  roundCorrect: boolean | null;
  roundPoints: number | null;
}

export interface ArenaReveal { title: string; artist: string; cover: string; option: number | null }

export interface ArenaState {
  now: string;
  me: string;
  room: {
    code: string;
    status: "lobby" | "loading" | "playing" | "finished";
    host: string;
    settings: ArenaSettings;
    label: string;
    cover: string;
    round: number;
    phase: "question" | "reveal";
    phaseEndsAt: string | null;
  };
  players: ArenaPlayer[];
  current: {
    number: number;
    previewUrl: string;
    options: { title: string; artist: string }[] | null;
    startsAt: string;
    endsAt: string;
    reveal: ArenaReveal | null;
  } | null;
  mine: { attempts: number; correct: boolean; points: number } | null;
  history: ArenaReveal[] | null;
}

export interface ArenaPeek {
  exists: boolean;
  status?: ArenaState["room"]["status"];
  label?: string;
  cover?: string;
  host?: string;
  players?: number;
  full?: boolean;
}

export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const TOKEN_KEY = "porchejam_arena_token";

/** Normaliza lo que escribe el jugador: mayúsculas, sin espacios ni guiones, 0→O no existe. */
export function cleanRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/** Token del navegador para la Arena (32 bytes aleatorios en base64url). */
export function arenaToken(): string {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && /^[A-Za-z0-9_-]{32,128}$/.test(saved)) return saved;
  } catch {
    /* sin almacenamiento: token solo para esta visita */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* idem */
  }
  return token;
}

export class ArenaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

/** Mensajes de nuestras funciones (aptos para el jugador) frente a errores técnicos. */
const FRIENDLY_CODES = new Set(["P0001", "P0002", "22023", "42501"]);

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ArenaError("La Arena Online no está disponible ahora mismo.");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const friendly = error.code && FRIENDLY_CODES.has(error.code);
    throw new ArenaError(friendly ? error.message : "Problema de conexión. Inténtalo de nuevo.", error.code);
  }
  return data as T;
}

function playerIdentity() {
  let name = "";
  let avatar = "default";
  try {
    name = localStorage.getItem(STORAGE_KEYS.username)?.trim() ?? "";
    avatar = localStorage.getItem(STORAGE_KEYS.avatar) || "default";
  } catch {
    /* sin almacenamiento */
  }
  return { name, avatar };
}

export const arena = {
  identity: playerIdentity,

  create(name: string, avatar: string, settings: ArenaSettings, source: ArenaSourceInput) {
    return rpc<string>("arena_create", {
      p_token: arenaToken(),
      p_name: name,
      p_avatar: avatar,
      p_settings: settings,
      p_source: source,
    });
  },

  peek(code: string) {
    return rpc<ArenaPeek>("arena_peek", { p_code: code });
  },

  join(code: string, name: string, avatar: string) {
    return rpc<{ code: string }>("arena_join", { p_code: code, p_token: arenaToken(), p_name: name, p_avatar: avatar });
  },

  state(code: string) {
    return rpc<ArenaState>("arena_state", { p_code: code, p_token: arenaToken() });
  },

  answer(code: string, answer: { option?: number; text?: string }) {
    return rpc<{ correct: boolean; points: number; attemptsLeft: number }>("arena_answer", {
      p_code: code,
      p_token: arenaToken(),
      p_option: answer.option ?? null,
      p_text: answer.text ?? null,
    });
  },

  leave(code: string) {
    return rpc<void>("arena_leave", { p_code: code, p_token: arenaToken() });
  },

  rematch(code: string) {
    return rpc<void>("arena_rematch", { p_code: code, p_token: arenaToken() });
  },

  /** El anfitrión empieza: el servidor elige las canciones. */
  async start(code: string) {
    const response = await fetch(apiUrl("arena/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, token: arenaToken() }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new ArenaError(response.status < 500 && body.error ? body.error : "No se pudo preparar la partida. Inténtalo de nuevo.");
    }
  },

  /** Audio recién firmado de la ronda en juego (por si el original ha caducado). */
  async freshAudio(code: string, round: number): Promise<string | null> {
    const response = await fetch(apiUrl("arena/audio", { code, round }));
    if (!response.ok) return null;
    const body = (await response.json()) as { previewUrl: string | null };
    return body.previewUrl;
  },
};

/**
 * Reloj del servidor. Cada respuesta de estado trae la hora del servidor; nos quedamos con la
 * muestra de menor latencia para estimar el desfase con el reloj del móvil.
 */
export class ServerClock {
  private offset = 0;
  private bestRtt = Infinity;

  sample(serverNowIso: string, sentAt: number, receivedAt: number) {
    const rtt = receivedAt - sentAt;
    const serverNow = Date.parse(serverNowIso);
    if (!Number.isFinite(serverNow)) return;
    // Las muestras viejas pierden valor poco a poco por si cambia la red.
    this.bestRtt = Math.min(this.bestRtt * 1.05, Infinity);
    if (rtt <= this.bestRtt) {
      this.bestRtt = rtt;
      this.offset = serverNow - (sentAt + receivedAt) / 2;
    }
  }

  now(): number {
    return Date.now() + this.offset;
  }
}

/** Texto para compartir la sala. */
export function inviteUrl(code: string): string {
  return `${window.location.origin}/arena/${code}`;
}

/** Música elegida en "Elige tu Escenario", en el formato que espera la Arena. */
export function readSelectedSource(): ArenaSourceInput | null {
  try {
    const type = localStorage.getItem("porchejam_selected_type");
    const label = localStorage.getItem("porchejam_selected_playlist_name") ?? "Mezcla";
    const cover = localStorage.getItem("porchejam_selected_cover") ?? "";
    let sources: { id: string; type: string }[] = [];
    if (type === "mix") {
      const items = JSON.parse(localStorage.getItem("porchejam_mix_items") ?? "[]") as { id: string; type: string }[];
      sources = items.map((i) => ({ id: String(i.id), type: i.type }));
    } else if (type) {
      const id = localStorage.getItem("porchejam_selected_playlist");
      if (id) sources = [{ id, type }];
    }
    sources = sources.filter((s) => /^\d{1,20}$/.test(s.id) && ["playlist", "artist", "album"].includes(s.type)).slice(0, 10);
    return sources.length ? { sources, label: label.slice(0, 80), cover } : null;
  } catch {
    return null;
  }
}
