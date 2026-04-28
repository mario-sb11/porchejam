import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Clock, Route, Disc, Users, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import { GameNode } from "./MusicRace";

const API_BASE_URL = "https://porchify-api.onrender.com";

interface ConnectionGroup {
  title: string;
  items: GameNode[];
}

const MusicRaceGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // anticrasheos: Si no hay datos, te echa fuera amablemente
  const state = location.state as { fromNode?: GameNode, toNode?: GameNode } | null;

  useEffect(() => {
    if (!state || !state.fromNode || !state.toNode) {
      navigate("/music-race");
    }
  }, [state, navigate]);

  const [currentNode, setCurrentNode] = useState<GameNode | null>(state?.fromNode || null);
  const [path, setPath] = useState<GameNode[]>(state?.fromNode ? [state.fromNode] : []);
  const [connectionGroups, setConnectionGroups] = useState<ConnectionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [jumps, setJumps] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);

  useEffect(() => {
    if (hasWon) return;
    const timer = setInterval(() => setTimeSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [hasWon]);

  useEffect(() => {
    if (!currentNode || !state?.toNode || hasWon) return;
    
    // Comprobar victoria (Si los IDs coinciden, hemos llegado)
    if (currentNode.id === state.toNode.id) {
      setHasWon(true);
      return;
    }

    const fetchConnections = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/race/connections?id=${currentNode.id}&type=${currentNode.type}`);
        const data = await res.json();
        setConnectionGroups(data.options || []);
      } catch (error) {
        console.error("Error cargando conexiones:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [currentNode, state?.toNode, hasWon]);

  const handleJump = (node: GameNode) => {
    setJumps(prev => prev + 1);
    setPath(prev => [...prev, node]);
    setCurrentNode(node);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Si nos echa el useEffect por falta de datos, evitamos renderizar el resto
  if (!state || !state.fromNode || !state.toNode || !currentNode) return null;

  const { fromNode, toNode } = state;

  if (hasWon) {
    return (
      <div className="min-h-screen gradient-bg px-4 py-8 flex items-center justify-center">
        <GlassCard className="max-w-md w-full p-8 text-center border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-green-400" />
          </motion.div>
          <h2 className="text-4xl font-black text-white mb-2">¡Completado!</h2>
          <p className="text-zinc-400 mb-6">Has conectado <strong>{fromNode.name}</strong> con <strong>{toNode.name}</strong></p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Saltos</p>
              <p className="text-3xl text-white font-black">{jumps}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Tiempo</p>
              <p className="text-3xl text-white font-black">{formatTime(timeSeconds)}</p>
            </div>
          </div>

          <div className="text-left bg-white/5 rounded-xl p-4 mb-8">
            <p className="text-xs text-zinc-500 font-bold mb-3">TU CAMINO:</p>
            <div className="flex flex-wrap gap-2 text-sm text-white">
              {path.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  {p.type === 'track' ? <Music className="w-3 h-3 text-blue-400"/> : <Users className="w-3 h-3 text-purple-400"/>}
                  {p.name} 
                  {i < path.length - 1 && <span className="text-primary mx-2">➔</span>}
                </span>
              ))}
            </div>
          </div>

          <Button onClick={() => navigate("/music-race")} className="w-full bg-primary hover:bg-primary/80 h-14 text-lg font-bold">
            Jugar otra vez
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-6 md:py-8 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* HEADER DE CARRERA */}
        <GlassCard className="p-4 md:p-6 sticky top-4 z-50 border-white/10 shadow-2xl bg-black/80 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Lado izquierdo: Botón volver + Ruta con NOMBRES */}
            <div className="flex items-center w-full lg:w-auto gap-2 md:gap-4 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/music-race")} className="text-zinc-400 hover:text-white shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              {/* Barra rediseñada para mostrar Origen y Destino */}
              <div className="flex items-center gap-2 flex-1 w-full overflow-hidden">
                
                {/* ORIGEN */}
                <div className="flex items-center gap-2 shrink-0">
                  <img src={fromNode.cover} alt="Inicio" className={`w-10 h-10 md:w-12 md:h-12 object-cover ${fromNode.type === 'artist' ? 'rounded-full' : 'rounded'}`} />
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Origen</p>
                    <p className="text-sm font-bold text-zinc-300 truncate max-w-[100px] md:max-w-[150px]">{fromNode.name}</p>
                  </div>
                </div>

                {/* LÍNEA DE CONEXIÓN ANIMADA */}
                <div className="h-1 flex-1 bg-zinc-800 rounded-full mx-1 sm:mx-2 relative min-w-[20px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 animate-pulse"></div>
                </div>

                {/* DESTINO */}
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div>
                    <p className="text-[10px] text-purple-400 uppercase font-bold">Destino</p>
                    {/* Aquí el nombre del destino, SIEMPRE visible */}
                    <p className="text-xs sm:text-sm md:text-base font-black text-white truncate max-w-[100px] sm:max-w-[140px] leading-tight">
                      {toNode.name}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <div className="absolute -inset-2 bg-purple-500/20 rounded-full animate-ping"></div>
                    <img src={toNode.cover} alt="Destino" className={`w-10 h-10 md:w-12 md:h-12 object-cover border-2 border-purple-500 relative z-10 ${toNode.type === 'artist' ? 'rounded-full' : 'rounded'}`} />
                  </div>
                </div>

              </div>
            </div>
            
            {/* Lado derecho: Stats */}
            <div className="flex items-center justify-center w-full lg:w-auto gap-4 md:gap-6 text-sm font-bold bg-white/5 px-4 py-2 md:py-3 rounded-full shrink-0">
              <span className="text-zinc-400 flex items-center gap-1 sm:gap-2"><Route className="w-4 h-4"/> Saltos: <span className="text-white text-base md:text-lg">{jumps}</span></span>
              <span className="text-zinc-400 flex items-center gap-1 sm:gap-2"><Clock className="w-4 h-4"/> <span className="text-white text-base md:text-lg">{formatTime(timeSeconds)}</span></span>
            </div>
          </div>
        </GlassCard>

        {/* NODO ACTUAL */}
        <motion.div key={currentNode.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
          <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
            Estás en {currentNode.type === 'artist' ? 'el Artista' : 'la Canción'}
          </p>
          <div className={`w-32 h-32 md:w-48 md:h-48 mx-auto overflow-hidden mb-4 shadow-[0_0_30px_rgba(255,255,255,0.1)] border-4 border-white/10 ${currentNode.type === 'artist' ? 'rounded-full' : 'rounded-2xl'}`}>
            <img src={currentNode.cover} alt={currentNode.name} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white">{currentNode.name}</h2>
          {currentNode.type === 'track' && <p className="text-xl text-zinc-400 mt-2">{currentNode.artistName}</p>}
        </motion.div>

        {/* PUENTES / SALTOS DISPONIBLES */}
        {isLoading ? (
          <div className="text-zinc-500 text-center py-12">Analizando el algoritmo...</div>
        ) : (
          <div className={`grid gap-8 ${
          connectionGroups.length >= 3 ? 'md:grid-cols-3' : 
          connectionGroups.length === 2 ? 'md:grid-cols-2' : 
            'max-w-2xl mx-auto'
            }`}>
            {connectionGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  {group.title.includes('Canciones') ? <Music className="text-blue-400 w-5 h-5"/> : <Disc className="text-purple-400 w-5 h-5"/>} 
                  {group.title}
                </h3>
                <div className="space-y-3">
                  {group.items.length > 0 ? (
                    group.items.map(item => (
                      <GlassCard 
                        key={item.id} 
                        className="p-3 flex items-center gap-4 cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all group" 
                        onClick={() => handleJump(item)}
                      >
                        <img src={item.cover} className={`w-12 h-12 object-cover ${item.type === 'artist' ? 'rounded-full' : 'rounded'}`} />
                        <div>
                          <p className="text-white font-bold group-hover:text-primary transition-colors">{item.name}</p>
                          {item.type === 'track' && <p className="text-xs text-zinc-400">{item.artistName}</p>}
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <div className="text-zinc-500 text-sm bg-white/5 p-4 rounded-xl">No hay datos disponibles.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicRaceGame;