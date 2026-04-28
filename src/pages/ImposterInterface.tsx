import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Ghost, Fingerprint, Eye, Skull, Volume2, Users, Infinity, PartyPopper, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

import MusicVisualizer from "@/components/MusicVisualizer";

const API_BASE_URL = import.meta.env.DEV ? "/api" : "https://porchify-api.onrender.com/api";

// Helper para mezclar arrays aleatoriamente
const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

interface Player {
  id: number;
  name: string;
  emoji: string;
  score?: number;
}

interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  cover: string;
}

type Phase = "setup" | "pass" | "reveal" | "debate" | "voting" | "result";

const ImposterInterface = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parámetros de configuración
  const revealMode = searchParams.get("reveal") || "mixto";
  const useClues = searchParams.get("clues") === "true";
  const debateTime = parseInt(searchParams.get("debateTime") || "5", 10);
  const audioTimeLimit = parseInt(searchParams.get("audioTime") || "10", 10);
  
  // Parámetros de pistas y flash
  const rawClueTypes = searchParams.get("clueTypes");
  const allowedClueTypes = rawClueTypes ? rawClueTypes.split(",") : ["tags", "audio"];
  const flashTime = parseFloat(searchParams.get("flashTime") || "0.5"); // Tiempo de flash: 0.2s - 1.5s

  // Estados del Juego
  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [imposterId, setImposterId] = useState<number | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de Carrusel
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false); 
  
  // SOLUCIÓN 1: Añadir "lyrics" a los tipos permitidos del estado
  const [imposterClueType, setImposterClueType] = useState<"tags" | "audio" | "lyrics" | null>(null);
  const [imposterTags, setImposterTags] = useState<string[]>([]);

  // Estados de Votación
  const [suspectId, setSuspectId] = useState<number | null>(null);
  const [winner, setWinner] = useState<"reales" | "impostor" | null>(null);
  const [timeLeft, setTimeLeft] = useState(debateTime * 60);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // FASE 1: SETUP & FETCH TRACK
  // ==========================================
  useEffect(() => {
    const storedPlayers = JSON.parse(localStorage.getItem("porchify_party_players") || "[]");
    if (storedPlayers.length < 3) {
      navigate("/local-lobby");
      return;
    }
    setPlayers(storedPlayers.map((p: Player) => ({ ...p, score: p.score || 0 })));

    const randomImposter = storedPlayers[Math.floor(Math.random() * storedPlayers.length)].id;
    setImposterId(randomImposter);

    const fetchRandomTrack = async () => {
      try {
        const playType = localStorage.getItem("porchify_selected_type");
        const singleId = localStorage.getItem("porchify_selected_playlist");
        const mixItemsStr = localStorage.getItem("porchify_mix_items");

        if (!playType) throw new Error("No playlist selected");

        let sources: {id: string, type: string}[] = [];
        if (playType === "mix" && mixItemsStr) {
          sources = JSON.parse(mixItemsStr);
        } else {
          sources = [{ id: singleId!, type: playType }];
        }

        const randomSource = sources[Math.floor(Math.random() * sources.length)];
        
        let allTracks: any[] = [];
        const pagesToFetch = [0, 50, 100]; 
        
        await Promise.all(pagesToFetch.map(async (idx) => {
          try {
            const res = await fetch(`${API_BASE_URL}/tracks?id=${randomSource.id}&type=${randomSource.type}&index=${idx}`);
            if (res.ok) {
              const data = await res.json();
              if (data.tracks && data.tracks.length > 0) {
                allTracks = [...allTracks, ...data.tracks];
              }
            }
          } catch (e) {
            // Ignoramos errores de páginas
          }
        }));

        const validTracks = allTracks.filter((t: any) => t.previewUrl);

        if (validTracks.length > 0) {
          const uniqueTracks = Array.from(new Map(validTracks.map(t => [t.id, t])).values());
          const selectedTrack = uniqueTracks[Math.floor(Math.random() * uniqueTracks.length)];
          
          if (selectedTrack) {
            setCurrentTrack(selectedTrack as Track);

            // --- SELECCIÓN Y GENERACIÓN DE PISTAS EN CASCADA ---
            if (useClues && allowedClueTypes.length > 0) {
              let initialClueType = allowedClueTypes[Math.floor(Math.random() * allowedClueTypes.length)];
              
              // 1. INTENTO DE LETRA (LYRICS)
              if (initialClueType === "lyrics") {
                try {
                  const cleanTitle = selectedTrack.name.split(/[\(\-]/)[0].trim();
                  const cleanArtist = selectedTrack.artist.split(/[\,\&]/)[0].trim();

                  const res = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);
                  if (!res.ok) throw new Error("Letra no encontrada");
                  
                  const data = await res.json();
                  if (!data.lyrics) throw new Error("Sin letras");

                  const lines = data.lyrics.split('\n')
                    .map((l: string) => l.trim())
                    .filter((l: string) => l.length > 15 && !l.startsWith('['));
                  
                  if (lines.length > 0) {
                    const randomLine = lines[Math.floor(Math.random() * lines.length)];
                    setImposterClueType("lyrics"); // Arreglado el TypeScript
                    setImposterTags([`"${randomLine}"`]); 
                  } else {
                    throw new Error("No hay líneas válidas");
                  }
                } catch (e) {
                  initialClueType = "tags"; 
                }
              }

              // 2. INTENTO DE TAGS (DATAMUSE)
              if (initialClueType === "tags") {
                try {
                  const titleWords = selectedTrack.name.split(/[\s\(\)-]+/).filter((w: string) => w.length > 3);
                  const keyword = titleWords.length > 0 ? titleWords[0] : selectedTrack.artist.split(' ')[0];
                  const cleanKeyword = keyword.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');

                  const tagRes = await fetch(`https://api.datamuse.com/words?v=es&ml=${encodeURIComponent(cleanKeyword)}&max=20`);
                  const tagData = await tagRes.json();
                  
                  const cleanTitle = selectedTrack.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                  const words = tagData
                    .map((d: any) => d.word)
                    .filter((w: string) => {
                      const cleanW = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      return w.length > 2 && !cleanTitle.includes(cleanW);
                    });
                  
                  if (words.length > 0) {
                    const formatted = words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1));
                    const numClues = Math.floor(Math.random() * 3) + 1; 
                    const maxWords = Math.min(words.length, numClues);
                    
                    setImposterClueType("tags");
                    setImposterTags(shuffleArray(formatted).slice(0, maxWords));
                  } else {
                    throw new Error("Sin palabras seguras");
                  }
                } catch (e) {
                  initialClueType = "audio";
                }
              }

              // 3. INTENTO FINAL DE AUDIO
              if (initialClueType === "audio") {
                setImposterClueType("audio");
              }
            }

            // SOLUCIÓN 2: Quitar la pantalla de carga SÓLO cuando las pistas ya se han descargado
            setIsLoading(false);
            setPhase("pass");
            return;
          }
        }
        throw new Error("No valid tracks found");
      } catch (error) {
        console.error("Error cargando canción:", error);
        navigate("/playlists");
      }
    };

    fetchRandomTrack();
  }, [navigate]);

  // Timer de Debate
  useEffect(() => {
    if (phase === "debate" && debateTime > 0 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [phase, debateTime, timeLeft]);

  // Reproducir música final
  useEffect(() => {
    if (phase === "result" && audioRef.current && currentTrack?.previewUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.8;
      audioRef.current.play().catch(e => console.log("Final play error:", e));
    }
  }, [phase, currentTrack]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    };
  }, []);

  // ==========================================
  // LÓGICA DE REVELACIÓN
  // ==========================================
  const handlePointerDown = () => {
    if (audioFinished) return; 
    setIsHolding(true);
    
    if (audioRef.current && currentTrack?.previewUrl) {
      const isImposter = players[currentPlayerIndex]?.id === imposterId;
      
      if ((!isImposter && (revealMode === "audio" || revealMode === "mixto")) || 
          (isImposter && imposterClueType === "audio")) {
        
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));

        const listenDuration = isImposter ? (flashTime * 1000) : (audioTimeLimit * 1000);

        audioTimerRef.current = setTimeout(() => {
          if (audioRef.current) audioRef.current.pause();
          setAudioFinished(true); 
        }, listenDuration);
      }
    }
  };

  const handlePointerUp = () => {
    setIsHolding(false);
    if (audioRef.current && phase !== "result") {
      audioRef.current.pause();
    }
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
  };

  const handleNextPlayer = () => {
    setAudioFinished(false); 
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setPhase("pass");
    } else {
      setPhase("debate");
    }
  };

  const handleVote = () => {
    const isImposterCaught = suspectId === imposterId;
    const finalWinner = isImposterCaught ? "reales" : "impostor";
    
    setWinner(finalWinner);
    setPhase("result");

    try {
      const history = JSON.parse(localStorage.getItem("porchify_match_history") || "[]");
      const newMatch = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        mode: "party",
        specialMode: "imposter",
        playlist: "Partida Infiltrado", 
        cover: "🕵️‍♂️", 
        score: finalWinner === "impostor" ? "¡Gana Infiltrado!" : "¡Ganan Reales!",
        imposterName: players.find(p => p.id === imposterId)?.name,
        trackName: currentTrack?.name,
        trackArtist: currentTrack?.artist,
        topPlayers: players 
      };
      
      history.unshift(newMatch);
      if (history.length > 20) history.pop();
      localStorage.setItem("porchify_match_history", JSON.stringify(history));

      const partyGames = parseInt(localStorage.getItem("porchify_party_games") || "0");
      localStorage.setItem("porchify_party_games", (partyGames + 1).toString());

      const tally = JSON.parse(localStorage.getItem("porchify_mode_tally") || "{}");
      const favKey = `party-imposter-${revealMode}`;
      tally[favKey] = (tally[favKey] || 0) + 1;
      localStorage.setItem("porchify_mode_tally", JSON.stringify(tally));

    } catch (e) {
      console.error("Error guardando estadísticas", e);
    }
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = debateTime === 0 ? 0 : circumference - (timeLeft / (debateTime * 60)) * circumference;

  const currentPlayer = players[currentPlayerIndex];
  const isCurrentImposter = currentPlayer?.id === imposterId;

  if (phase === "setup" || isLoading || !currentTrack) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p className="font-bold uppercase tracking-widest text-orange-200">Preparando el engaño...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 flex flex-col items-center justify-center relative overflow-hidden select-none">
      
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-zinc-950 to-red-900/20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 opacity-50" />

      <audio ref={audioRef} src={currentTrack.previewUrl} />

      <AnimatePresence mode="wait">
        
        {phase === "pass" && (
          <motion.div key="pass" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -50 }} className="text-center z-10 w-full max-w-sm">
            <Ghost className="w-16 h-16 text-orange-500/50 mx-auto mb-6 animate-bounce" />
            <h2 className="text-xl text-muted-foreground uppercase tracking-widest font-bold mb-2">Turno de</h2>
            <div className="text-6xl mb-4">{currentPlayer?.emoji}</div>
            <h1 className="text-4xl font-display font-black text-white mb-8">{currentPlayer?.name}</h1>
            <p className="text-orange-200/60 mb-8 max-w-[250px] mx-auto text-sm">
              Asegúrate de que nadie esté mirando la pantalla antes de continuar.
            </p>
            <Button onClick={() => setPhase("reveal")} className="w-full h-16 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(234,88,12,0.4)]">
              Ver Identidad
            </Button>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md z-10 flex flex-col items-center">
            <div className="w-full glass-strong border border-orange-500/30 rounded-3xl p-8 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
              
              {!isHolding ? (
                <div className="text-center">
                  <Fingerprint className="w-20 h-20 text-orange-500/80 mx-auto mb-4 animate-pulse" />
                  <p className="text-orange-200 font-bold">MANTÉN PULSADO<br/>PARA REVELAR</p>
                </div>
              ) : (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
                  {isCurrentImposter ? (
                    <div className="space-y-4">
                      <Skull className="w-16 h-16 text-red-500 mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                      <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest">Eres el Infiltrado</h2>
                      <p className="text-zinc-400 text-sm mb-4">No tienes ni idea de qué canción es. Finge y sobrevive.</p>
                      
                      {useClues && imposterClueType && (
                        <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl mt-4">
                          <p className="text-xs text-red-400 uppercase font-bold mb-2">Tu Pista de Ayuda:</p>
                          
                          {imposterClueType === "tags" && (
                            <div className="flex flex-wrap justify-center gap-2">
                              {imposterTags.map(t => <span key={t} className="px-3 py-1 bg-white/10 rounded-full text-sm font-bold">{t}</span>)}
                            </div>
                          )}

                          {imposterClueType === "lyrics" && (
                            <div className="flex flex-wrap justify-center text-center">
                              <span className="text-sm font-bold text-orange-200 italic px-2">{imposterTags[0]}</span>
                            </div>
                          )}
                          
                          {imposterClueType === "audio" && (
                            <div className="flex items-center justify-center gap-2 text-white">
                              <Volume2 className={`w-5 h-5 ${audioFinished ? 'text-zinc-600' : 'text-red-400 animate-pulse'}`} /> 
                              <span>{audioFinished ? "Audio agotado" : `Micro-audio activado (${flashTime}s)`}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Eye className="w-12 h-12 text-blue-400 mx-auto" />
                      <h2 className="text-lg text-blue-300 font-bold uppercase tracking-widest">Jugador Real</h2>
                      
                      {(revealMode === "texto" || revealMode === "mixto") && (
                        <div className="mt-4">
                          <h3 className="text-3xl font-black text-white">{currentTrack.name}</h3>
                          <p className="text-xl text-blue-200">{currentTrack.artist}</p>
                        </div>
                      )}

                      {(revealMode === "audio" || revealMode === "mixto") && (
                        <div className="mt-6 flex flex-col items-center justify-center gap-3 bg-blue-900/30 py-3 px-6 rounded-xl border border-blue-500/30">
                          <div className="flex items-center gap-2">
                            <Volume2 className={`w-5 h-5 ${audioFinished ? 'text-zinc-500' : 'text-blue-400 animate-pulse'}`} />
                            <span className={`font-bold ${audioFinished ? 'text-zinc-400' : 'text-blue-100'}`}>
                              {audioFinished ? "Tiempo de escucha finalizado" : "Reproduciendo audio..."}
                            </span>
                          </div>
                          {!audioFinished && <div className="text-xs text-blue-300/60">Límite: {audioTimeLimit}s</div>}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <div 
                className="absolute inset-0 z-20 cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            <Button 
              onClick={handleNextPlayer} 
              variant="outline"
              className="mt-8 rounded-full h-12 px-8 border-white/10 text-zinc-300 hover:bg-white/10"
            >
              {currentPlayerIndex < players.length - 1 ? "Siguiente Jugador" : "Ir al Debate"}
            </Button>
          </motion.div>
        )}

        {phase === "debate" && (
          <motion.div key="debate" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-orange-500 uppercase tracking-widest mb-8">Fase de Debate</h2>
            
            <div className="relative w-48 h-48 flex items-center justify-center mb-10">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                <circle 
                  cx="96" cy="96" r={radius} 
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-orange-500 transition-all duration-1000 ease-linear" 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute z-10 text-5xl font-display font-black text-white">
                {debateTime === 0 ? <Infinity className="w-16 h-16 text-orange-500 mx-auto" /> : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
              </div>
            </div>

            <div className="w-full h-12 mb-10 opacity-50">
               <MusicVisualizer isPlaying={true} />
            </div>

            <Button onClick={() => setPhase("voting")} className="w-full h-16 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(220,38,38,0.4)]">
              Acusar Infiltrado
            </Button>
          </motion.div>
        )}

        {phase === "voting" && (
          <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md z-10">
            <h2 className="text-2xl font-black text-white text-center mb-2">¿Quién es el Infiltrado?</h2>
            <p className="text-zinc-400 text-center text-sm mb-6">El grupo debe votar y seleccionar a un sospechoso.</p>

            <div className="space-y-3">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSuspectId(p.id)}
                  className={`w-full glass rounded-xl p-4 flex items-center gap-4 transition-all ${
                    suspectId === p.id ? "bg-red-500/20 border-red-500 ring-1 ring-red-500" : "border-white/5 hover:bg-white/5"
                  }`}
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="font-bold text-lg text-white flex-1 text-left">{p.name}</span>
                </button>
              ))}
            </div>

            <Button disabled={!suspectId} onClick={handleVote} className="w-full h-14 mt-8 rounded-full bg-orange-500 text-white font-bold text-lg">
              Confirmar Voto
            </Button>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md z-10 text-center">
            
            {winner === "reales" ? (
              <div>
                <PartyPopper className="w-20 h-20 text-green-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                <h1 className="text-4xl font-black text-green-500 uppercase">¡Cazado!</h1>
                <p className="text-zinc-300 mt-2">Los jugadores reales han descubierto a {players.find(p => p.id === imposterId)?.name}.</p>
              </div>
            ) : (
              <div>
                <Ghost className="w-20 h-20 text-red-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                <h1 className="text-4xl font-black text-red-500 uppercase">¡Engañados!</h1>
                <p className="text-zinc-300 mt-2">{players.find(p => p.id === imposterId)?.name} era el Infiltrado y ha logrado escapar.</p>
              </div>
            )}

            <div className="mt-8 glass-strong border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
              {currentTrack.cover && <img src={currentTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
              <div className="relative z-20">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">La Canción Era</h3>
                <p className="text-3xl font-black text-white">{currentTrack.name}</p>
                <p className="text-xl text-orange-300 mt-1">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <Button variant="outline" onClick={() => navigate("/modes")} className="flex-1 h-14 rounded-full border-white/10 text-zinc-300">
                Salir
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1 h-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold">
                Jugar de Nuevo
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ImposterInterface;