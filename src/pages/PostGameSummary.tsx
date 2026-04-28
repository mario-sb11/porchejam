import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Flame, Medal, Crown, Bomb, Skull, Settings, Music } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const podiumColors = [
  "from-yellow-400 to-yellow-600",
  "from-gray-300 to-gray-500",
  "from-amber-600 to-amber-800",
];

const FUNNY_PHRASES = [
  "Se quedó con la mente en blanco pero acabó como Diakhaby",
  "Sus reflejos son tan lentos como el WiFi del vecino.",
  "Eres penoso hermano, suerte en la próxima.",
  "RIP. Al menos pasó a mejor vida escuchando temazos.",
  "Explotó por culpa de sus terribles gustos musicales.",
  "Pulsó los botones como si tuviera las manos de la Falete",
  "Se le acabó el tiempo, la suerte y la dignidad."
];

const PostGameSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasSavedData = useRef(false);
  
  const { 
    mode = "solo",
    specialMode = "normal", 
    score = 0, 
    roundsPlayed = 1, 
    correctGuesses = 0,
    partyScores = {},
    partyPlayers = [],
    partyLives = {},
    loserId = null
  } = location.state || {};

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const randomInsult = useMemo(() => {
    return FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)];
  }, []);

  const precision = roundsPlayed > 0 ? Math.round((correctGuesses / roundsPlayed) * 100) : 0;

  // RANKING MULTIJUGADOR
  const rankedPlayers = [...partyPlayers].map(p => ({
    ...p,
    score: partyScores[p.id] || 0,
    lives: partyLives[p.id] !== undefined ? partyLives[p.id] : 3
  })).sort((a, b) => {
    if (specialMode === "survival") {
      if (a.lives > 0 && b.lives <= 0) return -1;
      if (a.lives <= 0 && b.lives > 0) return 1; 
      return b.score - a.score;
    }
    return b.score - a.score;
  });

  const isHotPotato = specialMode === "contrarreloj";
  const loser = isHotPotato ? rankedPlayers.find(p => p.id === loserId) : null;
  const survivors = isHotPotato ? rankedPlayers.filter(p => p.id !== loserId) : [];

  //  EL CEREBRO CONTABLE
  useEffect(() => {
    if (hasSavedData.current) return;
    hasSavedData.current = true;

    // 1. Récord Global (Solo)
    let myScore = score;
    if (mode === "solo") {
      const savedHighScore = parseInt(localStorage.getItem("porchify_high_score") || "0");
      setHighScore(Math.max(savedHighScore, score));
      
      if (score > savedHighScore && score > 0) {
        setIsNewRecord(true);
        localStorage.setItem("porchify_high_score", score.toString());
        setHighScore(score);
      }
    } else {
      myScore = rankedPlayers.length > 0 ? rankedPlayers[0].score : 0;
    }

    // 2. Contadores Categorizados
    if (mode === "solo") {
      const currentSoloGames = parseInt(localStorage.getItem("porchify_solo_games") || "0");
      localStorage.setItem("porchify_solo_games", (currentSoloGames + 1).toString());
      
      const currentTotalCorrect = parseInt(localStorage.getItem("porchify_total_correct") || "0");
      const currentTotalRounds = parseInt(localStorage.getItem("porchify_total_rounds") || "0");
      localStorage.setItem("porchify_total_correct", (currentTotalCorrect + correctGuesses).toString());
      localStorage.setItem("porchify_total_rounds", (currentTotalRounds + roundsPlayed).toString());
    } else {
      const currentPartyGames = parseInt(localStorage.getItem("porchify_party_games") || "0");
      localStorage.setItem("porchify_party_games", (currentPartyGames + 1).toString());
    }

    // Historial del modo más jugado
    const currentModeTallyStr = localStorage.getItem("porchify_mode_tally") || "{}";
    const currentModeTally = JSON.parse(currentModeTallyStr);
    const modeKey = `${mode}-${specialMode}`;
    currentModeTally[modeKey] = (currentModeTally[modeKey] || 0) + 1;
    localStorage.setItem("porchify_mode_tally", JSON.stringify(currentModeTally));

    // 3. Bombas Sufridas
    if (mode === "solo" && specialMode === "contrarreloj" && loserId) {
      const currentBombs = parseInt(localStorage.getItem("porchify_bombs_suffered") || "0");
      localStorage.setItem("porchify_bombs_suffered", (currentBombs + 1).toString());
    }

    // 4. Historial Interactivo
    const playlistName = localStorage.getItem("porchify_selected_playlist_name") || "Mix Aleatorio";
    const playType = localStorage.getItem("porchify_selected_type") || "playlist";
    const coverEmoji = playType === "artist" ? "🎤" : (playType === "mix" ? "⚔️" : "🎵");
    
    const specialModeNames: Record<string, string> = {
      normal: "Normal", contrarreloj: "Patata Caliente", inverso: "Inverso", survival: "Supervivencia"
    };

    const newMatch = {
      id: Date.now(),
      playlist: playlistName,
      score: mode === "solo" ? `${myScore.toLocaleString()} pts` : (isHotPotato && loser ? `💥 ${loser.name}` : `🏆 ${rankedPlayers[0]?.name}`),
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      cover: coverEmoji,
      mode: mode, 
      specialMode: specialModeNames[specialMode] || "Desconocido",
      accuracy: `${correctGuesses}/${roundsPlayed}`,
      topPlayers: mode === "party" ? rankedPlayers.slice(0, 3).map(p => ({ name: p.name, emoji: p.emoji, score: p.score })) : null
    };

    const historyData = localStorage.getItem("porchify_match_history");
    let matchHistory = historyData ? JSON.parse(historyData) : [];
    
    matchHistory.unshift(newMatch);
    if (matchHistory.length > 10) matchHistory = matchHistory.slice(0, 10); 
    
    localStorage.setItem("porchify_match_history", JSON.stringify(matchHistory));

  }, [mode, score, specialMode, correctGuesses, roundsPlayed, loserId, partyScores, partyPlayers.length, rankedPlayers, isHotPotato, loser]);

  const top3 = rankedPlayers.slice(0, 3);
  const rest = rankedPlayers.slice(3);

  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], position: 1 });
  if (top3[0]) podiumOrder.push({ ...top3[0], position: 0 });
  if (top3[2]) podiumOrder.push({ ...top3[2], position: 2 });

  const podiumHeights = { 0: "h-40", 1: "h-28", 2: "h-20" };

  const stats = [
    { icon: Target, label: "Precisión", value: `${precision}%`, color: "text-primary" },
    { icon: Flame, label: "Aciertos", value: `${correctGuesses}/${roundsPlayed}`, color: "text-secondary" },
    { icon: Medal, label: "Récord", value: highScore.toLocaleString(), color: "text-yellow-400" },
  ];

  // FUNCIÓN PARA LA REVANCHA EXACTA
  const handleRevancha = () => {
    const lastParams = localStorage.getItem("porchejam_last_game_params");
    if (lastParams) {
      navigate(`/game${lastParams}`);
    } else {
      // Fallback de seguridad si algo fallase
      navigate(`/game?mode=${mode}&special=${specialMode}`);
    }
  };

  return (
    <div className={`min-h-screen gradient-bg px-4 py-8 flex flex-col items-center justify-center transition-colors duration-1000 ${isHotPotato ? 'bg-red-950/40' : ''}`}>
      <div className="max-w-2xl w-full">
        
        {/* CABECERA DINÁMICA SEGÚN MODO */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          {isHotPotato ? (
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} 
              transition={{ type: "spring", bounce: 0.6 }}
            >
              <Bomb className="w-20 h-20 text-red-500 mx-auto mb-3 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
              <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 drop-shadow-lg">
                ¡B O O O M!
              </h1>
              <p className="text-lg md:text-xl text-red-200 mt-2 font-bold uppercase tracking-widest bg-red-900/50 inline-block px-4 py-1 rounded-full border border-red-500/30">
                A {loser?.name || "ALGUIEN"} le ha explotado
              </p>
            </motion.div>
          ) : isNewRecord ? (
            <motion.div 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} 
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
            >
              <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
              <h1 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
                ¡NUEVO RÉCORD!
              </h1>
            </motion.div>
          ) : (
            <>
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-4xl font-display font-black text-foreground">¡Partida terminada!</h1>
            </>
          )}
        </motion.div>

        {/* MODO FIESTA: PATATA CALIENTE */}
        {mode === "party" && isHotPotato && (
          <div className="mb-12 space-y-8">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="glass-strong border-2 border-red-500/50 rounded-3xl p-8 flex flex-col items-center justify-center glow-red relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
              <span className="text-7xl mb-2 relative z-10">{loser?.emoji || "💥"}</span>
              <span className="text-4xl font-black font-display relative z-10 text-white uppercase tracking-tighter italic">
                {loser?.name || "EL JUGADOR"} 
              </span>
              <div className="mt-4 relative z-10 flex flex-col items-center max-w-sm text-center">
                <span className="text-red-400 font-bold text-sm italic bg-black/40 px-4 py-2 rounded-xl">
                  "{randomInsult}"
                </span>
              </div>
            </motion.div>

            {survivors.length > 0 && (
              <div>
                <h3 className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-black mb-4">
                  Muro de los Supervivientes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {survivors.map((p, i) => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + (i * 0.1) }} 
                      className="glass rounded-xl p-4 flex flex-col items-center text-center border-white/5 hover:border-green-500/30 transition-colors"
                    >
                      <span className="text-4xl mb-1 opacity-80">{p.emoji}</span>
                      <span className="font-bold text-sm truncate w-full">{p.name}</span>
                      <span className="text-xs font-black text-primary mt-1">{p.score.toLocaleString()} pts</span>
                      <span className="text-[9px] text-green-400 font-black uppercase tracking-widest mt-1">SALVADO</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODO FIESTA: PÓDIUM NORMAL */}
        {mode === "party" && !isHotPotato && rankedPlayers.length > 0 && (
          <div className="mb-12">
            <div className="flex items-end justify-center gap-2 md:gap-4 mb-8">
              {podiumOrder.map((player, i) => {
                const isDead = specialMode === "survival" && player.lives <= 0;
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.2 }}
                    className={`flex flex-col items-center w-24 md:w-32 ${isDead ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="text-4xl md:text-5xl mb-2 drop-shadow-lg relative">
                      {player.emoji}
                      {player.position === 0 && !isDead && <Crown className="w-6 h-6 text-yellow-400 absolute -top-4 -right-2 rotate-12 drop-shadow-md" />}
                      {isDead && <Skull className="w-6 h-6 text-red-500 absolute -top-4 -right-2 drop-shadow-md" />}
                    </div>
                    <div className="text-xs md:text-sm font-bold mb-1 text-center truncate w-full px-1">{player.name}</div>
                    <div className="text-[10px] md:text-xs text-primary font-bold mb-2 bg-primary/10 px-2 py-0.5 rounded-full">{player.score.toLocaleString()} pts</div>
                    <div className={`w-full ${podiumHeights[player.position as 0|1|2]} rounded-t-2xl bg-gradient-to-t ${podiumColors[player.position as 0|1|2]} flex items-start justify-center pt-3 md:pt-4 shadow-xl border border-white/20`}>
                      <span className="text-3xl md:text-4xl font-display font-black text-background/80 drop-shadow-md">
                        {player.position === 0 ? "1" : player.position === 1 ? "2" : "3"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {rest.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="space-y-2 max-w-md mx-auto">
                {rest.map((p, i) => {
                  const isDead = specialMode === "survival" && p.lives <= 0;
                  return (
                    <div key={p.id} className={`glass rounded-xl p-3 flex items-center gap-4 ${isDead ? 'opacity-50 grayscale' : ''}`}>
                      <span className="text-sm font-bold text-muted-foreground w-4 text-center">
                        {isDead ? <Skull className="w-4 h-4 text-red-500/50 mx-auto" /> : i + 4}
                      </span>
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="flex-1 text-sm font-semibold text-foreground truncate">{p.name}</span>
                      <span className="text-sm font-bold text-primary">{p.score.toLocaleString()} pts</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* MODO SOLITARIO */}
        {mode === "solo" && (
          <>
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center justify-center mb-12"
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Puntuación Final</div>
              <div className="text-7xl md:text-8xl font-display font-black text-foreground drop-shadow-xl text-glow-green">
                {score.toLocaleString()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3 mb-12"
            >
              {stats.map((s) => (
                <div key={s.label} className="glass border border-white/5 rounded-2xl p-4 text-center transform transition-transform hover:scale-105">
                  <s.icon className={`w-6 h-6 mx-auto mb-3 ${s.color}`} />
                  <div className="text-xl md:text-2xl font-display font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </>
        )}

        {/* NUEVA BOTONERA DE ACCIÓN UX/UI */}
        <div className="mt-8 max-w-md mx-auto space-y-3">
          {/* Botón Principal: Revancha */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mode === "solo" ? 0.8 : 1.2 }}>
            <Button
              onClick={handleRevancha}
              className="w-full h-16 rounded-full bg-primary text-black font-black text-xl shadow-[0_0_20px_rgba(30,215,96,0.4)] hover:shadow-[0_0_30px_rgba(30,215,96,0.6)] hover:scale-105 transition-all"
            >
              <Flame className="w-6 h-6 mr-2 fill-black" /> ¡Jugar otra vez!
            </Button>
          </motion.div>

          {/* Botones Secundarios */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mode === "solo" ? 0.9 : 1.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              variant="outline"
              onClick={() => navigate("/modes")}
              className="flex-1 h-14 rounded-full glass border-white/10 text-foreground hover:bg-white/10 hover:border-white/20 font-bold"
            >
              <Settings className="w-5 h-5 mr-2 text-zinc-400" /> Menu principal
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/playlists")}
              className="flex-1 h-14 rounded-full glass border-white/10 text-foreground hover:bg-white/10 hover:border-white/20 font-bold"
            >
              <Music className="w-5 h-5 mr-2 text-zinc-400" /> Cambiar Música
            </Button>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
};

export default PostGameSummary;