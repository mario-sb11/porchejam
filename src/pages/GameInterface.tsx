import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, SkipForward, Loader2, Heart, Timer, Zap, Users, Skull, Bomb } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CircularTimer from "@/components/CircularTimer";
import MusicVisualizer from "@/components/MusicVisualizer";
import ScorePop from "@/components/ScorePop";
import { calculateScore } from "@/data/mockData";

interface Track {
  id: string;
  name: string;
  artist: string;
  cover: string;
  previewUrl?: string;
}

//  Garantiza mezcla 100% aleatoria
const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Elimina puntuación extra para que "dont" valide "don't" en modos difíciles.
const normalizeText = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

const API_BASE_URL = import.meta.env.DEV ? "/api" : "https://porchify-api.onrender.com/api";

const GameInterface = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // PARÁMETROS URL
  const configTime = parseInt(searchParams.get("time") || "15");
  const totalRounds = parseInt(searchParams.get("rounds") || "5");
  const answerMode = searchParams.get("answer") || "facil";
  const specialMode = searchParams.get("special") || "normal";
  const initialLives = parseInt(searchParams.get("lives") || "3");
  const allowSkip = searchParams.get("skip") !== "false";

  // DATOS MODO FIESTA
  const isPartyMode = searchParams.get("mode") === "party";
  const isHotPotato = isPartyMode && specialMode === "contrarreloj";
  const partyPlayers: { id: number; name: string; emoji: string }[] = isPartyMode
    ? (() => { try { return JSON.parse(localStorage.getItem("porchify_party_players") || "[]"); } catch { return []; } })()
    : [];
  const partyType = isPartyMode ? (localStorage.getItem("porchify_party_mode") || "turns") : "turns";

  // CORE & LAZY LOADING (MIX-TAPE)
  const [pool, setPool] = useState<Track[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [mixSources, setMixSources] = useState<{id: string, type: string}[]>([]);
  const [paginationMap, setPaginationMap] = useState<Record<string, number>>({});

  // CONTROL DE TURNOS Y VIDAS
  const [currentTurn, setCurrentTurn] = useState(1);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0); 
  
  const [partyLives, setPartyLives] = useState<Record<number, number>>(
    isPartyMode ? Object.fromEntries(partyPlayers.map(p => [p.id, initialLives])) : {}
  );
  
  const partyLivesRef = useRef<Record<number, number>>(partyLives);
  useEffect(() => {
    partyLivesRef.current = partyLives;
  }, [partyLives]);

  const currentPlayer = isPartyMode && partyPlayers.length > 0 ? partyPlayers[activePlayerIndex] : null;

  const maxTurns = isPartyMode && partyType === "turns" && specialMode !== "survival" && !isHotPotato
    ? totalRounds * Math.max(partyPlayers.length, 1) 
    : (isHotPotato ? 9999 : totalRounds); 
  
  const currentRoundVisual = isPartyMode && partyType === "turns" 
    ? Math.ceil(currentTurn / Math.max(partyPlayers.length, 1)) 
    : currentTurn;

  // Capamos el número de ronda para la UI, evita que salga "Ronda 6/5"
  const displayRound = (specialMode === "survival" || isHotPotato) 
    ? currentRoundVisual 
    : Math.min(currentRoundVisual, totalRounds);

  // PUNTUACIONES
  const [score, setScore] = useState(0); 
  const [partyScores, setPartyScores] = useState<Record<number, number>>({}); 
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const [lives, setLives] = useState(initialLives);

  const [globalTimeLeft, setGlobalTimeLeft] = useState(specialMode === "contrarreloj" ? configTime : 0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [options, setOptions] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roundResult, setRoundResult] = useState<"correct" | "wrong" | null>(null);

  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());

  // INTERFAZ Y REFERENCIAS
  const [timeRemaining, setTimeRemaining] = useState(isHotPotato ? 30 : configTime);
  const [guess, setGuess] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [popScore, setPopScore] = useState<number | null>(null);
  const [popKey, setPopKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const globalTimerRef = useRef<ReturnType<typeof setInterval>>();
  const lastPreparedTurnRef = useRef(0);

  // GUARDAR AJUSTES PARA LA REVANCHA
  useEffect(() => {
    localStorage.setItem("porchejam_last_game_params", window.location.search);
  }, [window.location.search]);

  // 1. CARGA INICIAL MASIVA PROFUNDA
  useEffect(() => {
    const playType = localStorage.getItem("porchify_selected_type");
    const singleId = localStorage.getItem("porchify_selected_playlist");
    const mixItemsStr = localStorage.getItem("porchify_mix_items");

    if (!playType) return navigate("/playlists");

    let sources: {id: string, type: string}[] = [];
    if (playType === "mix" && mixItemsStr) {
      sources = JSON.parse(mixItemsStr);
    } else {
      sources = [{ id: singleId!, type: playType }];
    }
    setMixSources(sources);

    const fetchInitialPool = async () => {
      try {
        let initialTracks: Track[] = [];
        let newPagination: Record<string, number> = {};

        await Promise.all(sources.map(async (source) => {
          const pagesToFetch = [0, 50, 100, 150]; 
          await Promise.all(pagesToFetch.map(async (idx) => {
            try {
              const res = await fetch(`${API_BASE_URL}/tracks?id=${source.id}&type=${source.type}&index=${idx}`);
              if (res.ok) {
                const data = await res.json();
                initialTracks = [...initialTracks, ...data.tracks];
                if (idx === 150 && data.nextIndex) newPagination[source.id] = data.nextIndex;
              }
            } catch (e) {}
          }));
        }));

        const uniqueTracks = Array.from(new Map(initialTracks.map(item => [item.id, item])).values());
        if (uniqueTracks.length === 0) throw new Error("No tracks found");

        setPool(shuffleArray(uniqueTracks));
        setPaginationMap(newPagination);
        setLoadingPool(false);
      } catch (error) {
        navigate("/playlists");
      }
    };
    fetchInitialPool();
  }, [navigate]);

  // 2. GOTEO INTELIGENTE (LAZY LOADING)
  useEffect(() => {
    if (loadingPool || Object.keys(paginationMap).length === 0) return;
    const dripInterval = setInterval(async () => {
      const activeSources = mixSources.filter(src => paginationMap[src.id]);
      if (activeSources.length === 0) {
        clearInterval(dripInterval);
        return;
      }
      const randomSource = activeSources[Math.floor(Math.random() * activeSources.length)];
      const nextIdx = paginationMap[randomSource.id];

      try {
        const res = await fetch(`${API_BASE_URL}/tracks?id=${randomSource.id}&type=${randomSource.type}&index=${nextIdx}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracks && data.tracks.length > 0) setPool(prev => shuffleArray([...prev, ...data.tracks]));
          setPaginationMap(prev => {
            const updated = { ...prev };
            if (data.nextIndex) updated[randomSource.id] = data.nextIndex;
            else delete updated[randomSource.id]; 
            return updated;
          });
        }
      } catch (error) {}
    }, 10000); 
    return () => clearInterval(dripInterval);
  }, [loadingPool, mixSources, paginationMap]);

  // 3. GESTIÓN GLOBAL: Patata Caliente
  useEffect(() => {
    if (specialMode === "contrarreloj" && !loadingPool && !roundResult) {
      globalTimerRef.current = setInterval(() => {
        setGlobalTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameOver(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(globalTimerRef.current);
  }, [specialMode, loadingPool, roundResult]);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (sourceRef.current) { try { sourceRef.current.stop(); } catch (e) {} }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') { 
     audioCtxRef.current.close().catch(e => console.log(e)); 
    }
  }, []);

  const handleGameOver = useCallback(() => {
    stopAllAudio();
    localStorage.setItem("porchify_last_score", score.toString());
    const gameMode = searchParams.get("mode") || "solo";
    
    let finalRoundsPlayed = currentRoundVisual;
    
    if (specialMode === "survival") {
      // Le restamos 1 porque el contador interno avanzó al morir, 
      // pero usamos Math.max(1, ...) por si acaso mueren en la ronda 1 para que no marque 0.
      finalRoundsPlayed = Math.max(1, currentRoundVisual - 1);
    } else if (!isHotPotato) {
      finalRoundsPlayed = Math.min(currentRoundVisual, totalRounds);
    }

    navigate("/summary", {
      state: { 
        mode: gameMode, 
        specialMode,
        score, 
        roundsPlayed: finalRoundsPlayed, 
        correctGuesses,
        partyScores,
        partyPlayers,
        partyLives,
        loserId: isHotPotato ? currentPlayer?.id : null
      }
    });
  }, [score, currentRoundVisual, totalRounds, correctGuesses, navigate, searchParams, partyScores, partyPlayers, partyLives, specialMode, isHotPotato, currentPlayer, stopAllAudio]);

  const checkPartySurvivalEnd = useCallback(() => {
    if (!isPartyMode || specialMode !== "survival") return false;
    const playersAlive = Object.values(partyLives).filter(v => v > 0).length;
    if (playersAlive <= 1) {
      handleGameOver();
      return true;
    }
    return false;
  }, [isPartyMode, specialMode, partyLives, handleGameOver]);

  // 4. PREPARAR RONDA
  const prepareRound = useCallback(async () => {
    if (pool.length === 0) return;

    if (!isPartyMode && specialMode === "survival" && lives <= 0) return handleGameOver();
    if (checkPartySurvivalEnd()) return;
    if (specialMode !== "survival" && !isHotPotato && currentTurn > maxTurns) return handleGameOver();

    setRoundResult(null);
    setGuess("");
    setWrongAttempts(0);
    setIsPlaying(false);
    setTimeRemaining(isHotPotato ? 30 : (specialMode === "contrarreloj" ? 30 : configTime));

    let availablePool = pool.filter(t => !playedTrackIds.has(t.id));
    if (availablePool.length < 4) {
      setPlayedTrackIds(new Set());
      availablePool = pool;
    }

    const validTrack = availablePool[Math.floor(Math.random() * availablePool.length)];
    setPlayedTrackIds(prev => new Set(prev).add(validTrack.id));

    const distractors = shuffleArray(availablePool.filter(t => t.id !== validTrack.id)).slice(0, 3);
    while (distractors.length < 3) distractors.push(pool[Math.floor(Math.random() * pool.length)]);

    setOptions(shuffleArray([validTrack, ...distractors]));
    setCurrentTrack(validTrack);
    stopAllAudio();

    const playAudio = async () => {
      if (!validTrack.previewUrl) { handleTimeUp(); return; }

      if (specialMode === "inverso") {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          
          const res = await fetch(validTrack.previewUrl);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            Array.prototype.reverse.call(audioBuffer.getChannelData(i));
          }
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.loop = isHotPotato;
          sourceRef.current = source;
          
          source.start();
          setIsPlaying(true);
        } catch (e) {
          const audio = new Audio(validTrack.previewUrl);
          audio.volume = 0.5;
          audio.loop = isHotPotato;
          audio.play();
          audioRef.current = audio;
          setIsPlaying(true);
        }
      } else {
        const audio = new Audio(validTrack.previewUrl);
        audio.volume = 0.5;
        audio.loop = isHotPotato;
        audioRef.current = audio;
        audio.play().catch(console.error);
        setIsPlaying(true);
      }
    };
    playAudio();
  }, [pool, playedTrackIds, currentTurn, maxTurns, specialMode, lives, configTime, handleGameOver, checkPartySurvivalEnd, isHotPotato, stopAllAudio]);

  useEffect(() => {
    if (!loadingPool && pool.length > 0 && currentTurn > lastPreparedTurnRef.current) {
      lastPreparedTurnRef.current = currentTurn;
      prepareRound();
    }
  }, [loadingPool, pool.length, currentTurn, prepareRound]);

  // 5. TEMPORIZADOR DE CANCIÓN
  useEffect(() => {
    if (roundResult || !isPlaying) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 0.1) {
          if (isHotPotato) return 30; 
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return t - 0.1;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [roundResult, isPlaying, isHotPotato]);

  const nextTurn = useCallback(() => {
    setCurrentTurn((r) => r + 1);
    
    if (isPartyMode) {
      setActivePlayerIndex((prevIdx) => {
        if (partyPlayers.length <= 1) return 0;
        
        let nextIdx = (prevIdx + 1) % partyPlayers.length;
        
        if (specialMode === "survival") {
          let attempts = 0;
          while (
            partyLivesRef.current[partyPlayers[nextIdx]?.id] <= 0 && 
            attempts < partyPlayers.length
          ) {
            nextIdx = (nextIdx + 1) % partyPlayers.length;
            attempts++;
          }
        }
        return nextIdx;
      });
    }
  }, [isPartyMode, partyPlayers, specialMode]);

  const handleTimeUp = () => {
    stopAllAudio();
    setIsPlaying(false);
    setPopScore(0);
    setPopKey((k) => k + 1);

    if (specialMode === "contrarreloj" && !isPartyMode) {
      nextTurn();
    } else {
      setRoundResult("wrong");
      if (specialMode === "survival") {
        if (isPartyMode && currentPlayer) {
          setPartyLives(prev => ({ ...prev, [currentPlayer.id]: prev[currentPlayer.id] - 1 }));
        } else {
          setLives(l => l - 1);
        }
      }
      setTimeout(nextTurn, 3000);
    }
  };

  const triggerPenaltyShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // 6. COMPROBAR RESPUESTA
  const handleGuess = useCallback((answerIdOrText: string) => {
    if (roundResult || !currentTrack) return;
    let isCorrect = false;

    if (answerMode === "facil" || answerMode === "medio") {
      isCorrect = answerIdOrText === currentTrack.id;
    } else {
      const cleanUser = normalizeText(answerIdOrText);
      const cleanReal = normalizeText(currentTrack.name.split('-')[0].replace(/\(.*?\)/g, ''));
      isCorrect = cleanUser.length > 2 && cleanReal.includes(cleanUser);
    }

    if (isCorrect) {
      clearInterval(timerRef.current);
      stopAllAudio();
      setCorrectGuesses(prev => prev + 1);
      const earned = calculateScore(timeRemaining, specialMode === "contrarreloj" ? 30 : configTime, wrongAttempts);
      
      if (isPartyMode && currentPlayer) {
         setPartyScores(prev => ({ ...prev, [currentPlayer.id]: (prev[currentPlayer.id] || 0) + earned }));
      } else {
         setScore((s) => s + earned);
      }

      setPopScore(earned);
      setPopKey((k) => k + 1);
      setRoundResult("correct");
      setIsPlaying(false);
      setTimeout(nextTurn, isHotPotato ? 800 : 3500);
    } else {
      setWrongAttempts((w) => w + 1);
      triggerPenaltyShake();
      
      if (isHotPotato) {
        setGlobalTimeLeft(prev => Math.max(1, prev - 5)); 
      }
      
      if (answerMode === "facil") {
        if (!isHotPotato) {
            setPopScore(0);
            setPopKey((k) => k + 1);
            setRoundResult("wrong");
            stopAllAudio();
            setIsPlaying(false);
            if (specialMode === "survival") {
              if (isPartyMode && currentPlayer) {
                setPartyLives(prev => ({ ...prev, [currentPlayer.id]: prev[currentPlayer.id] - 1 }));
              } else {
                setLives(l => l - 1);
              }
            }
            setTimeout(nextTurn, 3000);
        }
      } else {
        setGuess("");
      }
    }
  }, [currentTrack, roundResult, timeRemaining, configTime, wrongAttempts, answerMode, specialMode, isPartyMode, currentPlayer, isHotPotato, stopAllAudio, nextTurn]);

  useEffect(() => {
    return stopAllAudio;
  }, [stopAllAudio]);

  if (loadingPool || !currentTrack) return (
    <div className="min-h-screen gradient-bg flex justify-center items-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  );

  const partyRanking = [...partyPlayers]
    .map(p => ({ ...p, score: partyScores[p.id] || 0, lives: partyLives[p.id] }))
    .sort((a, b) => {
      if (specialMode === "survival") {
        if (a.lives <= 0 && b.lives > 0) return 1;
        if (b.lives <= 0 && a.lives > 0) return -1;
      }
      return b.score - a.score;
    });

  return (
    <div className={`min-h-screen gradient-bg px-4 py-6 flex flex-col transition-colors duration-300 ${isHotPotato && globalTimeLeft <= 10 ? 'bg-red-950/40' : ''}`}>
      
      {isPartyMode && partyType === "turns" && currentPlayer && !roundResult && (
        <motion.div
          key={currentPlayer.id + "-" + currentTurn}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto w-full mb-3"
        >
          <div className={`glass-strong rounded-xl px-4 py-2 flex items-center justify-center gap-2 ${isHotPotato ? 'glow-red border-red-500/50' : 'glow-purple'}`}>
            <span className="text-xl">{currentPlayer.emoji}</span>
            <span className="font-display font-bold text-secondary">
               {isHotPotato ? `¡PÁSELA, ${currentPlayer.name.toUpperCase()}!` : `Turno de: ${currentPlayer.name}`}
            </span>
          </div>
        </motion.div>
      )}

      {isPartyMode && partyType === "buzzer" && !roundResult && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto w-full mb-3">
          <div className="glass-strong rounded-xl px-4 py-2 flex items-center justify-center gap-2 glow-magenta">
            <Zap className="w-4 h-4 text-accent" />
            <span className="font-display font-bold text-accent">¡El más rápido gana!</span>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-6 glass-strong p-3 rounded-2xl">
        <Button variant="ghost" size="icon" onClick={() => navigate("/modes")}>
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>

        {specialMode === "contrarreloj" ? (
          <div className={`text-2xl font-black font-display flex items-center gap-2 transition-all ${globalTimeLeft <= 10 && isPartyMode ? 'text-red-500 animate-pulse scale-125' : 'text-yellow-400'}`}>
            {isPartyMode ? <Bomb className={`w-6 h-6 ${globalTimeLeft <= 10 ? 'animate-bounce' : ''}`} /> : <Timer className="w-6 h-6" />}
            {Math.floor(globalTimeLeft / 60)}:{(globalTimeLeft % 60).toString().padStart(2, '0')}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {specialMode === "survival" ? (
              <span className="flex gap-1 bg-black/20 p-2 rounded-full">
                {Array.from({ length: initialLives }).map((_, i) => (
                  <Heart key={i} className={`w-4 h-4 ${
                    isPartyMode 
                      ? (i < (partyLives[currentPlayer?.id] || 0) ? "text-red-500 fill-red-500" : "text-white/20")
                      : (i < lives ? "text-red-500 fill-red-500" : "text-white/20")
                  }`} />
                ))}
              </span>
            ) : (
              <span className="text-xs glass rounded-full px-3 py-1 font-bold">
                {isPartyMode ? `Ronda ${displayRound}/${totalRounds}` : `Ronda ${displayRound}/${totalRounds}`}
              </span>
            )}
          </div>
        )}

        <div className="text-right">
          <div className="text-2xl font-display font-bold text-primary">
            {isPartyMode && currentPlayer ? (partyScores[currentPlayer.id] || 0) : score}
          </div>
          <div className="text-[10px] uppercase">Puntos</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full gap-6">
        <div className={`relative w-full max-w-[280px] aspect-square rounded-full flex items-center justify-center mt-4 ${isShaking ? "animate-shake" : ""} ${isHotPotato && globalTimeLeft <= 10 ? 'animate-pulse' : ''}`}>
          <CircularTimer timeRemaining={timeRemaining} maxTime={isHotPotato ? 30 : (specialMode === "contrarreloj" ? 30 : configTime)} />
          
          <motion.div
            animate={isPlaying ? { rotate: 360 } : {}} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-4 rounded-full overflow-hidden border-4 border-white/10 transition-all ${!roundResult ? 'blur-md grayscale' : ''}`}
          >
            <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
          </motion.div>

          {!roundResult && !isHotPotato && (
            <div className="absolute z-10 flex items-center justify-center w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-xl pointer-events-none">
              <span className="text-2xl font-black font-display text-white drop-shadow-md">
                {Math.ceil(timeRemaining)}
              </span>
            </div>
          )}
        </div>

        <div className="h-20 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {roundResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="revealed">
                <h3 className="text-2xl font-black font-display">{currentTrack.name}</h3>
                <p className="text-muted-foreground">{currentTrack.artist}</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="hidden">
                <ScorePop score={popScore} key_id={`pop-${popKey}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full h-12"><MusicVisualizer isPlaying={isPlaying} /></div>

        <motion.div className={`w-full relative mt-auto ${isShaking ? "animate-shake" : ""}`}>
          {answerMode === "facil" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((track) => {
                let btnClass = "glass hover:bg-white/10";
                if (roundResult) btnClass = track.id === currentTrack.id ? "bg-primary text-black glow-green opacity-100" : "glass opacity-30";
                return (
                  <Button key={track.id} variant="outline" disabled={!!roundResult} onClick={() => handleGuess(track.id)}
                    className={`h-auto min-h-[60px] py-3 flex flex-col border-white/10 ${btnClass}`}>
                    <span className="font-bold text-sm text-center leading-tight">{track.name}</span>
                    <span className="text-xs opacity-70 mt-1">{track.artist}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {answerMode === "medio" && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} disabled={!!roundResult}
                placeholder="Busca la canción..." className="pl-10 h-14 rounded-full glass border-0 text-base text-center" />
              {guess.length > 1 && !roundResult && (
                <div className="absolute bottom-16 left-0 w-full glass rounded-xl overflow-hidden max-h-48 overflow-y-auto z-50">
                  {pool.filter(t => normalizeText(t.name).includes(normalizeText(guess))).slice(0, 4).map(t => (
                    <button key={t.id} onClick={() => { setGuess(""); handleGuess(t.id); }} className="w-full p-3 text-left hover:bg-primary/20 border-b border-white/5">
                      <div className="font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.artist}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {answerMode === "dificil" && (
            <Input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGuess(guess)}
              disabled={!!roundResult} placeholder="Escribe tu respuesta exacta..." className="h-14 rounded-full glass border-0 text-center font-bold text-lg" />
          )}
        </motion.div>

        {allowSkip && !roundResult && !isHotPotato && (
          <Button variant="ghost" onClick={() => { setRoundResult("wrong"); handleTimeUp(); }} className="text-muted-foreground mt-2">
            <SkipForward className="w-4 h-4 mr-1" /> Me rindo
          </Button>
        )}

        {isPartyMode && partyRanking.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full mt-6 glass rounded-2xl p-4"
          >
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-bold flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Ranking en Vivo
            </h3>
            <div className="space-y-2">
              {partyRanking.map((p, i) => {
                const isEliminated = specialMode === "survival" && p.lives <= 0;
                return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
                    isPartyMode && partyType === "turns" && currentPlayer?.id === p.id && !roundResult && !isEliminated
                      ? "bg-primary/15 ring-1 ring-primary/40"
                      : "bg-white/5"
                  } ${isEliminated ? 'opacity-40 grayscale' : ''}`}
                >
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                    {isEliminated ? <Skull className="w-4 h-4 text-red-500/80" /> : (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`)}
                  </span>
                  <span className="text-lg">{p.emoji}</span>
                  <span className="flex-1 font-medium text-sm text-foreground truncate">{p.name}</span>
                  
                  {specialMode === "survival" ? (
                    <span className="flex gap-0.5">
                      {Array.from({ length: initialLives }).map((_, idx) => (
                        <Heart key={idx} className={`w-3 h-3 ${idx < p.lives ? "text-red-500 fill-red-500" : "text-white/10"}`} />
                      ))}
                    </span>
                  ) : (
                    <span className="font-display font-bold text-primary text-sm">{p.score}</span>
                  )}
                </div>
              )})}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameInterface;