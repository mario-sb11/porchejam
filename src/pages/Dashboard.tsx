import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Music2, Radio, Play, Route, Disc3, Globe } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import PlayerAvatar from "@/components/PlayerAvatar";
import { randomAvatar } from "@/lib/avatars";
import { updateAvatar } from "@/lib/cloud";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { arenaAvailable } from "@/lib/supabase";

/** Las tarjetas que actúan como botón también responden a Intro y Espacio. */
const activateWith = (action: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: action,
  onKeyDown: (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  },
});


const Dashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Invitado");
  const [currentAvatar, setCurrentAvatar] = useState("default");

  // --- LÓGICA DEL MAPACHE INTERACTIVO ---
  const [mascotMessage, setMascotMessage] = useState("");
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const [discoTrackName, setDiscoTrackName] = useState("");
  
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MASCOT_PHRASES = [
    "¡No me toques los bigotes!",
    "¿Has visto mis gafas de sol?",
    "El porche mola, pero mi techno más.",
    "¡Dale al play, no te quedes ahí parado!",
    "¿Sabías que los mapaches no duermen si hay buen ritmo?",
    "Esa última canción era de relleno, admítelo.",
    "Si pierdes, no culpes al lag.",
    "Déjate de historias y pon Breakbeat Andaluz."
  ];

  // Calculamos partículas de fondo para el modo disco, con posiciones, tamaños y emojis aleatorios.
  const partyEmojis = ['🚀', '👽', '😎', '🦝', '🎊', '✨', '🪩', '⚡️', '🎶'];
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      emoji: partyEmojis[Math.floor(Math.random() * partyEmojis.length)],
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 100}vh`,
      fontSize: `${Math.random() * 2 + 1.5}rem`, // Tamaños variados
      duration: Math.random() * 4 + 2, // Velocidad de flote variada
      delay: Math.random() * 2,
    }));
  }, []); // El useMemo evita que cambien de sitio si el componente se actualiza

  useEffect(() => {
    const savedUsername = localStorage.getItem("porchejam_username");
    if (!savedUsername?.trim()) {
      navigate("/");
      return;
    }
    setUsername(savedUsername.trim());

    const savedAvatar = localStorage.getItem("porchejam_avatar");
    if (savedAvatar) setCurrentAvatar(savedAvatar);

    return () => stopDisco();
  }, [navigate]);

  // Avatar fijo: un invitado con el antiguo avatar "por defecto" (que cambiaba con el nombre)
  // recibe un personaje aleatorio que ya no cambia. Con cuenta lo hace la sincronización.
  const { session, loading: authLoading } = useAuth();
  useEffect(() => {
    if (authLoading || session) return;
    const savedAvatar = localStorage.getItem("porchejam_avatar");
    if (!savedAvatar || savedAvatar === "default") {
      const fresh = randomAvatar();
      setCurrentAvatar(fresh);
      void updateAvatar(fresh);
    }
  }, [authLoading, session]);

  const triggerMessage = () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    
    let newPhrase;
    do {
      newPhrase = MASCOT_PHRASES[Math.floor(Math.random() * MASCOT_PHRASES.length)];
    } while (newPhrase === mascotMessage);
    
    setMascotMessage(newPhrase);
    messageTimeoutRef.current = setTimeout(() => setMascotMessage(""), 3000);
  };

  const startDiscoMode = async () => {
    if (isDiscoMode) return;
    setIsDiscoMode(true);
    setMascotMessage(""); 

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    try {
      const genres = ["Techno Hard", "Dubstep", "Breakbeat Andaluz"];
      const randomGenre = genres[Math.floor(Math.random() * genres.length)];
      
      setDiscoTrackName(`Buscando ${randomGenre} en la maleta...`);

      const searchRes = await fetch(apiUrl("search", { q: randomGenre, type: "playlist" }));
      const searchData = await searchRes.json();
      
      if (searchData && searchData.length > 0) {
        const randomPlaylist = searchData[Math.floor(Math.random() * Math.min(5, searchData.length))];
        
        const tracksRes = await fetch(apiUrl("tracks", { id: randomPlaylist.id, type: "playlist", index: 0 }));
        const tracksData = await tracksRes.json();
        
        if (tracksData.tracks && tracksData.tracks.length > 0) {
          const track = tracksData.tracks[Math.floor(Math.random() * tracksData.tracks.length)];
          
          setDiscoTrackName(`[${randomGenre}] ${track.name} - ${track.artist}`);
          audioRef.current.src = track.previewUrl;
          audioRef.current.loop = true;
          audioRef.current.volume = 0.8;
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Navegador bloqueó el autoplay:", error);
              setDiscoTrackName("🎧 Navegador bloqueó audio. ¡Toca la pantalla de nuevo!");
            });
          }
          return; 
        }
      }
      
      setDiscoTrackName(`El DJ no encontró pista de ${randomGenre} :(`);
      
    } catch (err) {
      console.error("Error montando la rave:", err);
      setDiscoTrackName("La mesa de mezclas se ha desconectado");
    }
  };

  const stopDisco = () => {
    setIsDiscoMode(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handlePressStart = () => {
    if (isDiscoMode) return;
    pressTimerRef.current = setTimeout(() => {
      startDiscoMode();
    }, 600);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isDiscoMode) {
      triggerMessage();
    }
  };

  const renderHeaderAvatar = () => (
    <PlayerAvatar avatar={currentAvatar} name={username} className="h-12 w-12 md:h-14 md:w-14 text-xl md:text-2xl" />
  );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 px-4 py-8 overflow-hidden relative ${isDiscoMode ? "bg-black" : "gradient-bg"}`}>
      
      {/* --- OVERLAY MODO DISCO (EASTER EGG) --- */}
      <AnimatePresence>
        {isDiscoMode && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden"
            onClick={stopDisco}
          >
            {/* EMOJIS FLOTANTES GENERADOS POR CÓDIGO */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute pointer-events-none drop-shadow-lg z-0"
                style={{ left: p.left, top: p.top, fontSize: p.fontSize }}
                animate={{
                  y: [0, -40, 40, 0],
                  x: [0, 30, -30, 0],
                  rotate: [0, 180, 360],
                  scale: [1, 1.3, 0.8, 1]
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut"
                }}
              >
                {p.emoji}
              </motion.div>
            ))}

            {/* Luces de Rave */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen z-0">
               <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600 blur-[150px] rounded-full" />
               <motion.div animate={{ rotate: -360, scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-500 blur-[150px] rounded-full" />
            </div>

            <motion.div 
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] }}
              transition={{ repeat: Infinity, duration: 0.4 }} 
              className="relative w-72 h-72 md:w-96 md:h-96 rounded-full border-4 border-primary shadow-[0_0_80px_rgba(34,197,94,0.6)] overflow-hidden bg-black z-10 cursor-pointer"
            >
              <video 
                src="/animacionbailemapache.mp4" 
                autoPlay loop muted playsInline
                className="w-[150%] h-[150%] object-cover hue-rotate-90 saturate-200"
                style={{ mixBlendMode: 'screen' }} 
              />
            </motion.div>
            
            <motion.h2 
              animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.3 }}
              className="mt-8 text-4xl md:text-6xl font-black text-primary tracking-tighter text-glow-green uppercase text-center z-10 relative"
            >
              ¡PORCHE RAVE!
            </motion.h2>
            
            <div className="mt-4 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 z-10 relative backdrop-blur-md">
              <Disc3 className="w-4 h-4 text-primary animate-spin" />
              <p className="text-white/80 text-sm font-bold truncate max-w-[200px] md:max-w-md">
                {discoTrackName || "Buscando temazo en Deezer..."}
              </p>
            </div>

            <p className="text-white/40 mt-8 font-bold uppercase tracking-widest text-xs z-10 relative">Toca la pantalla para parar</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partículas de fondo sutiles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-primary blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-secondary blur-[150px] rounded-full" />
      </div>

      <div className="mx-auto max-w-4xl relative z-10">
        
{/* HEADER & MASCOTA */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="shrink-0">
              <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight">
                <span className="text-primary text-glow-green">Porche</span>
                <span className="text-secondary text-glow-purple">Jam</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
                ¿Qué pasa, <span className="text-white">{username}</span>?
              </p>
            </div>
            
            {/* --- CONTENEDOR DE LA MASCOTA ANIMADA (REPOSO) --- */}
            {/* Quitamos el "hidden". Ahora es siempre "flex", pero escala su tamaño */}
            <div className="flex relative group ml-2 sm:ml-4 items-center">
              <motion.div 
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                
                // móvil (w-16), Tablet (w-28), PC (w-32)
                className="w-16 h-16 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-primary/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] relative bg-black flex items-center justify-center shrink-0 z-10 cursor-pointer select-none"
              >
                <video 
                  src="/mapacheanimacion.mp4" 
                  autoPlay loop muted playsInline
                  className="w-[150%] h-[150%] object-cover pointer-events-none" 
                  style={{ mixBlendMode: 'screen' }} 
                />
              </motion.div>

              {/* BOCADILLO DE TEXTO */}
              <AnimatePresence>
                {mascotMessage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    // En móvil el texto es más pequeño y con menos padding para que no se salga de la pantalla
                    className="absolute left-full ml-2 sm:ml-4 top-0 sm:top-4 whitespace-nowrap bg-secondary text-white text-[10px] sm:text-[13px] font-bold px-2 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl rounded-tl-none shadow-xl border border-white/20 z-20 pointer-events-none origin-left"
                  >
                    {mascotMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className="rounded-full border-2 border-primary/40 p-0.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-transform hover:scale-105 hover:border-primary shrink-0 ml-2"
          >
            {renderHeaderAvatar()}
          </button>
        </header>

        {/* REJILLA DE MODOS DE JUEGO */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* MODO PRINCIPAL: JAM SESSION */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <GlassCard
              className="group relative overflow-hidden p-8 md:p-12 border-primary/40 bg-gradient-to-br from-primary/20 via-background to-secondary/10 cursor-pointer hover:border-primary transition-all duration-300"
              {...activateWith(() => navigate("/playlists"))}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
                <Radio className="w-48 h-48" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <p className="text-xs uppercase tracking-widest text-primary font-bold">Modo Principal</p>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-display font-black text-white flex items-center gap-3">
                    Jam Session
                  </h2>
                  <p className="mt-3 text-zinc-400 text-lg max-w-md">
                    Elige tus artistas, playlists o géneros y demuestra quién manda en el porche.
                  </p>
                </div>

                <div className="flex-shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-110 group-hover:bg-white group-hover:text-primary transition-all">
                  <Play className="w-8 h-8 md:w-10 md:h-10 ml-2" fill="currentColor" />
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* MODO: CANCIÓN DEL DÍA */}
          <motion.div variants={itemVariants}>
            <GlassCard
              className="h-full p-6 md:p-8 flex flex-col justify-between border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent cursor-pointer hover:border-secondary/60 transition-colors"
              {...activateWith(() => navigate("/cancion-del-dia"))}
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-secondary/20 text-secondary"><Music2 className="h-6 w-6" /></div>
                  <span className="flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-[10px] uppercase font-bold text-secondary border border-secondary/30">
                    Nuevo
                  </span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">Daily Track</h3>
                <p className="text-sm text-zinc-400">La misma canción para todos cada día. 6 intentos, 5 categorías. ¿Mantienes la racha?</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* MODO: MUSIC RACE */}
          <motion.div variants={itemVariants}>
            <GlassCard 
              className="h-full p-6 md:p-8 flex flex-col justify-between border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent cursor-pointer hover:border-blue-500/60 transition-colors"
              {...activateWith(() => navigate("/music-race"))}
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Route className="h-6 w-6" /></div>
                  <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] uppercase font-bold text-blue-300 border border-blue-500/30">
                    Nuevo
                  </span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">Music Race</h3>
                <p className="text-sm text-zinc-400">De Rosalía a AC/DC saltando por colaboraciones. El laberinto musical definitivo.</p>
              </div>
            </GlassCard>
          </motion.div>
          {/* MODO: ARENA ONLINE */}
          {arenaAvailable && (
            <motion.div variants={itemVariants} className="md:col-span-2">
              <GlassCard
                className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent cursor-pointer hover:border-accent/60 transition-colors"
                {...activateWith(() => navigate("/arena"))}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-accent/20 text-accent"><Globe className="h-6 w-6" /></div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-white mb-1">Arena Online</h3>
                    <p className="text-sm text-zinc-400">Cada uno desde su móvil y la misma canción a la vez. Únete con un código o crea tu sala.</p>
                  </div>
                </div>
                <span className="self-start sm:self-center rounded-full bg-accent/20 px-3 py-1 text-[10px] uppercase font-bold text-accent border border-accent/30">Nuevo</span>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;