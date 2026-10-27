import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Home, Loader2, RotateCcw } from "lucide-react";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import PlayerAvatar from "@/components/PlayerAvatar";
import { arena, type ArenaState } from "@/lib/arena";
import { recordMatch } from "@/lib/cloud";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Podio final, canciones de la partida y revancha. Guarda la partida en las estadísticas. */
const ArenaPodium = ({ state, onLeave, onRematch }: { state: ArenaState; onLeave: () => void; onRematch: () => void }) => {
  const { room, players, me, history } = state;
  const ranking = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const isHost = room.host === me;
  const myPlace = ranking.findIndex((p) => p.id === me);
  const mine = ranking[myPlace];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorded = useRef(false);

  // Registrar la partida una sola vez (también si se recarga la página del podio).
  useEffect(() => {
    if (recorded.current || !mine || !history?.length) return;
    recorded.current = true;
    const gameId = `porchejam_arena_saved:${room.code}:${history.map((h) => h.title).join("|").slice(0, 300)}`;
    try {
      if (sessionStorage.getItem(gameId)) return;
      sessionStorage.setItem(gameId, "1");
    } catch {
      /* sin almacenamiento: se registra igualmente */
    }
    recordMatch({
      mode: "party",
      modeKey: "party-online",
      score: mine.score,
      correct: mine.correct,
      rounds: room.settings.rounds,
      record: {
        playlist: room.label,
        score: `${mine.score} pts`,
        cover: "🌐",
        mode: "party",
        specialMode: "Arena Online",
        accuracy: `${mine.correct}/${room.settings.rounds}`,
        topPlayers: ranking.slice(0, 3).map((p) => ({ name: p.name, emoji: "", score: p.score })),
      },
    });
  }, [mine, history, ranking, room]);

  const rematch = async () => {
    setBusy(true);
    setError(null);
    try {
      await arena.rematch(room.code);
      onRematch();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const podium = [ranking[1], ranking[0], ranking[2]];
  const heights = ["h-20", "h-28", "h-14"];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-5xl mb-2">{myPlace === 0 ? "🏆" : "🎶"}</p>
        <h2 className="text-3xl font-display font-black">
          {myPlace === 0 ? "¡Has ganado!" : mine ? `Quedas ${myPlace + 1}º` : "Fin de la partida"}
        </h2>
        {mine && <p className="text-muted-foreground mt-1">{mine.score} puntos · {mine.correct}/{room.settings.rounds} aciertos</p>}
      </div>

      {/* Podio */}
      <div className="flex items-end justify-center gap-3" aria-label="Podio">
        {podium.map((p, i) =>
          p ? (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i === 1 ? 0.4 : i * 0.2) }}
              className="flex flex-col items-center w-24"
            >
              <PlayerAvatar avatar={p.avatar} name={p.name} className="w-14 h-14 text-2xl mb-1" />
              <p className="text-sm font-semibold truncate max-w-full">{p.name}</p>
              <p className="text-xs text-muted-foreground mb-1">{p.score}</p>
              <div className={cn("w-full rounded-t-xl glass flex items-start justify-center pt-2 text-2xl", heights[i], i === 1 && "border-primary/40")}>
                {MEDALS[i === 1 ? 0 : i === 0 ? 1 : 2]}
              </div>
            </motion.div>
          ) : (
            <div key={i} className="w-24" />
          ),
        )}
      </div>

      {ranking.length > 3 && (
        <ol start={4} className="space-y-2">
          {ranking.slice(3).map((p, i) => (
            <li key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <span className="w-6 text-center font-bold text-muted-foreground">{i + 4}</span>
              <PlayerAvatar avatar={p.avatar} name={p.name} className="w-8 h-8 text-base" />
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <span className="font-display font-bold">{p.score}</span>
            </li>
          ))}
        </ol>
      )}

      {history && history.length > 0 && (
        <section aria-labelledby="canciones">
          <h3 id="canciones" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Han sonado</h3>
          <GlassCard className="divide-y divide-white/5">
            {history.map((song, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                {song.cover ? <img src={song.cover} alt="" className="w-10 h-10 rounded-md object-cover" /> : <div className="w-10 h-10 rounded-md bg-white/5" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                </div>
              </div>
            ))}
          </GlassCard>
        </section>
      )}

      {error && <p className="text-sm text-center text-red-400" role="alert">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        {isHost ? (
          <GameButton onClick={rematch} disabled={busy} className="flex-1 h-12 font-bold gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Revancha
          </GameButton>
        ) : (
          <p className="flex-1 text-sm text-center text-muted-foreground self-center">Si el anfitrión pide revancha, volveréis a la sala.</p>
        )}
        <GameButton onClick={onLeave} variant="outline" className="flex-1 h-12 gap-2 border-white/15 bg-white/5 shadow-none">
          <Home className="w-4 h-4" /> Salir
        </GameButton>
      </div>
    </div>
  );
};

export default ArenaPodium;
