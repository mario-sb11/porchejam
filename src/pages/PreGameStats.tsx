import { useEffect, useState } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Play, Loader2, Gamepad2, User, Users, Globe, X, Swords, Clock, Ghost, Music, LogOut, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameButton from "@/components/ui/GameButton";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PreGameStats = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("Jugador");
  const [currentAvatar, setCurrentAvatar] = useState("default");

  // Estados Reales
  const [highScore, setHighScore] = useState("0");
  const [soloGames, setSoloGames] = useState("0");
  const [partyGames, setPartyGames] = useState("0");
  const [globalAccuracy, setGlobalAccuracy] = useState("0%");
  
  const [favoriteMode, setFavoriteMode] = useState("Aún no definido");
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  // Modal de Detalles
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("porchejam_username");
    if (storedName) {
      setUsername(storedName);
    }

    const savedAvatar = localStorage.getItem("porchejam_avatar");
    if (savedAvatar) {
      setCurrentAvatar(savedAvatar);
    }

    // Datos Solitario
    setHighScore(parseInt(localStorage.getItem("porchify_high_score") || "0").toLocaleString());
    setSoloGames(localStorage.getItem("porchify_solo_games") || "0");
    
    // Precisión Solitario (Arreglado el bug del > 100%)
    const totalC = parseInt(localStorage.getItem("porchify_total_correct") || "0");
    const totalR = parseInt(localStorage.getItem("porchify_total_rounds") || "0");
    if (totalR > 0) {
      const safeC = Math.min(totalC, totalR); // Candado para que los aciertos no superen a las rondas
      setGlobalAccuracy(`${Math.round((safeC / totalR) * 100)}% (${safeC}/${totalR})`);
    } else {
      setGlobalAccuracy("0%");
    }

    // Datos Fiesta
    setPartyGames(localStorage.getItem("porchify_party_games") || "0");

    // Modo Favorito
    const modeTallyStr = localStorage.getItem("porchify_mode_tally");
    if (modeTallyStr) {
      const tally = JSON.parse(modeTallyStr);
      const favKey = Object.keys(tally).reduce((a, b) => tally[a] > tally[b] ? a : b, "");
      
      if (favKey) {
        const parts = favKey.split("-"); // Ej: "party-imposter-mixto" o "solo-survival"
        const m = parts[0];
        const s = parts[1];
        const r = parts[2]; // Puede no existir en modos clásicos

        if (s === "imposter") {
          // Si es Infiltrado, capitalizamos el tipo de pista
          const revealCapitalized = r ? r.charAt(0).toUpperCase() + r.slice(1) : "Mixto";
          setFavoriteMode(`Infiltrado - ${revealCapitalized}`);
        } else {
          const specialNames: Record<string, string> = { normal: "Normal", contrarreloj: "Patata Caliente", inverso: "Inverso", survival: "Supervivencia" };
          setFavoriteMode(`${m === 'solo' ? 'Solitario' : 'Fiesta'} - ${specialNames[s] || s}`);
        }
      }
    }

    // Historial de Partidas
    const historyData = localStorage.getItem("porchify_match_history");
    if (historyData) {
      setRecentMatches(JSON.parse(historyData));
    }

    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold font-display">Preparando el escenario...</h2>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("porchejam_username");
    navigate("/");
  };

  // Función auxiliar para generar Avatar
  const getDicebearUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;

  const renderProfileAvatar = () => {
    if (currentAvatar === "default" || currentAvatar.startsWith("persona:")) {
      const seed = currentAvatar === "default" ? username : currentAvatar.split(":")[1];
      return (
        <Avatar className="w-full h-full rounded-full border-none bg-black">
          <AvatarImage src={getDicebearUrl(seed)} alt={username} className="object-cover" />
          <AvatarFallback className="bg-zinc-900 text-zinc-100 font-bold text-3xl">
            {username.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }
    return (
      <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-green border-2 border-transparent text-4xl">
        {currentAvatar}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white p-4 md:p-6 overflow-x-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      
      <motion.div className="max-w-4xl mx-auto relative z-10 flex flex-col gap-6 pb-24" variants={containerVariants} initial="hidden" animate="show">
        
        {/* Cabecera del Perfil con Botón de Atrás */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 sm:gap-4 mt-6 bg-zinc-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="text-zinc-400 hover:text-white shrink-0 sm:mr-2 rounded-full hidden sm:flex">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary bg-zinc-800 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(var(--primary),0.3)] shrink-0">
            {renderProfileAvatar()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight truncate">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{username}</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 truncate">Jugador de PorcheJam</p>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
             {/* Flecha versión móvil */}
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="text-zinc-400 hover:text-white rounded-full sm:hidden self-end h-8 w-8">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <GameButton
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-full border-white/15 bg-black/30 text-zinc-200 hover:bg-black/50 text-xs px-3"
            >
              <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cambiar nombre</span>
              <span className="inline sm:hidden">Salir</span>
            </GameButton>
          </div>
        </motion.div>

        {/* CONTENEDOR DE TARJETAS ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* TIER 1: SOLITARIO */}
          <motion.div variants={itemVariants}>
          <GlassCard className="glass-strong border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><User className="w-20 h-20" /></div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary"><User className="w-5 h-5"/> Solitario</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest">Récord Puntos</p>
                <p className="text-3xl font-black font-display">{highScore}</p>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-3">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Partidas</p>
                  <p className="font-bold">{soloGames}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase">Precisión</p>
                  <p className="font-bold text-primary">{globalAccuracy}</p>
                </div>
              </div>
            </div>
          </GlassCard>
          </motion.div>

          {/* TIER 2: FIESTA LOCAL */}
          <motion.div variants={itemVariants}>
          <GlassCard className="border-secondary/20 rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users className="w-20 h-20" /></div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-secondary"><Users className="w-5 h-5"/> Fiesta Local</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest">Partidas Jugadas</p>
                <p className="text-3xl font-black font-display">{partyGames}</p>
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-[10px] text-zinc-500 uppercase">Modo Favorito</p>
                <p className="font-bold text-secondary truncate">{favoriteMode}</p>
              </div>
            </div>
          </GlassCard>
          </motion.div>

          {/* TIER 3: ARENA ONLINE */}
          <motion.div variants={itemVariants}>
          <GlassCard className="border-white/5 rounded-2xl p-5 relative overflow-hidden opacity-60">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Globe className="w-20 h-20" /></div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-400"><Globe className="w-5 h-5"/> Arena Online</h2>
            <div className="flex flex-col items-center justify-center h-24 bg-black/20 rounded-xl border border-white/5 border-dashed">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Próximamente</p>
              <p className="text-[10px] text-zinc-600 mt-1">Dame tiempo manin</p>
            </div>
          </GlassCard>
          </motion.div>

        </div>

        {/* Sección: Últimas partidas Reales */}
        <motion.div variants={itemVariants} className="mt-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="text-zinc-300 w-5 h-5"/> Historial de Batallas
          </h2>
          
          {recentMatches.length === 0 ? (
             <div className="bg-zinc-900/50 rounded-2xl p-8 text-center border border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3"><Gamepad2 className="w-8 h-8 text-zinc-500" /></div>
                <p className="text-muted-foreground font-medium">Aún no hay sangre en la arena.</p>
             </div>
          ) : (
            <div className="grid gap-3">
              {recentMatches.map((match, index) => (
                <motion.div 
                  key={`${match.id}-${index}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedMatch(match)}
                  className="bg-zinc-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-xl shadow-md bg-zinc-800 flex items-center justify-center text-2xl border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
                      {match.specialMode === 'imposter' ? <Ghost className="w-6 h-6 text-orange-500" /> : match.cover}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-base">{match.playlist}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-black/40 border ${match.specialMode === 'imposter' ? 'border-orange-500/30 text-orange-300' : 'border-white/5'}`}>
                          {match.mode === 'solo' ? <User className="w-3 h-3 text-primary"/> : <Users className="w-3 h-3 text-secondary"/>}
                          {match.specialMode === 'imposter' ? 'Infiltrado' : match.specialMode}
                        </span>
                        <span>• {match.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right w-full sm:w-auto pl-16 sm:pl-0 sm:ml-auto">
                    <p className={`font-black text-lg ${match.score.includes("Explotó") ? "text-red-500" : (match.specialMode === 'imposter' ? "text-orange-400" : (match.mode === 'party' ? "text-secondary" : "text-primary"))}`}>
                      {match.score}
                    </p>
                    {match.accuracy && match.mode === 'solo' && <p className="text-[10px] text-zinc-500 uppercase font-bold">Aciertos: {match.accuracy}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Botón Flotante */}
        <motion.div 
          className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 flex justify-center"
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.8, type: "spring" }}
        >
          <GameButton 
            size="lg"
            onClick={() => navigate("/playlists")}
            className="w-full max-w-md bg-primary text-black font-black text-xl h-16 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(30,215,96,0.3)] hover:shadow-[0_0_30px_rgba(30,215,96,0.5)] hover:scale-[1.02]"
          >
            NUEVA PARTIDA <Play fill="currentColor" className="w-6 h-6" />
          </GameButton>
        </motion.div>
      </motion.div>

      {/* MODAL DE RESUMEN DE PARTIDA */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className={`p-6 relative overflow-hidden ${selectedMatch.score.includes("Explotó") ? "bg-red-950/40" : (selectedMatch.specialMode === 'imposter' ? "bg-orange-950/40" : "bg-primary/10")}`}>
                <div className="absolute top-2 right-2">
                  <GameButton variant="ghost" size="icon" onClick={() => setSelectedMatch(null)} className="rounded-full hover:bg-white/10 text-white/60 shadow-none">
                    <X className="w-5 h-5" />
                  </GameButton>
                </div>
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="text-5xl mb-3 drop-shadow-lg">
                    {selectedMatch.specialMode === 'imposter' ? <Ghost className="w-12 h-12 text-orange-500 mx-auto" /> : selectedMatch.cover}
                  </div>
                  <h3 className="text-xl font-display font-black leading-tight mb-1">{selectedMatch.playlist}</h3>
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full ${selectedMatch.specialMode === 'imposter' ? 'text-orange-300 border border-orange-500/20' : 'text-white/60'}`}>
                    {selectedMatch.mode === 'solo' ? <User className="w-3 h-3"/> : <Users className="w-3 h-3"/>}
                    {selectedMatch.mode === 'solo' ? 'Solitario' : 'Fiesta Local'} • {selectedMatch.specialMode === 'imposter' ? 'Infiltrado' : selectedMatch.specialMode}
                  </div>
                </div>
              </div>

              {/* Body del Modal */}
              <div className="p-6">
                
                {/* SI ES MODO INFILTRADO */}
                {selectedMatch.specialMode === 'imposter' ? (
                  <div className="space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                       <p className="text-xs uppercase tracking-widest text-orange-500 font-bold mb-1">El Infiltrado era</p>
                       <p className="text-2xl font-black text-white">{selectedMatch.imposterName}</p>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 pt-2">
                      <span className="text-zinc-400 font-medium flex items-center gap-2"><Music className="w-4 h-4"/> Canción</span>
                      <div className="text-right ml-4">
                        <p className="font-bold text-white truncate max-w-[150px]">{selectedMatch.trackName}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[150px]">{selectedMatch.trackArtist}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-zinc-400 font-medium">Victoria de</span>
                      <span className={`font-bold ${selectedMatch.score.includes("Reales") ? "text-green-400" : "text-red-400"}`}>
                        {selectedMatch.score.replace("¡Ganan ", "").replace("¡Gana ", "").replace("!", "")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-1">
                      <span className="text-zinc-400 font-medium">Fecha</span>
                      <span className="font-bold text-sm">{selectedMatch.date}</span>
                    </div>
                  </div>

                // SI ES MODO CLÁSICO SOLITARIO
                ) : selectedMatch.mode === 'solo' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-zinc-400 font-medium">Puntuación Final</span>
                      <span className="text-2xl font-black text-primary">{selectedMatch.score}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-zinc-400 font-medium">Aciertos</span>
                      <span className="font-bold">{selectedMatch.accuracy}</span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-zinc-400 font-medium">Fecha</span>
                      <span className="font-bold text-sm">{selectedMatch.date}</span>
                    </div>
                  </div>

                // SI ES MODO CLÁSICO FIESTA LOCAL
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2"><Swords className="w-4 h-4"/> Ranking Final</h4>
                    <div className="space-y-2">
                      {selectedMatch.topPlayers?.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
                          <span className="font-bold text-muted-foreground w-4 text-center text-xs">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                          <span>{p.emoji}</span>
                          <span className="flex-1 text-sm font-bold truncate">{p.name}</span>
                          <span className="text-sm font-black text-secondary">{p.score}</span>
                        </div>
                      ))}
                      {(!selectedMatch.topPlayers || selectedMatch.topPlayers.length === 0) && (
                        <p className="text-sm text-zinc-400 italic text-center py-2">Detalles no disponibles para esta partida antigua.</p>
                      )}
                    </div>
                    {selectedMatch.score.includes("Explotó") && (
                       <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                         <p className="text-xs font-bold text-red-400">Resultado</p>
                         <p className="text-sm font-black text-red-200">{selectedMatch.score}</p>
                       </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PreGameStats;