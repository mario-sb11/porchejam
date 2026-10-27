import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Crown, Loader2, Play, Share2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GameButton from "@/components/ui/GameButton";
import PlayerAvatar from "@/components/PlayerAvatar";
import { arena, inviteUrl, type ArenaState } from "@/lib/arena";

const ANSWER_LABELS = { facil: "4 opciones", medio: "Buscador", dificil: "Texto libre" } as const;

/** Sala de espera: código para invitar, jugadores conectados y botón de empezar (anfitrión). */
const ArenaLobby = ({ state, onStarted }: { state: ArenaState; onStarted: () => void }) => {
  const { room, players, me } = state;
  const isHost = room.host === me;
  const host = players.find((p) => p.id === room.host);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = room.status === "loading" || starting;

  const share = async () => {
    const url = inviteUrl(room.code);
    const text = `¡Juega conmigo a PorcheJam! Sala ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "PorcheJam · Arena Online", text, url });
        return;
      } catch {
        /* cancelado: se copia el enlace */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`Copia este enlace: ${url}`);
    }
  };

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await arena.start(room.code);
      onStarted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Código de sala</p>
        <p className="text-4xl sm:text-5xl font-display font-black tracking-[0.25em] text-primary text-glow-green select-all" aria-label={`Código ${room.code.split("").join(" ")}`}>
          {room.code}
        </p>
        <div className="flex justify-center gap-3 mt-5">
          <GameButton onClick={share} variant="outline" className="gap-2 border-white/15 bg-white/5 shadow-none">
            {copied ? <Check className="w-4 h-4 text-primary" /> : navigator.share ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "¡Enlace copiado!" : "Invitar amigos"}
          </GameButton>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex items-center gap-4">
        {room.cover ? (
          <img src={room.cover} alt="" className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center text-2xl">🎵</div>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">{room.label}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[`${room.settings.rounds} rondas`, `${room.settings.seconds} s por canción`, ANSWER_LABELS[room.settings.answer]].map((chip) => (
              <span key={chip} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">{chip}</span>
            ))}
          </div>
        </div>
      </GlassCard>

      <section aria-labelledby="jugadores">
        <h2 id="jugadores" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Jugadores ({players.length}/12)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {players.map((player, i) => (
            <motion.div key={player.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className={`p-3 flex items-center gap-3 rounded-xl ${player.id === me ? "border-primary/40" : ""}`}>
                <div className="relative shrink-0">
                  <PlayerAvatar avatar={player.avatar} name={player.name} className="w-10 h-10 text-xl" />
                  {player.id === room.host && <Crown className="absolute -top-2 -right-1 w-4 h-4 text-yellow-400" aria-label="Anfitrión" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{player.name}</p>
                  <p className="text-[11px] text-muted-foreground">{player.id === me ? "Tú" : player.online ? "Conectado" : "Sin conexión"}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-400 text-center" role="alert">{error}</p>}

      {isHost ? (
        <div className="space-y-2">
          <GameButton onClick={start} disabled={loading} className="w-full h-14 text-lg font-display font-bold gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {loading ? "Preparando canciones..." : "Empezar partida"}
          </GameButton>
          {players.length < 2 && !loading && (
            <p className="text-xs text-center text-muted-foreground">Comparte el código para que entren tus amigos. También puedes empezar ya.</p>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground" aria-live="polite">
          {loading ? "Preparando canciones..." : `Esperando a que ${host?.name ?? "el anfitrión"} empiece la partida...`}
        </p>
      )}
    </div>
  );
};

export default ArenaLobby;
