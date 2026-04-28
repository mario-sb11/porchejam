import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Users, Zap, RotateCcw, PartyPopper, Ghost } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameButton from "@/components/ui/GameButton";
import { Input } from "@/components/ui/input";
import GlassCard from "@/components/ui/GlassCard";

 
const AVATAR_EMOJIS = [
  "😎", "🤩", "🎸", "🎤", "🔥", "💃", "🕺", "🎧", 
  "👑", "⚡", "🦄", "🐱", "🎯", "🍕", "🌟", "🎵",
  "👽", "👻", "🤖", "🤡", "🤠", "🧙‍♂️", "🧛‍♀️", "🧜‍♂️",
  "🐵", "🐶", "🦊", "🐼", "🐸", "🐷", "🦋", "🍄"
];

interface Player {
  id: number;
  name: string;
  emoji: string;
}

const LocalLobby = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Jugador 1", emoji: "😎" },
    { id: 2, name: "Jugador 2", emoji: "🤩" },
  ]);
  
  // Añadimos "imposter" a los tipos permitidos
  const [partyMode, setPartyMode] = useState<"turns" | "buzzer" | "imposter">("turns");
  const [nextId, setNextId] = useState(3);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  const addPlayer = () => {
    if (players.length >= 8) return;
    const emoji = AVATAR_EMOJIS[players.length % AVATAR_EMOJIS.length];
    setPlayers([...players, { id: nextId, name: `Jugador ${nextId}`, emoji }]);
    setNextId(nextId + 1);
  };

  const removePlayer = (id: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const updateName = (id: number, name: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const updateEmoji = (id: number, emoji: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, emoji } : p)));
    setPickerOpen(null);
  };

  const startParty = () => {
    localStorage.setItem("porchify_party_players", JSON.stringify(players));
    localStorage.setItem("porchify_party_mode", partyMode);
    
    // Si es modo impostor, podemos mandar a una ruta distinta o pasarle un parámetro especial
    if (partyMode === "imposter") {
      navigate("/settings?mode=party&special=imposter");
    } else {
      navigate("/settings?mode=party");
    }
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-10">
          <GameButton variant="ghost" size="icon" onClick={() => navigate("/modes")} className="text-muted-foreground hover:text-foreground shadow-none">
            <ArrowLeft className="w-5 h-5" />
          </GameButton>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Fiesta Local</h1>
            <p className="text-muted-foreground mt-1">Añade jugadores y elige el modo de fiesta</p>
          </div>
        </motion.div>

        {/* Players Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Jugadores ({players.length}/8)
          </h2>

          <div className="space-y-3">
            <AnimatePresence>
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  // z-50 si está abierto, z-10 si está cerrado
                  className={`${pickerOpen === player.id ? "z-50" : "z-10"}`}
                >
                  <GlassCard className="rounded-xl p-3 flex items-center gap-3 relative">
                  {/* Emoji selector */}
                  <button
                    onClick={() => setPickerOpen(pickerOpen === player.id ? null : player.id)}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl hover:scale-110 transition-transform shrink-0"
                  >
                    {player.emoji}
                  </button>

                  <AnimatePresence>
                    {pickerOpen === player.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        // Aumentado el grid a 8 columnas y w-max para que quepan todos sin deformarse
                        className="absolute left-0 top-16 z-50 glass-strong rounded-xl p-3 grid grid-cols-8 gap-1.5 w-max max-w-[90vw] sm:max-w-none"
                      >
                        {AVATAR_EMOJIS.map((e) => (
                          <button key={e} onClick={() => updateEmoji(player.id, e)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-primary/20 transition-colors ${player.emoji === e ? "bg-primary/30 ring-1 ring-primary" : ""}`}
                          >
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Input
                    value={player.name}
                    onChange={(e) => updateName(player.id, e.target.value)}
                    maxLength={16}
                    className="flex-1 bg-transparent border-0 border-b border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-primary text-foreground font-medium h-10"
                  />

                  <GameButton
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(player.id)}
                    disabled={players.length <= 2}
                    className="text-muted-foreground hover:text-destructive shrink-0 shadow-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </GameButton>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {players.length < 8 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <GameButton variant="outline" onClick={addPlayer} className="w-full mt-4 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 h-12 gap-2">
                <Plus className="w-4 h-4" /> Añadir jugador
              </GameButton>
            </motion.div>
          )}
        </motion.div>

        {/* Party Mode Selector */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Modo de Fiesta</h2>
          {/* Cambiado a 3 columnas en PC y 1 en móvil para acomodar el nuevo modo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "turns" as const, title: "Por Turnos", desc: "Cada jugador juega su ronda", icon: RotateCcw, color: "from-primary to-primary/60" },
              { id: "imposter" as const, title: "El Infiltrado", desc: "Encuentra al impostor", icon: Ghost, color: "from-yellow-400 to-orange-500" },
              { id: "buzzer" as const, title: "Zumbadores", desc: "¡El más rápido gana!", icon: Zap, color: "from-accent to-accent/60" },
            ].map((mode) => (
              <motion.button
                key={mode.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPartyMode(mode.id)}
                className={`glass rounded-2xl p-5 text-left relative overflow-hidden transition-all ${
                  partyMode === mode.id ? "ring-2 ring-primary glow-green" : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-10`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-3`}>
                  <mode.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground text-sm">{mode.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <GameButton
            onClick={startParty}
            className="w-full h-16 text-lg font-display font-bold rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground glow-green hover:opacity-90 transition-opacity gap-3"
          >
            <PartyPopper className="w-6 h-6" />
            Empezar Fiesta
          </GameButton>
        </motion.div>
      </div>
    </div>
  );
};

export default LocalLobby;