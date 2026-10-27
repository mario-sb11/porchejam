import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn, Users } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GameButton from "@/components/ui/GameButton";
import { Input } from "@/components/ui/input";
import { arena, type ArenaPeek } from "@/lib/arena";
import { isValidUsername } from "@/lib/cloud";
import { STORAGE_KEYS } from "@/lib/storage";

/** Pantalla para entrar en una sala desde un enlace o un código. */
const ArenaJoin = ({ code, onJoined }: { code: string; onJoined: () => void }) => {
  const [peek, setPeek] = useState<ArenaPeek | null>(null);
  const [name, setName] = useState(() => arena.identity().name);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    arena.peek(code).then(setPeek).catch(() => setPeek({ exists: false }));
  }, [code]);

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!isValidUsername(clean)) {
      setError("Usa entre 2 y 20 letras, números, espacios, puntos o guiones.");
      return;
    }
    setJoining(true);
    setError(null);
    try {
      await arena.join(code, clean, arena.identity().avatar);
      try {
        // Si era su primera visita, este pasa a ser su nombre de jugador.
        if (!localStorage.getItem(STORAGE_KEYS.username)) localStorage.setItem(STORAGE_KEYS.username, clean);
      } catch {
        /* sin almacenamiento */
      }
      onJoined();
    } catch (err) {
      setError((err as Error).message);
      setJoining(false);
    }
  };

  if (!peek) {
    return (
      <div className="flex justify-center py-24" aria-busy>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!peek.exists || peek.status === "finished") {
    return (
      <GlassCard className="p-8 text-center space-y-4">
        <p className="text-4xl">🔍</p>
        <h2 className="text-xl font-display font-bold">
          {peek.exists ? "Esta partida ya ha terminado" : "No encontramos la sala"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Comprueba el código <span className="font-mono font-bold text-foreground">{code}</span> o pide un enlace nuevo.
        </p>
        <Link to="/arena" className="inline-block text-primary font-semibold hover:underline">
          Probar otro código
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        {peek.cover ? (
          <img src={peek.cover} alt="" className="w-16 h-16 rounded-xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl">🎵</div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Te invitan a jugar</p>
          <h2 className="font-display font-bold text-lg truncate">{peek.label}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {peek.players} en la sala{peek.host ? ` · anfitrión: ${peek.host}` : ""}
          </p>
        </div>
      </div>

      {peek.full ? (
        <p className="text-sm text-red-400" role="alert">La sala está llena (máximo 12 jugadores).</p>
      ) : (
        <form onSubmit={join} className="space-y-3">
          <label htmlFor="arena-name" className="text-sm font-semibold">Tu nombre en la partida</label>
          <Input
            id="arena-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoComplete="nickname"
            placeholder="Escribe tu nombre"
            className="h-12 glass border-white/10 text-base"
          />
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          {peek.status === "playing" && (
            <p className="text-xs text-muted-foreground">La partida ya ha empezado: entrarás con 0 puntos y podrás jugar desde la ronda en curso.</p>
          )}
          <GameButton type="submit" disabled={joining} className="w-full h-12 font-bold gap-2">
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Entrar en la sala
          </GameButton>
        </form>
      )}
    </GlassCard>
  );
};

export default ArenaJoin;
