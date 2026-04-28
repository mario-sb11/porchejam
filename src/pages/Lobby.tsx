import { motion } from "framer-motion";
import { ArrowLeft, Crown, CheckCircle, Clock, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import { MOCK_PLAYERS } from "@/data/mockData";

const Lobby = () => {
  const navigate = useNavigate();
  const sorted = [...MOCK_PLAYERS].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <GameButton variant="ghost" size="icon" onClick={() => navigate("/modes")} className="shadow-none">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </GameButton>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Arena Online</h1>
            <p className="text-sm text-muted-foreground">Esperando jugadores...</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <GlassCard className="p-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Código de sala</p>
          <p className="text-4xl font-display font-black tracking-[0.3em] text-primary text-glow-green">PRCH-42X</p>
          </GlassCard>
        </motion.div>

        <div className="space-y-3 mb-8">
          {sorted.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className=""
            >
              <GlassCard className="rounded-xl p-4 flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                  {player.avatar}
                </div>
                {i === 0 && (
                  <Crown className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground text-sm">{player.name}</div>
                <div className="text-xs text-muted-foreground">{player.score.toLocaleString()} pts · 🔥 {player.streak} racha</div>
              </div>
              <div>
                {player.ready ? (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle className="w-4 h-4" /> Listo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" /> Esperando
                  </span>
                )}
              </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <GameButton
            size="lg"
            onClick={() => navigate("/game")}
            className="h-14 px-12 rounded-full bg-primary text-primary-foreground font-bold text-lg animate-pulse_glow"
          >
            <Play className="w-5 h-5 mr-2" /> Empezar Partida
          </GameButton>
        </motion.div>
      </div>
    </div>
  );
};

export default Lobby;
