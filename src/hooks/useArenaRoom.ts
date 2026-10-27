import { useCallback, useEffect, useRef, useState } from "react";
import { arena, ArenaError, ServerClock, type ArenaState } from "@/lib/arena";

/** Cada cuánto se consulta el estado según la fase (ms). */
const POLL_MS: Record<ArenaState["room"]["status"], number> = {
  lobby: 2000,
  loading: 1000,
  playing: 800,
  finished: 3000,
};

/**
 * Estado de una sala de la Arena. Consulta al servidor periódicamente (más rápido durante la
 * partida) y mantiene un reloj sincronizado con el del servidor para que la cuenta atrás y el
 * audio coincidan en todos los móviles.
 */
export function useArenaRoom(code: string) {
  const [state, setState] = useState<ArenaState | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const clockRef = useRef(new ServerClock());
  const failures = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const sentAt = Date.now();
    try {
      const next = await arena.state(code);
      clockRef.current.sample(next.now, sentAt, Date.now());
      failures.current = 0;
      setConnectionLost(false);
      setNeedsJoin(false);
      setState(next);
    } catch (error) {
      if (error instanceof ArenaError && error.code === "P0002") {
        setNeedsJoin(true);
      } else if (++failures.current >= 3) {
        setConnectionLost(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, [code]);

  useEffect(() => {
    if (needsJoin) return;
    let cancelled = false;
    const loop = async () => {
      await refresh();
      if (cancelled) return;
      const status = state?.room.status ?? "lobby";
      timer.current = setTimeout(loop, failures.current ? 2500 : POLL_MS[status]);
    };
    void loop();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
    // El intervalo depende del estado de la sala, no de cada respuesta.
  }, [refresh, needsJoin, state?.room.status]);

  // Al volver a la pestaña, se actualiza al momento.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { state, needsJoin, connectionLost, refresh, clock: clockRef.current };
}

/** Hora del servidor que se actualiza sola mientras `active` (para relojes y cuentas atrás). */
export function useServerNow(clock: ServerClock, active: boolean, everyMs = 100): number {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(clock.now()), everyMs);
    return () => clearInterval(id);
  }, [clock, active, everyMs]);
  return active ? now : clock.now();
}
