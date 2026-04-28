import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, ListMusic, Eye, Play, Pause, ChevronDown, Loader2, User as UserIcon, Disc3, Trophy, History, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Playlist {
  id: string;
  name: string;
  cover: string;
  songCount: number | string;
  type: "playlist" | "artist" | "album";
}

interface TrackPreview {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  cover: string;
}

const formatTime = (timeInSeconds: number) => {
  const seconds = Math.max(0, Math.floor(timeInSeconds));
  return `0:${seconds < 10 ? '0' : ''}${seconds}`;
};

const API_BASE_URL = import.meta.env.DEV ? "/api" : "https://porchify-api.onrender.com/api";

const PlaylistSelection = () => {
  const navigate = useNavigate();
  
  // TABS Y BÚSQUEDA
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tops" | "artists" | "playlists">("tops");
  const [isSearching, setIsSearching] = useState(false);

  // DATOS Y RECIENTES
  const [topPlaylists, setTopPlaylists] = useState<Playlist[]>([]);
  const [searchResults, setSearchResults] = useState<Playlist[]>([]);
  const [recentArtists, setRecentArtists] = useState<Playlist[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<Playlist[]>([]);
  
  // MULTI-SELECCIÓN GLOBAL (El carrito de Mix-Tape)
  const [selectedItems, setSelectedItems] = useState<Playlist[]>([]);
  
  // VISTA PREVIA Y PAGINACIÓN
  const [previewItem, setPreviewItem] = useState<Playlist | null>(null);
  const [previewTracks, setPreviewTracks] = useState<TrackPreview[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
  const [nextTrackIndex, setNextTrackIndex] = useState<number | null>(null);
  
  // MOTOR DE AUDIO
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const duration = 30; 
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // CARGAR HISTORIAL AL INICIAR
  useEffect(() => {
    const savedArtists = JSON.parse(localStorage.getItem("porchejam_recent_artists") || "[]");
    const savedPlaylists = JSON.parse(localStorage.getItem("porchejam_recent_playlists") || "[]");
    setRecentArtists(savedArtists);
    setRecentPlaylists(savedPlaylists);
  }, []);

  // CARGAR TOP GLOBAL AL INICIAR
  useEffect(() => {
    const loadTopPlaylists = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/top-playlists`);
        if (res.ok) {
          const data = await res.json();
          setTopPlaylists(data);
        }
      } catch (error) {
        console.error("Error cargando tops:", error);
      } finally {
        setIsSearching(false);
      }
    };
    if (activeTab === "tops" && !searchQuery) loadTopPlaylists();
  }, [activeTab, searchQuery]);

  // FUNCIÓN: GUARDAR EN HISTORIAL
  const saveToHistory = (item: Playlist) => {
    const key = item.type === "artist" ? "porchejam_recent_artists" : "porchejam_recent_playlists";
    let history = JSON.parse(localStorage.getItem(key) || "[]");
    history = history.filter((h: Playlist) => h.id !== item.id);
    history.unshift(item);
    if (history.length > 8) history.pop(); 
    
    localStorage.setItem(key, JSON.stringify(history));
    if (item.type === "artist") setRecentArtists(history);
    else setRecentPlaylists(history);
  };

  // FUNCIÓN: BUSCAR
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
    }
    setIsSearching(true);
    try {
      const typeParam = activeTab === "artists" ? "artist" : "playlist";
      const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&type=${typeParam}`);
      if (res.ok) setSearchResults(await res.json());
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // FUNCIÓN: CARGAR CANCIONES (Primera página)
  useEffect(() => {
    if (!previewItem) {
      setPreviewTracks([]);
      setNextTrackIndex(null);
      stopAudio();
      return;
    }
    saveToHistory(previewItem);

    const fetchTracks = async () => {
      setLoadingTracks(true);
      try {
        const res = await fetch(`${API_BASE_URL}/tracks?id=${previewItem.id}&type=${previewItem.type}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewTracks(data.tracks);
          setNextTrackIndex(data.nextIndex);
        }
      } catch (error) {
        console.error("Error cargando tracks:", error);
      } finally {
        setLoadingTracks(false);
      }
    };
    fetchTracks();
  }, [previewItem]);

  // FUNCIÓN: CARGAR MÁS CANCIONES (Paginación)
  const loadMoreTracks = async () => {
    if (!previewItem || nextTrackIndex === null) return;
    setLoadingMoreTracks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tracks?id=${previewItem.id}&type=${previewItem.type}&index=${nextTrackIndex}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewTracks(prev => [...prev, ...data.tracks]);
        setNextTrackIndex(data.nextIndex);
      }
    } catch (error) {
      console.error("Error cargando más tracks:", error);
    } finally {
      setLoadingMoreTracks(false);
    }
  };

  // MOTOR DE AUDIO
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingTrackId(null);
    setCurrentTime(0);
  };

  const togglePlay = (track: TrackPreview) => {
    if (playingTrackId === track.id) {
      stopAudio();
      return;
    }
    stopAudio();
    if (!track.previewUrl) return alert("No hay preview disponible.");

    setLoadingAudioId(track.id);
    const newAudio = new Audio(track.previewUrl);
    newAudio.volume = 0.5;
    newAudio.ontimeupdate = () => setCurrentTime(newAudio.currentTime);
    newAudio.onended = () => stopAudio();
    newAudio.onloadeddata = () => setLoadingAudioId(null);
    newAudio.play();
    audioRef.current = newAudio;
    setPlayingTrackId(track.id);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  // SELECCIÓN MÚLTIPLE GLOBAL (Permitido para artistas y listas)
  const toggleSelection = (item: Playlist) => {
    const isSelected = selectedItems.find(i => i.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
    saveToHistory(item);
  };

  const handleContinue = () => {
    if (selectedItems.length === 0) return;

    if (selectedItems.length === 1) {
      // Partida Normal
      localStorage.setItem("porchify_selected_playlist", selectedItems[0].id);
      localStorage.setItem("porchify_selected_playlist_name", selectedItems[0].name);
      localStorage.setItem("porchify_selected_type", selectedItems[0].type);
    } else {
      // MIX-TAPE GLOBAL
      const ids = selectedItems.map(i => i.id).join(",");
      const names = selectedItems.map(i => i.name).join(" + ");
      localStorage.setItem("porchify_selected_playlist", ids);
      localStorage.setItem("porchify_selected_playlist_name", `Mix: ${names}`);
      localStorage.setItem("porchify_selected_type", "mix");
      // Guardamos el objeto entero por si el motor de juego necesita saber qué es artista y qué es lista
      localStorage.setItem("porchify_mix_items", JSON.stringify(selectedItems)); 
    }
    navigate("/modes");
  };

  // RENDERIZADOR DE CUADRÍCULAS
  const renderGrid = (items: Playlist[], emptyMessage: string, title?: string, icon?: any) => {
    if (items.length === 0 && !isSearching) {
       return (
         <div className="flex flex-col items-center justify-center py-10 opacity-50">
           <ListMusic className="w-12 h-12 mb-4" />
           <p className="text-center">{emptyMessage}</p>
         </div>
       );
    }

    return (
      <div className="mb-8">
        {title && (
          <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2 text-primary">
            {icon} {title}
          </h2>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item, i) => {
            const isSelected = !!selectedItems.find(s => s.id === item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl p-4 group relative overflow-hidden transition-all duration-300 cursor-pointer ${
                  isSelected ? "border-2 border-primary bg-primary/10" : "border-2 border-transparent hover:border-primary/40"
                }`}
                onClick={() => toggleSelection(item)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-black w-6 h-6 rounded-full flex items-center justify-center font-bold z-10 text-xs">
                    ✓
                  </div>
                )}
                <div className={`aspect-square bg-muted/30 flex items-center justify-center text-5xl mb-3 overflow-hidden group-hover:scale-105 transition-transform duration-300 ${item.type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                  {item.cover.startsWith("http") ? (
                    <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{item.cover}</span>
                  )}
                </div>
                <h3 className="font-display font-bold text-foreground text-sm truncate text-center">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex justify-center items-center gap-1">
                  {item.type === 'artist' ? <UserIcon className="w-3 h-3" /> : <Disc3 className="w-3 h-3" />}
                  {item.type === 'artist' ? 'Artista' : `${item.songCount} canciones`}
                </p>
                
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full bg-secondary/80 hover:bg-secondary text-foreground text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Ver Canciones
                    </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 pb-32">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Elige tu Escenario</h1>
            <p className="text-muted-foreground mt-1">Combina artistas o listas libremente para jugar.</p>
          </div>
        </motion.div>

        {/* TABS (Secciones) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button 
              variant={activeTab === "tops" ? "default" : "outline"} 
              className={`rounded-full ${activeTab === "tops" ? "bg-primary text-black font-bold" : "glass"}`}
              onClick={() => { setActiveTab("tops"); setSearchQuery(""); }}
            >
              <Trophy className="w-4 h-4 mr-2" /> Top Global
            </Button>
            <Button 
              variant={activeTab === "artists" ? "default" : "outline"} 
              className={`rounded-full ${activeTab === "artists" ? "bg-primary text-black font-bold" : "glass"}`}
              onClick={() => { setActiveTab("artists"); setSearchResults([]); }}
            >
              <UserIcon className="w-4 h-4 mr-2" /> Artistas
            </Button>
            <Button 
              variant={activeTab === "playlists" ? "default" : "outline"} 
              className={`rounded-full ${activeTab === "playlists" ? "bg-primary text-black font-bold" : "glass"}`}
              onClick={() => { setActiveTab("playlists"); setSearchResults([]); }}
            >
              <ListMusic className="w-4 h-4 mr-2" /> Playlists
            </Button>
        </div>

        {/* BUSCADOR */}
        {activeTab !== "tops" && (
          <form onSubmit={handleSearch} className="mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'artists' ? 'Busca artistas para añadir a tu mix...' : 'Busca listas de reproducción...'}
                  className="pl-11 h-12 rounded-xl glass border-border bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full"
                />
              </div>
              <Button type="submit" className="h-12 px-6 rounded-xl bg-primary text-black font-bold shadow-lg">
                Buscar
              </Button>
            </motion.div>
          </form>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {isSearching ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 space-y-3">
                <Skeleton className={`aspect-square bg-muted ${activeTab === 'artists' ? 'rounded-full' : 'rounded-xl'}`} />
                <Skeleton className="h-4 w-3/4 mx-auto bg-muted" />
              </div>
            ))}
          </div>
        ) : (
           <>
             {activeTab === "tops" && renderGrid(topPlaylists, "Cargando listas recomendadas...")}
             
             {activeTab === "artists" && !searchQuery && recentArtists.length > 0 && 
                renderGrid(recentArtists, "", "Artistas Recientes", <History className="w-5 h-5" />)
             }
             {activeTab === "artists" && (searchQuery || recentArtists.length === 0) && 
                renderGrid(searchResults, "Usa el buscador para crear tu batalla musical.")
             }

             {activeTab === "playlists" && !searchQuery && recentPlaylists.length > 0 && 
                renderGrid(recentPlaylists, "", "Playlists Recientes", <History className="w-5 h-5" />)
             }
             {activeTab === "playlists" && (searchQuery || recentPlaylists.length === 0) && 
                renderGrid(searchResults, "Escribe el nombre de una playlist (ej. Verano 2026).")
             }
           </>
        )}

      </div>

      {/* OVERLAY DE VISTA PREVIA (Tracks Modal) */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden"
          >
             <div className="relative h-64 md:h-80 w-full flex-shrink-0">
               <div className="absolute inset-0 overflow-hidden">
                 {previewItem.cover.startsWith("http") ? (
                   <img src={previewItem.cover} alt="Bg" className="w-full h-full object-cover blur-3xl opacity-30 scale-110" />
                 ) : (
                   <div className="w-full h-full bg-primary/20 blur-3xl opacity-30" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
               </div>

               <div className="absolute inset-0 flex flex-col p-6 md:p-10 max-w-5xl mx-auto w-full">
                 <Button 
                   variant="ghost" 
                   onClick={() => setPreviewItem(null)} 
                   className="self-start mb-auto text-foreground/80 hover:bg-white/10 rounded-full"
                 >
                   <ChevronDown className="w-6 h-6 mr-2" /> Volver
                 </Button>

                 <div className="flex items-end gap-6 mt-auto">
                   <div className={`w-32 h-32 md:w-48 md:h-48 bg-muted shadow-2xl flex-shrink-0 flex items-center justify-center text-6xl overflow-hidden border border-white/10 ${previewItem.type === 'artist' ? 'rounded-full' : 'rounded-2xl'}`}>
                     {previewItem.cover.startsWith("http") ? (
                       <img src={previewItem.cover} alt="Cover" className="w-full h-full object-cover" />
                     ) : (
                       <span>{previewItem.cover}</span>
                     )}
                   </div>
                   <div className="pb-2">
                     <p className="text-sm font-bold tracking-widest uppercase text-primary mb-2">
                       {previewItem.type === 'artist' ? 'Artista' : 'Playlist'}
                     </p>
                     <h2 className="text-4xl md:text-6xl font-display font-black text-foreground mb-4 line-clamp-2">
                       {previewItem.name}
                     </h2>
                     <Button 
                       size="sm"
                       className="bg-primary text-black font-bold px-6 rounded-full"
                       onClick={() => {
                         toggleSelection(previewItem);
                         setPreviewItem(null);
                       }}
                     >
                       {selectedItems.find(i => i.id === previewItem.id) ? "Quitar Selección" : "Añadir al Mix"}
                     </Button>
                   </div>
                 </div>
               </div>
             </div>

             <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-32 pt-8">
               <div className="max-w-5xl mx-auto space-y-2">
                 {loadingTracks ? (
                   <div className="flex flex-col items-center justify-center py-20 opacity-50">
                     <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                     <p>Desempolvando los discos...</p>
                   </div>
                 ) : (
                   <>
                     {previewTracks.map((track, i) => {
                       const isPlaying = playingTrackId === track.id;
                       const isLoading = loadingAudioId === track.id;

                       return (
                         <div key={`${track.id}-${i}`} className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 rounded-xl transition-colors ${isPlaying ? "bg-white/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"}`}>
                           <div className="w-10 text-center font-medium text-foreground/50">{i + 1}</div>
                           
                           <div className="flex items-center gap-3 min-w-0">
                             <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => togglePlay(track)}>
                                <img src={track.cover} alt="cover" className={`w-full h-full object-cover ${isPlaying ? 'opacity-50' : ''}`} />
                             </div>
                             <div className="min-w-0 flex-1">
                               <p className={`text-base font-medium truncate ${isPlaying ? "text-primary" : "text-foreground"}`}>{track.name}</p>
                               <p className="text-sm text-foreground/60 truncate">{track.artist}</p>
                               {isPlaying && (
                                 <div className="h-1.5 w-full max-w-xs bg-black/20 rounded-full mt-2 overflow-hidden">
                                   <div className="h-full bg-primary" style={{ width: `${(currentTime / duration) * 100}%` }} />
                                 </div>
                               )}
                             </div>
                           </div>

                           <div className="text-right">
                             <button onClick={() => togglePlay(track)} disabled={isLoading} className={`text-xs px-4 py-2 rounded-full font-bold transition-colors ${isPlaying ? 'bg-primary text-black' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                               {isLoading ? "..." : isPlaying ? formatTime(duration - currentTime) : "Play"}
                             </button>
                           </div>
                         </div>
                       );
                     })}
                     
                     {/* BOTÓN CARGAR MÁS */}
                     {nextTrackIndex && (
                       <div className="flex justify-center pt-8 pb-4">
                         <Button 
                           variant="outline" 
                           className="glass border-primary/20 text-foreground hover:bg-primary/10 rounded-full px-8"
                           onClick={loadMoreTracks}
                           disabled={loadingMoreTracks}
                         >
                           {loadingMoreTracks ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Cargar más canciones"}
                         </Button>
                       </div>
                     )}
                   </>
                 )}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRA DE SELECCIÓN FLOTANTE (Mix-Tape / Batalla) */}
      <AnimatePresence>
        {selectedItems.length > 0 && !previewItem && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 z-40 p-4">
            <div className="max-w-5xl mx-auto glass-strong border border-primary/30 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(30,215,96,0.2)]">
              <div className="flex items-center gap-4 flex-1 w-full">
                <div className="hidden sm:flex -space-x-3">
                  {selectedItems.slice(0, 3).map(item => (
                    <img key={item.id} src={item.cover} className={`w-10 h-10 rounded-full border-2 border-black object-cover ${item.type === 'playlist' ? 'rounded-md' : ''}`} />
                  ))}
                  {selectedItems.length > 3 && (
                    <div className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-xs font-bold z-10">
                      +{selectedItems.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-center md:text-left">
                  {selectedItems.length === 1 ? (
                    <p className="font-bold truncate text-lg">Jugar con: <span className="text-primary">{selectedItems[0].name}</span></p>
                  ) : (
                    <>
                      <p className="font-bold flex items-center justify-center md:justify-start gap-2 text-primary">
                        <Layers className="w-4 h-4" /> Mix Musical ({selectedItems.length} seleccionados)
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-sm">
                        {selectedItems.map(i => i.name).join(" + ")}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Button size="lg" onClick={handleContinue} className="w-full md:w-auto rounded-full bg-primary text-black font-black px-10 text-lg hover:scale-105 transition-transform">
                ¡EMPEZAR!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlaylistSelection;