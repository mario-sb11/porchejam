import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Target, Zap, Flame, Music, LogOut, Edit2, X, User, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlayerAvatar from "@/components/PlayerAvatar";
import AvatarPicker from "@/components/AvatarPicker";
import { readPlayerStats, type PlayerStats } from "@/lib/playerStats";
import { updateAvatar, updateUsername } from "@/lib/cloud";
import { useAuth } from "@/contexts/AuthContext";
import SignInOptions from "@/components/SignInOptions";


const UserProfile = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Cargando...");
  const [currentAvatar, setCurrentAvatar] = useState("default");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => readPlayerStats());
  const { session, profile, accountsEnabled, loading: authLoading, signOut, deleteAccount } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (nameDraft.trim() === username) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const result = await updateUsername(nameDraft);
    setSavingName(false);
    if ("error" in result) {
      setNameError(result.error);
      return;
    }
    setUsername(nameDraft.trim().replace(/\s+/g, " "));
    setEditingName(false);
    setNameError(null);
  };

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

    // Estadísticas reales guardadas por la pantalla de resumen de cada partida
    // (con cuenta, ya sincronizadas desde la nube)
    setPlayerStats(readPlayerStats());
  }, [navigate, profile, authLoading]);

  const gameHistory = playerStats.recentMatches;
  const stats = [
    { icon: Trophy, label: "Partidas", value: String(playerStats.totalGames), color: "text-primary" },
    { icon: Zap, label: "Mejor puntuación", value: playerStats.highScore.toLocaleString("es-ES"), color: "text-secondary" },
    { icon: Target, label: "Aciertos totales", value: String(playerStats.totalCorrect), color: "text-accent" },
    { icon: Music, label: "Modo favorito", value: playerStats.favoriteMode ?? "Ninguno", color: "text-primary" },
    { icon: Flame, label: "Precisión", value: playerStats.accuracy === null ? "—" : `${playerStats.accuracy}%`, color: "text-accent" },
  ];

  const handleLogout = async () => {
    if (session) {
      await signOut(); // también borra el progreso de este navegador
    } else {
      localStorage.removeItem("porchejam_username");
    }
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate("/");
    } catch {
      setDeleteError("No se pudo borrar la cuenta. Inténtalo de nuevo en unos minutos.");
    }
  };

  const selectAvatar = (avatar: string) => {
    setCurrentAvatar(avatar);
    void updateAvatar(avatar);
    setIsAvatarModalOpen(false);
  };

  const renderAvatar = (avatarStr: string, sizeClass = "w-24 h-24 text-5xl") => (
    <PlayerAvatar avatar={avatarStr} name={username} className={`${sizeClass} border-2 border-transparent`} />
  );

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
          
        </motion.div>

        {/* Avatar + name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center mb-10">
          
          {/* Avatar Clickable */}
          <button
            type="button"
            className="relative group mb-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setIsAvatarModalOpen(true)}
            aria-label="Cambiar avatar"
          >
            <div className="transition-transform group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-full">
              {renderAvatar(currentAvatar)}
            </div>
            <div className="absolute bottom-0 right-0 bg-secondary rounded-full p-1.5 border border-black shadow-lg z-10">
              <Edit2 className="w-4 h-4 text-white" />
            </div>
          </button>

          {editingName ? (
            <form onSubmit={saveName} className="flex flex-col items-center gap-2 w-full max-w-xs">
              <div className="flex gap-2 w-full">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={20}
                  autoFocus
                  aria-label="Nuevo nombre"
                  className="h-11 glass border-white/10 text-center font-bold"
                />
                <Button type="submit" size="icon" disabled={savingName} className="h-11 w-11 shrink-0" aria-label="Guardar nombre">
                  <Check className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => { setEditingName(false); setNameError(null); }} className="h-11 w-11 shrink-0" aria-label="Cancelar">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {nameError && <p className="text-xs text-red-400" role="alert">{nameError}</p>}
            </form>
          ) : (
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              {username}
              <button
                type="button"
                onClick={() => { setNameDraft(username); setEditingName(true); }}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10"
                aria-label="Cambiar nombre"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </h2>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <User className="w-3 h-3" /> {session ? `Cuenta: ${session.user.email ?? "conectada"}` : "Invitado en PorcheJam"}
          </p>
        </motion.div>

        {/* Invitado: ofrecer guardar el progreso en una cuenta */}
        {!session && accountsEnabled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 mb-10 text-center">
            <h3 className="font-display font-bold text-foreground mb-1">Guarda tu progreso</h3>
            <p className="text-sm text-muted-foreground mb-4">Crea tu cuenta y tus estadísticas te seguirán en cualquier dispositivo. Lo que ya has jugado se conserva.</p>
            <SignInOptions />
          </motion.div>
        )}

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
              gameHistory.slice(0, 10).map((game, i) => (
                <motion.div
                  key={game.id ?? i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {game.cover} {game.playlist} <span className="text-primary opacity-80">· {game.specialMode === "Arena Online" ? "Arena Online" : `${game.mode === "solo" ? "Solitario" : "Fiesta"} ${game.specialMode}`}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {game.date}{game.accuracy ? <> · <span className="text-white/80">{game.accuracy} aciertos</span></> : null}
                    </div>
                  </div>
                  <div className="text-lg font-display font-bold text-primary">{game.score}</div>
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
            <LogOut className="w-4 h-4 mr-2" /> {session ? "Cerrar sesión" : "Salir"}
          </Button>
        </motion.div>

        {/* Borrar cuenta (derecho de supresión) */}
        {session && (
          <div className="mt-10 border-t border-white/10 pt-6 text-center">
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-muted-foreground underline hover:text-destructive">
                Borrar mi cuenta y todos mis datos
              </button>
            ) : (
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-foreground mb-3">Se borrarán tu cuenta, tus estadísticas y tu historial para siempre. ¿Seguro?</p>
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Sí, borrar todo</Button>
                </div>
                {deleteError && <p role="alert" className="text-xs text-destructive mt-2">{deleteError}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA CAMBIAR AVATAR */}
      <AvatarPicker
        open={isAvatarModalOpen}
        current={currentAvatar}
        name={username}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={selectAvatar}
      />
    </div>
  );
};

export default UserProfile;