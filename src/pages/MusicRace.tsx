import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Route, Play, Zap, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GlassCard from "@/components/ui/GlassCard";

const API_BASE_URL = "https://porchify-api.onrender.com";

export interface GameNode {
  id: string;
  name: string;
  cover: string;
  type: "artist" | "track" | "album"; 
  artistName?: string;
}

const MusicRace = () => {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  // Custom mode state
  const [customFrom, setCustomFrom] = useState<GameNode | null>(null);
  const [customTo, setCustomTo] = useState<GameNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"artist" | "track">("artist");
  const [searchResults, setSearchResults] = useState<GameNode[]>([]);
  const [searchingFor, setSearchingFor] = useState<"from" | "to" | null>(null);

  //  MOTOR DE PARTIDA RÁPIDA
  const startRandomRace = async () => {
    setIsSearching(true);
    
    try {
      // 1. El Bombo con Nombres de artistas
      const topArtists = [
        "Rosalía", "AC/DC", "Bad Bunny", "Eminem", "The Weeknd", 
        "Dua Lipa", "Michael Jackson", "Quevedo", "Shakira", "Coldplay", 
        "Drake", "Taylor Swift", "Ed Sheeran", "Rihanna", "David Guetta", 
        "C. Tangana", "Bizarrap", "Miley Cyrus", "Rauw Alejandro", "Gorillaz",
        "Daft Punk", "Billie Eilish", "Kanye West", "Beyoncé", "Justin Bieber",
        "J Balvin", "Feid", "Morad", "Aitana", "Estopa", "Queen", "Nirvana"
      ];
      
      // 2. Sacamos dos del bombo
      const shuffled = topArtists.sort(() => 0.5 - Math.random());
      const artist1 = shuffled[0];
      const artist2 = shuffled[1];

      // 3. Buscamos sus perfiles exactos en la API
      const [res1, res2] = await Promise.all([
        fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(artist1)}&type=artist`),
        fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(artist2)}&type=artist`)
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      // 4. Nos quedamos con el resultado #1 de cada búsqueda (el artista oficial)
      if (data1.length > 0 && data2.length > 0) {
        const node1 = data1[0];
        const node2 = data2[0];

        navigate("/music-race-game", { 
          state: { fromNode: node1, toNode: node2 } 
        });
      } else {
        throw new Error("No se encontraron los artistas en Deezer");
      }
    } catch (err) {
      console.error("Error al generar carrera aleatoria:", err);
      // Si falla, abrimos el modal para que el usuario elija
      setIsSearching(false);
      setIsCustomModalOpen(true);
    }
  };

  const startCustomRace = () => {
    if (customFrom && customTo) {
      navigate("/music-race-game", { state: { fromNode: customFrom, toNode: customTo } });
    }
  };

  const searchEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Error buscando:", err);
    }
  };

  const selectNode = (node: GameNode) => {
    if (searchingFor === "from") setCustomFrom(node);
    if (searchingFor === "to") setCustomTo(node);
    setSearchQuery("");
    setSearchResults([]);
    setSearchingFor(null);
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-blue-500 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-purple-500 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-white rounded-full bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Route className="text-blue-400 w-8 h-8" />
            Music Race
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-4 text-white">
            Conecta los <span className="text-blue-400 text-glow-blue">Puntos</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Empieza en una canción o artista y salta a través de sus conexiones hasta llegar al destino.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <GlassCard 
              className={`p-8 border-blue-500/30 hover:border-blue-500/60 transition-colors cursor-pointer group ${isSearching ? 'opacity-80 pointer-events-none' : ''}`} 
              onClick={startRandomRace}
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.3)] relative">
                <Zap className={`w-8 h-8 text-blue-400 ${isSearching ? 'animate-pulse' : ''}`} />
                {isSearching && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Partida Rápida</h3>
              <p className="text-zinc-400 mb-6">El sistema emparejará dos artistas aleatorios. Desde leyendas del rock hasta el top de Spotify España.</p>
              <Button disabled={isSearching} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-12 text-lg transition-all">
                {isSearching ? "Buscando oponentes..." : "Empezar Reto"}
              </Button>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <GlassCard className="p-8 border-purple-500/30 hover:border-purple-500/60 transition-colors cursor-pointer group" onClick={() => setIsCustomModalOpen(true)}>
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Play className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Reto Personalizado</h3>
              <p className="text-zinc-400 mb-6">Elige de quién quieres salir (artista o canción) y a quién quieres llegar para un reto a tu medida.</p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-lg">
                Configurar Carrera
              </Button>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isCustomModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Carrera Personalizada</h3>
                <button onClick={() => setIsCustomModalOpen(false)} className="text-zinc-400 hover:text-white bg-white/5 rounded-full p-2 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {!searchingFor ? (
                <div className="space-y-4">
                  <GlassCard className="p-4 cursor-pointer hover:bg-white/5 border-white/10 transition-colors" onClick={() => setSearchingFor("from")}>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">Punto de Origen</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                        {customFrom?.cover ? <img src={customFrom.cover} className="w-full h-full object-cover" /> : <Search className="w-5 h-5 text-zinc-500 m-auto mt-3" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-lg text-white font-bold block">{customFrom ? customFrom.name : "Seleccionar origen..."}</span>
                        {customFrom?.type === 'track' && <span className="text-xs text-zinc-400">{customFrom.artistName}</span>}
                      </div>
                    </div>
                  </GlassCard>

                  <div className="flex justify-center py-2"><Route className="text-zinc-600 w-6 h-6 rotate-90" /></div>

                  <GlassCard className="p-4 cursor-pointer hover:bg-white/5 border-white/10 transition-colors" onClick={() => setSearchingFor("to")}>
                    <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2">Destino (Meta)</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                        {customTo?.cover ? <img src={customTo.cover} className="w-full h-full object-cover" /> : <Search className="w-5 h-5 text-zinc-500 m-auto mt-3" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-lg text-white font-bold block">{customTo ? customTo.name : "Seleccionar destino..."}</span>
                        {customTo?.type === 'track' && <span className="text-xs text-zinc-400">{customTo.artistName}</span>}
                      </div>
                    </div>
                  </GlassCard>

                  <Button onClick={startCustomRace} disabled={!customFrom || !customTo} className="w-full mt-6 h-14 text-lg font-bold bg-primary hover:bg-primary/80 transition-colors">
                    Empezar Carrera
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setSearchingFor(null)} className="text-zinc-400 hover:text-white hover:bg-white/10"><ArrowLeft className="w-5 h-5"/></Button>
                    <h4 className="text-lg text-white font-bold">Buscar {searchingFor === "from" ? "Origen" : "Destino"}</h4>
                  </div>
                  
                  <div className="flex gap-2 p-1 bg-black/50 rounded-lg mb-4 border border-white/5">
                    <button onClick={() => setSearchType("artist")} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${searchType === "artist" ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>Artista</button>
                    <button onClick={() => setSearchType("track")} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${searchType === "track" ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>Canción</button>
                  </div>

                  <form onSubmit={searchEntity} className="flex gap-2">
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Buscar ${searchType === 'artist' ? 'artista' : 'canción'}...`} className="bg-black/50 border-white/20 h-12 text-white placeholder:text-zinc-600" autoFocus />
                    <Button type="submit" className="h-12 bg-white/10 hover:bg-white/20 transition-colors"><Search className="w-5 h-5"/></Button>
                  </form>

                  <div className="max-h-64 overflow-y-auto space-y-2 mt-4 pr-2 custom-scrollbar">
                    {searchResults.map(node => (
                      <div key={node.id} onClick={() => selectNode(node)} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-white/10">
                        <img src={node.cover} className={`w-10 h-10 object-cover ${node.type === 'artist' ? 'rounded-full' : 'rounded-md shadow-md'}`} />
                        <div>
                          <p className="text-white font-bold truncate max-w-[280px]">{node.name}</p>
                          {node.type === 'track' && <p className="text-xs text-zinc-400 truncate max-w-[280px]">{node.artistName}</p>}
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && searchQuery && (
                      <p className="text-center text-zinc-500 mt-8 text-sm">Busca un artista o canción para empezar</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicRace;