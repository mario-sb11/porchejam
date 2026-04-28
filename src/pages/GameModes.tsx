import { motion } from "framer-motion";
import { User, Users, Globe, ArrowLeft, Gamepad2, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import { CHALLENGE_TYPES } from "@/data/mockData";

const modes = [
  {
    id: "solo",
    title: "Jugar Solo",
    description: "Desafíate a ti mismo y supera tu récord",
    icon: User,
    color: "from-primary to-primary/60",
    glowClass: "glow-green",
    route: "/settings?mode=solo",
  },
  {
    id: "party",
    title: "Fiesta Local",
    description: "Pasa el móvil y reta a tus amigos",
    icon: Users,
    color: "from-secondary to-secondary/60",
    glowClass: "glow-purple",
    route: "/local-lobby",
  },
  {
    id: "arena",
    title: "Arena Online",
    description: "Compite en tiempo real contra jugadores de todo el mundo",
    icon: Globe,
    color: "from-accent to-accent/60",
    glowClass: "glow-magenta",
    route: "/lobby",
  },
];

const GameModes = () => {
  const navigate = useNavigate();

  // Filtramos e interceptamos los desafíos de mockData para inyectar "El Infiltrado"
  // y marcar los que están en desarrollo.
  const displayChallenges = CHALLENGE_TYPES.map(ch => {
    if (ch.id === "5s" || ch.label.toLowerCase().includes("5 segundo")) {
      return {
        id: "impostor",
        label: "El Infiltrado",
        description: "Alguien no sabe la canción y debe disimular. ¡Descúbrelo!",
        icon: "🕵️‍♂️",
        isActive: true
      };
    }
    
    // 2. Comprobar si es el Fragmento Aleatorio (el único activo ahora mismo)
    const isActive = ch.id === "fragment" || ch.id === "fragmento" || ch.label.toLowerCase().includes("aleatorio");
    
    return {
      ...ch,
      isActive
    };
  });

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-12"
        >
          <GameButton variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground shadow-none">
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
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(mode.route)}
              className=""
            >
              <GlassCard className="rounded-2xl p-6 cursor-pointer group relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                <mode.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">{mode.title}</h3>
              <p className="text-sm text-muted-foreground">{mode.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Challenge Types */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-secondary" />
            Tipos de Desafío
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {displayChallenges.map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className={`rounded-xl p-4 flex items-start gap-3 relative transition-all ${
                  ch.isActive 
                    ? "glass border border-white/10 hover:border-primary/30" 
                    : "bg-black/20 border border-white/5 opacity-60 grayscale cursor-not-allowed select-none"
                }`}
              >
                {!ch.isActive && (
                  <div className="absolute top-2 right-2 bg-black/60 border border-white/10 text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground font-bold flex items-center gap-1">
                    <Hammer className="w-2 h-2" /> En desarrollo
                  </div>
                )}
                
                <span className={`text-2xl ${!ch.isActive ? 'opacity-50' : ''}`}>{ch.icon}</span>
                <div>
                  <h4 className={`font-semibold text-sm ${ch.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{ch.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1 pr-2">{ch.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GameModes;