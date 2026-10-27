import { useCallback, useEffect, useRef, useState } from "react";
import { arena, type ArenaState, type ServerClock } from "@/lib/arena";
import { isPreviewStale } from "@/lib/preview";

/** Un WAV de silencio de 0,1 s para "desbloquear" el audio en móviles con el primer toque. */
function silentWavUrl(): string {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

const MUTE_KEY = "porchejam_arena_muted";

/**
 * Audio sincronizado de la Arena. Usa un único elemento <audio> (iOS solo deja reproducir sin
 * toque un elemento que ya se haya "desbloqueado" con uno) y empieza a sonar exactamente en el
 * `startsAt` del servidor. Si el navegador bloquea la reproducción, `needsTap` lo indica.
 */
export function useArenaAudio(state: ArenaState | null, clock: ServerClock) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlocked = useRef(false);
  const loadedRound = useRef<string | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

  // Desbloqueo con el primer toque en la página.
  useEffect(() => {
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio || unlocked.current) return;
      unlocked.current = true;
      if (!audio.src) {
        const silent = silentWavUrl();
        audio.src = silent;
        audio.play().then(() => audio.pause()).catch(() => undefined).finally(() => URL.revokeObjectURL(silent));
      } else if (audio.paused) {
        // Ya hay canción cargada: se desbloquea en silencio sin que se oiga nada.
        const wasMuted = audio.muted;
        audio.muted = true;
        audio
          .play()
          .then(() => audio.pause())
          .catch(() => undefined)
          .finally(() => {
            audio.muted = wasMuted;
          });
      }
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
  }, [muted]);

  // Parar y liberar al salir de la sala.
  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  const code = state?.room.code;
  const status = state?.room.status;
  const phase = state?.room.phase;
  const current = state?.current ?? null;
  const roundKey = current && code ? `${code}:${current.number}:${current.startsAt}` : null;

  const playFromServerTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    const elapsed = (clock.now() - Date.parse(current.startsAt)) / 1000;
    try {
      audio.currentTime = elapsed > 0.25 ? Math.min(elapsed, 29) : 0;
    } catch {
      /* algunos navegadores no dejan mover el audio antes de cargarlo */
    }
    audio.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  }, [clock, current]);

  // Cargar el audio de cada ronda en cuanto se conoce (durante la cuenta atrás).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current || !roundKey || !code || loadedRound.current === roundKey) return;
    loadedRound.current = roundKey;
    let cancelled = false;
    (async () => {
      let url: string | null = current.previewUrl;
      if (isPreviewStale(url, clock.now())) url = await arena.freshAudio(code, current.number).catch(() => null);
      if (cancelled || !url) return;
      audio.pause();
      audio.src = url;
      audio.load();
    })();
    return () => {
      cancelled = true;
    };
  }, [roundKey, current, code, clock]);

  // Empezar a la hora del servidor.
  useEffect(() => {
    if (status !== "playing" || phase !== "question" || !current) return;
    const wait = Date.parse(current.startsAt) - clock.now();
    if (Date.parse(current.endsAt) <= clock.now()) return;
    const id = setTimeout(playFromServerTime, Math.max(0, wait));
    return () => clearTimeout(id);
    // Solo al cambiar de ronda o de fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, phase, status]);

  // Fuera de la partida, silencio.
  useEffect(() => {
    if (status !== "playing") {
      audioRef.current?.pause();
      setNeedsTap(false);
    }
  }, [status]);

  return { needsTap, playNow: playFromServerTime, muted, toggleMute: () => setMuted((m) => !m) };
}
