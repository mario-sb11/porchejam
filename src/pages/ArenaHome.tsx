import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, LogIn, Plus } from "lucide-react";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { cleanRoomCode, ROOM_CODE } from "@/lib/arena";
import { arenaAvailable } from "@/lib/supabase";

const STEPS = [
  { icon: "🎧", text: "El anfitrión elige la música y crea la sala." },
  { icon: "📲", text: "Los demás entran con el código o el enlace, cada uno en su móvil." },
  { icon: "⚡", text: "La canción suena a la vez en todos: quien antes acierte, más puntos." },
];

/** Entrada a la Arena Online: unirse con un código o crear una sala nueva. */
const ArenaHome = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!arenaAvailable) return <Navigate to="/modes" replace />;

  const join = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = cleanRoomCode(code);
    if (!ROOM_CODE.test(clean)) {
      setError("El código tiene 6 caracteres, por ejemplo K7PQ2M.");
      return;
    }
    navigate(`/arena/${clean}`);
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <GameButton variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Volver al inicio" className="shadow-none text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </GameButton>
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Globe className="w-7 h-7 text-accent" /> Arena Online
            </h1>
            <p className="text-muted-foreground">Jugad a la vez, cada uno desde su móvil</p>
          </div>
        </header>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 space-y-4">
            <h2 className="font-display font-bold text-lg">Unirse a una sala</h2>
            <form onSubmit={join} className="flex gap-3">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(cleanRoomCode(e.target.value));
                  setError(null);
                }}
                aria-label="Código de sala"
                placeholder="CÓDIGO"
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                className="h-12 glass border-white/10 text-center font-display font-bold text-xl tracking-[0.3em] uppercase"
              />
              <GameButton type="submit" className="h-12 px-5 gap-2 font-bold">
                <LogIn className="w-4 h-4" /> Entrar
              </GameButton>
            </form>
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6 space-y-4">
            <h2 className="font-display font-bold text-lg">Crear una sala</h2>
            <ol className="space-y-3">
              {STEPS.map((step) => (
                <li key={step.text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="text-xl" aria-hidden>{step.icon}</span> {step.text}
                </li>
              ))}
            </ol>
            <GameButton onClick={() => navigate("/playlists")} variant="outline" className="w-full h-12 gap-2 font-bold border-accent/40 bg-accent/10 shadow-none">
              <Plus className="w-4 h-4" /> Elegir música y crear sala
            </GameButton>
            <p className="text-xs text-muted-foreground text-center">Después de elegir la música, pulsa «Arena Online».</p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ArenaHome;
