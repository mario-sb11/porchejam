import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Flame, Pause, Play, Share2 } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MAX_ATTEMPTS,
  categoryInfo,
  currentStreak,
  fetchAnswer,
  fetchPuzzle,
  isDailyCategory,
  readProgress,
  shareText,
  todayInMadrid,
  type DailyAnswer,
  type DailyCategoryId,
  type DailyPuzzle,
} from "@/lib/daily";

/** Tiempo hasta la medianoche de Madrid. */
function timeToMidnightMadrid(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(now)
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  const left = 86_400 - (parts.hour * 3600 + parts.minute * 60 + parts.second);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

const DailyChallengeResult = () => {
  const { categoria } = useParams();
  if (!isDailyCategory(categoria)) return <Navigate to="/cancion-del-dia" replace />;
  return <ResultInner category={categoria} />;
};

const ResultInner = ({ category }: { category: DailyCategoryId }) => {
  const navigate = useNavigate();
  const info = categoryInfo(category);
  const today = todayInMadrid();
  const progress = readProgress(category, today);
  const streak = currentStreak(category, today);

  const [answer, setAnswer] = useState<DailyAnswer | null>(null);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(timeToMidnightMadrid());
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const finished = progress.status !== "playing";
  const won = progress.status === "won";

  useEffect(() => {
    if (!finished) return;
    fetchAnswer(category, today).then(setAnswer).catch(() => setAnswer(null));
    fetchPuzzle(category).then(setPuzzle).catch(() => setPuzzle(null));
  }, [category, today, finished]);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(timeToMidnightMadrid()), 1000);
    return () => {
      clearInterval(interval);
      audioRef.current?.pause();
    };
  }, []);

  if (!finished) return <Navigate to={`/cancion-del-dia/${category}`} replace />;

  const text = puzzle ? shareText(category, puzzle.number, progress) : "";

  const handleShare = async () => {
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelado: se copia como alternativa */
      }
    }
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSong = () => {
    if (!puzzle) return;
    if (!audioRef.current) audioRef.current = new Audio(puzzle.previewUrl);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      audioRef.current.onended = () => setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="text-center mb-8">
          <div className="text-7xl mb-4" aria-hidden="true">{won ? "✅" : "❌"}</div>
          <h1 className="text-3xl font-display font-bold text-foreground">{won ? "¡Acertaste!" : "No ha sido esta vez"}</h1>
          <p className="text-sm text-muted-foreground mt-2">{info.emoji} {info.title}</p>
        </motion.div>

        {/* Canción */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5 flex items-center gap-4 mb-6">
          {answer?.cover ? (
            <img src={answer.cover} alt="" className="w-20 h-20 rounded-xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-white/5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-lg font-display font-bold text-foreground truncate">{answer?.name ?? "…"}</div>
            <div className="text-sm text-muted-foreground truncate">{answer?.artist ?? ""}</div>
          </div>
          <Button size="icon" variant="outline" onClick={toggleSong} disabled={!puzzle} className="rounded-full shrink-0" aria-label={playing ? "Parar canción" : "Escuchar canción"}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
        </motion.div>

        {/* Estadísticas */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">{won ? `${progress.guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}</div>
            <div className="text-xs text-muted-foreground">Intentos</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-accent flex items-center justify-center gap-1">
              <Flame className="w-5 h-5" /> {streak}
            </div>
            <div className="text-xs text-muted-foreground">Racha</div>
          </div>
        </motion.div>

        {/* Compartir */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass rounded-xl p-5 text-center mb-6">
          <pre className="text-sm whitespace-pre-wrap font-sans mb-3 text-foreground/90">{text.split("\n").slice(0, 2).join("\n")}</pre>
          <Button onClick={handleShare} disabled={!text} variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10">
            {copied ? <Check className="w-4 h-4 mr-2" /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "¡Copiado!" : "Compartir resultado"}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Próxima canción en</p>
          <p className="text-xl font-display font-bold text-secondary text-glow-purple">{countdown}</p>
        </motion.div>

        <div className="flex justify-center">
          <Button onClick={() => navigate("/cancion-del-dia")} variant="outline" className="h-12 px-8 rounded-full border-border text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Otras categorías
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeResult;
