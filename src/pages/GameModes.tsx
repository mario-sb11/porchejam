import { motion } from "framer-motion";
import { User, Users, Globe, ArrowLeft, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import ChallengeCard from "@/components/ChallengeCard";
import { CHALLENGES } from "@/data/challenges";
import { arenaAvailable } from "@/lib/supabase";

const modes = [
  {
    id: "solo",
    title: "Jugar Solo",
    description: "Desafíate a ti mismo y supera tu récord",
    icon: User,
    color: "from-primary to-primary/60",
    route: "/settings?mode=solo",
  },
  {
    id: "party",
    title: "Fiesta Local",
    description: "Pasa el móvil y reta a tus amigos",
    icon: Users,
    color: "from-secondary to-secondary/60",
    route: "/local-lobby",
  },
  {
    id: "arena",
    title: "Arena Online",
    description: "Crea una sala y jugad a la vez, cada uno desde su móvil",
    icon: Globe,
    color: "from-accent to-accent/60",
    route: "/settings?mode=online",
    // La Arena necesita la base de datos; sin ella se muestra como no disponible.
    comingSoon: !arenaAvailable,
  },
];

const GameModes = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-12"
        >
          <GameButton variant="ghost" size="icon" onClick={() => navigate("/playlists")} aria-label="Volver a elegir música" className="text-muted-foreground hover:text-foreground shadow-none">
            <ArrowLeft className="w-5 h-5" />
          </GameButton>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Elige tu Modo</h1>
            <p className="text-muted-foreground mt-1">Selecciona cómo quieres jugar</p>
          </div>
        </motion.div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {modes.map((mode, i) => (
            <motion.button
              key={mode.id}
              type="button"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              whileHover={mode.comingSoon ? undefined : { scale: 1.03, y: -4 }}
              whileTap={mode.comingSoon ? undefined : { scale: 0.98 }}
              onClick={() => navigate(mode.route)}
              disabled={mode.comingSoon}
              className="text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
            >
              <GlassCard className={`rounded-2xl p-6 h-full group relative overflow-hidden ${mode.comingSoon ? "opacity-60 grayscale select-none" : ""}`}>
                {mode.comingSoon && (
                  <div className="absolute top-3 right-3 bg-black/60 border border-white/10 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground font-bold">
                    No disponible
                  </div>
                )}
                {mode.id === "arena" && !mode.comingSoon && (
                  <div className="absolute top-3 right-3 bg-accent/20 border border-accent/40 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-accent font-bold">
                    Nuevo
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                  <mode.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{mode.title}</h3>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </GlassCard>
            </motion.button>
          ))}
        </div>

        {/* Desafíos: informativos, se eligen dentro de cada modo */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          aria-labelledby="desafios"
        >
          <h2 id="desafios" className="text-xl font-display font-bold text-foreground mb-1 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-secondary" />
            Tipos de Desafío
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Los desafíos se eligen dentro de cada modo. Toca una tarjeta para ver dónde está y cómo se juega.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CHALLENGES.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="grid"
              >
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default GameModes;
