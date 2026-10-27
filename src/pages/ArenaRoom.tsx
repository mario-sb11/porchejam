import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, WifiOff } from "lucide-react";
import GameButton from "@/components/ui/GameButton";
import ArenaJoin from "@/components/arena/ArenaJoin";
import ArenaLobby from "@/components/arena/ArenaLobby";
import ArenaPlay from "@/components/arena/ArenaPlay";
import ArenaPodium from "@/components/arena/ArenaPodium";
import { useArenaRoom, useServerNow } from "@/hooks/useArenaRoom";
import { useArenaAudio } from "@/hooks/useArenaAudio";
import { arena, cleanRoomCode, ROOM_CODE } from "@/lib/arena";
import { arenaAvailable } from "@/lib/supabase";

const ArenaRoom = () => {
  const { code: rawCode = "" } = useParams();
  const code = cleanRoomCode(rawCode);
  const navigate = useNavigate();
  const { state, needsJoin, connectionLost, refresh, clock } = useArenaRoom(code);
  const playing = state?.room.status === "playing";
  const serverNow = useServerNow(clock, playing);
  const audio = useArenaAudio(state, clock);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    document.title = `Sala ${code} · PorcheJam`;
    return () => {
      document.title = "PorcheJam · Adivina la canción con tus amigos";
    };
  }, [code]);

  if (!arenaAvailable) return <Navigate to="/modes" replace />;
  if (!ROOM_CODE.test(code)) return <Navigate to="/arena" replace />;
  if (code !== rawCode) return <Navigate to={`/arena/${code}`} replace />;

  const leave = async () => {
    await arena.leave(code).catch(() => undefined);
    navigate("/dashboard");
  };
  // Salir a mitad de partida pide confirmación (sin diálogos del navegador).
  const askLeave = () => (state && state.room.status !== "finished" ? setConfirmLeave(true) : void leave());

  return (
    <div className="min-h-screen gradient-bg px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <GameButton variant="ghost" size="icon" onClick={needsJoin ? () => navigate("/arena") : askLeave} aria-label="Salir de la sala" className="shadow-none text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </GameButton>
          <div>
            <h1 className="text-2xl font-display font-bold">Arena Online</h1>
            <p className="text-sm text-muted-foreground">Sala {code}</p>
          </div>
        </header>

        {confirmLeave && (
          <div className="mb-4 glass-strong rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" role="alertdialog" aria-label="Salir de la sala">
            <p className="text-sm">¿Seguro que quieres salir de la sala?</p>
            <div className="flex gap-2">
              <GameButton variant="outline" onClick={() => setConfirmLeave(false)} className="h-9 shadow-none border-white/15 bg-white/5">Quedarme</GameButton>
              <GameButton onClick={() => void leave()} className="h-9 bg-destructive hover:bg-destructive/90 shadow-none">Salir</GameButton>
            </div>
          </div>
        )}

        {connectionLost && (
          <p className="mb-4 glass rounded-xl p-3 text-sm flex items-center gap-2 text-yellow-300" role="status">
            <WifiOff className="w-4 h-4" /> Sin conexión. Reintentando...
          </p>
        )}

        {needsJoin ? (
          <ArenaJoin code={code} onJoined={() => void refresh()} />
        ) : !state ? (
          <div className="flex justify-center py-24" aria-busy>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : state.room.status === "lobby" || state.room.status === "loading" ? (
          <ArenaLobby state={state} onStarted={() => void refresh()} />
        ) : state.room.status === "playing" ? (
          <ArenaPlay
            state={state}
            serverNow={serverNow}
            needsTap={audio.needsTap}
            onTapToPlay={audio.playNow}
            muted={audio.muted}
            onToggleMute={audio.toggleMute}
            onAnswered={() => void refresh()}
          />
        ) : (
          <ArenaPodium state={state} onLeave={leave} onRematch={() => void refresh()} />
        )}
      </div>
    </div>
  );
};

export default ArenaRoom;
