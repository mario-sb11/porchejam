import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MOCK_SONGS } from "@/data/mockData";

const DailyChallengeResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  const won = state?.won ?? true;
  const attempts = state?.attempts ?? [true, false, false, true];
  const timeTaken = state?.time ?? 8.3;
  const categoryId = state?.categoryId ?? "global";
  const song = MOCK_SONGS[0];

  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getBlockColor = (correct: boolean, index: number) => {
    if (correct) return "🟩";
    if (index === attempts.length - 1) return "🟥";
    return "🟨";
  };

  const shareText = `🎵 PorchiJam - Canción del Día\n${attempts.map((a: boolean, i: number) => getBlockColor(a, i)).join("")}\n${won ? "✅" : "❌"} ${attempts.filter(Boolean).length}/${attempts.length} intentos · ${timeTaken}s`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="text-center mb-8">
          <div className="text-7xl mb-4">{won ? "✅" : "❌"}</div>
          <h1 className="text-3xl font-display font-bold text-foreground">{won ? "¡Acertaste!" : "No ha sido esta vez"}</h1>
        </motion.div>

        {/* Song reveal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 text-center mb-6">
          <div className="text-5xl mb-3">{song.albumArt}</div>
          <div className="text-xl font-display font-bold text-foreground">{song.title}</div>
          <div className="text-sm text-muted-foreground mt-1">{song.artist} · {song.album}</div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">{attempts.length}</div>
            <div className="text-xs text-muted-foreground">Intentos</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">{timeTaken}s</div>
            <div className="text-xs text-muted-foreground">Tiempo</div>
          </div>
        </motion.div>

        {/* Shareable blocks */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass rounded-xl p-5 text-center mb-6">
          <div className="text-2xl tracking-widest mb-3">
            {attempts.map((a: boolean, i: number) => getBlockColor(a, i)).join(" ")}
          </div>
          <Button onClick={handleCopy} variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "¡Copiado!" : "Copiar resultado"}
          </Button>
        </motion.div>

        {/* Countdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Próximo reto en</p>
          <p className="text-xl font-display font-bold text-secondary text-glow-purple">{countdown}</p>
        </motion.div>

        <div className="flex justify-center">
          <Button onClick={() => navigate("/cancion-del-dia")} variant="outline" className="h-12 px-8 rounded-full border-border text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeResult;
