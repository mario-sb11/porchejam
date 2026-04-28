import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Target, Zap, Flame, Music, LogOut, Edit2, X, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Lista de avatares gratuitos (emojis + personas de Dicebear)
const FREE_AVATARS = [
  "default", 
  "persona:Maria",
  "persona:Alex",
  "persona:Sofia",
  "persona:David",
  "persona:Lucia",
  "persona:Hugo",
  "persona:Leo",
  "persona:Mateo",
  "persona:Lucas",
  "persona:Daniel",
  "🎧", "🎸", "🎤", "🦝", "🔥", "⚡"
];

interface GameHistoryEntry {
  mode: string;
  score: number;
  date: string;
  correctAnswers?: number;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Cargando...");
  const [currentAvatar, setCurrentAvatar] = useState("default");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  useEffect(() => {
    const savedUsername = localStorage.getItem("porchejam_username");
    if (!savedUsername?.trim()) {
      navigate("/");
      return;
    }
    setUsername(savedUsername.trim());
    
    const savedAvatar = localStorage.getItem("porchejam_avatar");
    if (savedAvatar) {
      setCurrentAvatar(savedAvatar);
    }

    // Cargar historial real
    const savedHistory = localStorage.getItem("gameHistory");
    if (savedHistory) {
      try {
        setGameHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing game history", e);
      }
    }
  }, [navigate]);

  // Calcula estadísticas reales basadas en el historial
  const totalGames = gameHistory.length;
  const bestScore = totalGames > 0 ? Math.max(...gameHistory.map(g => g.score)) : 0;
  const correctAnswers = gameHistory.reduce((acc, curr) => acc + (curr.correctAnswers || 0), 0);
  
  // Modo favorito simple: el que más aparece en el historial (simplificado)
  const favouriteMode = totalGames > 0 
    ? gameHistory.sort((a,b) =>
          gameHistory.filter(v => v.mode===a.mode).length
        - gameHistory.filter(v => v.mode===b.mode).length
      ).pop()?.mode || "Ninguno"
    : "Ninguno";

  const stats = [
    { icon: Trophy, label: "Partidas", value: String(totalGames), color: "text-primary" },
    { icon: Zap, label: "Mejor puntuación", value: bestScore.toLocaleString(), color: "text-secondary" },
    { icon: Target, label: "Aciertos totales", value: String(correctAnswers), color: "text-accent" },
    { icon: Music, label: "Modo favorito", value: favouriteMode, color: "text-primary" },
    { icon: Flame, label: "Racha actual", value: "0", color: "text-accent" }, // La racha es más compleja de calcular sin fecha/hora exacta
  ];

  const handleLogout = () => {
    localStorage.removeItem("porchejam_username");
    navigate("/");
  };

  const selectAvatar = (avatar: string) => {
    setCurrentAvatar(avatar);
    localStorage.setItem("porchejam_avatar", avatar);
    setIsAvatarModalOpen(false);
  };

  // Función auxiliar para obtener la URL de un avatar persona
  const getDicebearUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;

  // Función para renderizar el avatar actual (ya sea emoji o imagen)
  const renderAvatar = (avatarStr: string, sizeClass = "w-24 h-24 text-5xl") => {
    if (avatarStr === "default" || avatarStr.startsWith("persona:")) {
      const seed = avatarStr === "default" ? username : avatarStr.split(":")[1];
      return (
        <Avatar className={`${sizeClass} border-2 border-transparent bg-black`}>
          <AvatarImage src={getDicebearUrl(seed)} alt={username} />
          <AvatarFallback className="bg-zinc-900 text-zinc-100 font-bold text-3xl">
            {username.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-green border-2 border-transparent`}>
        {avatarStr}
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 relative">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-display font-bold text-foreground">Mi Perfil</h1>
          </div>
          
          <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <span className="text-yellow-400 font-bold">🪙 0</span>
          </div>
        </motion.div>

        {/* Avatar + name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center mb-10">
          
          {/* Avatar Clickable */}
          <div 
            className="relative cursor-pointer group mb-4"
            onClick={() => setIsAvatarModalOpen(true)}
          >
            <div className="transition-transform group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-full">
              {renderAvatar(currentAvatar)}
            </div>
            <div className="absolute bottom-0 right-0 bg-secondary rounded-full p-1.5 border border-black shadow-lg z-10">
              <Edit2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-foreground">{username}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <User className="w-3 h-3" /> Invitado en PorcheJam
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <div className="text-lg font-display font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Match history */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Historial de partidas</h3>
          <div className="space-y-2">
            {gameHistory.length === 0 ? (
               <div className="glass rounded-xl p-6 text-center text-muted-foreground">
                 Aún no has jugado ninguna partida. ¡Ve al Dashboard y empieza una Jam Session!
               </div>
            ) : (
              gameHistory.slice().reverse().slice(0, 10).map((game, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Jam Session <span className="text-primary opacity-80">· {game.mode}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()} · <span className="text-white/80">{game.correctAnswers || 0} aciertos</span>
                    </div>
                  </div>
                  <div className="text-lg font-display font-bold text-primary">{game.score.toLocaleString()}</div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/stats")} className="border-white/15 bg-white/5 hover:bg-white/10">
            Ver estadísticas avanzadas
          </Button>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 flex justify-center">
          <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10">
            <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
          </Button>
        </motion.div>
      </div>

      {/* MODAL PARA CAMBIAR AVATAR */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Elige tu Avatar</h3>
                <button onClick={() => setIsAvatarModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                {FREE_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => selectAvatar(avatar)}
                    className={`aspect-square flex items-center justify-center rounded-xl transition-all overflow-hidden ${
                      currentAvatar === avatar 
                        ? "ring-2 ring-primary bg-primary/10 scale-105" 
                        : "bg-white/5 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {avatar === "default" || avatar.startsWith("persona:") ? (
                      <img 
                        src={getDicebearUrl(avatar === "default" ? username : avatar.split(":")[1])} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-4xl">{avatar}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-xs text-zinc-400">Próximamente avatares premium en la tienda con 🪙</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfile;