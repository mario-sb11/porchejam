import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Pause, Play, Search, SkipForward } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";
import {
  MAX_ATTEMPTS,
  categoryInfo,
  checkGuess,
  fetchPuzzle,
  isDailyCategory,
  readProgress,
  saveProgress,
  type DailyCategoryId,
  type DailyGuess,
  type DailyProgress,
  type DailyPuzzle,
} from "@/lib/daily";

interface SearchResult {
  id: string;
  name: string;
  artistName: string;
  cover: string;
}

const TOTAL_SECONDS = 16;

const DailyGame = () => {
  const { categoria } = useParams();
  if (!isDailyCategory(categoria)) return <Navigate to="/cancion-del-dia" replace />;
  return <DailyGameInner category={categoria} />;
};

const DailyGameInner = ({ category }: { category: DailyCategoryId }) => {
  const navigate = useNavigate();
  const info = categoryInfo(category);

  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [progress, setProgress] = useState<DailyProgress>({ guesses: [], status: "playing" });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  const attempt = progress.guesses.length;
  const allowedSeconds = puzzle ? puzzle.steps[Math.min(attempt, puzzle.steps.length - 1)] : 1;

  // Cargar el reto de hoy y el progreso guardado
  const loadPuzzle = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await fetchPuzzle(category);
      setPuzzle(data);
      const saved = readProgress(category, data.date);
      if (saved.status !== "playing") {
        navigate(`/cancion-del-dia/${category}/resultado`, { replace: true });
        return;
      }
      setProgress(saved);
    } catch {
      setLoadError("No hemos podido cargar el reto de hoy. Comprueba tu conexión e inténtalo de nuevo.");
    }
  }, [category, navigate]);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  // Audio
  const stopAudio = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    clearInterval(tickRef.current);
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  useEffect(() => stopAudio, [stopAudio]);

  const playSnippet = () => {
    if (!puzzle) return;
    if (playing) return stopAudio();
    if (!audioRef.current) {
      audioRef.current = new Audio(puzzle.previewUrl);
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.volume = 0.7;
    audio
      .play()
      .then(() => {
        setAudioNotice(null);
        setPlaying(true);
        setElapsed(0);
        const started = performance.now();
        tickRef.current = setInterval(() => setElapsed((performance.now() - started) / 1000), 50);
        stopTimerRef.current = setTimeout(stopAudio, allowedSeconds * 1000);
      })
      .catch(() => {
        // La URL del audio caduca: si falla, se pide un reto fresco y se avisa para volver a pulsar.
        audioRef.current = null;
        setAudioNotice("No se pudo reproducir el audio. Pulsa de nuevo para reintentarlo.");
        loadPuzzle();
      });
  };

  // Buscador con espera para no lanzar una petición por tecla
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(apiUrl("search", { q, type: "track" }), { signal: controller.signal });
        if (res.ok) setResults(((await res.json()) as SearchResult[]).slice(0, 6));
      } catch {
        /* búsqueda cancelada o sin red */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const commit = (guess: DailyGuess, correct = false) => {
    if (!puzzle) return;
    const guesses = [...progress.guesses, guess];
    const status = correct ? "won" : guesses.length >= MAX_ATTEMPTS ? "lost" : "playing";
    const next: DailyProgress = { guesses, status };
    setProgress(next);
    saveProgress(category, puzzle.date, next);
    if (status !== "playing") {
      stopAudio();
      navigate(`/cancion-del-dia/${category}/resultado`);
    }
  };

  const submitGuess = async (choice: SearchResult) => {
    if (!puzzle || checking) return;
    setChecking(true);
    setQuery("");
    setResults([]);
    try {
      const { correct } = await checkGuess(category, puzzle.date, choice.id);
      const label = `${choice.name} — ${choice.artistName}`;
      commit(correct ? { kind: "correct", label } : { kind: "wrong", label }, correct);
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        // Ha pasado la medianoche: nuevo reto.
        await loadPuzzle();
      } else {
        setLoadError("No se pudo comprobar tu respuesta. Inténtalo otra vez.");
      }
    } finally {
      setChecking(false);
    }
  };

  if (loadError && !puzzle) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground max-w-sm">{loadError}</p>
        <Button onClick={loadPuzzle}>Reintentar</Button>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen gradient-bg flex justify-center items-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg px-4 py-6">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cancion-del-dia")} aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground">
              {info.emoji} {info.title}
            </h1>
            <p className="text-xs text-muted-foreground">Reto #{puzzle.number} · Intento {Math.min(attempt + 1, MAX_ATTEMPTS)} de {MAX_ATTEMPTS}</p>
          </div>
        </header>

        {/* Intentos */}
        <ol className="flex flex-col gap-2" aria-label="Intentos">
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
            const g = progress.guesses[i];
            const style = !g
              ? "border-white/10 text-muted-foreground/50"
              : g.kind === "skip"
                ? "border-white/15 text-muted-foreground"
                : g.kind === "wrong"
                  ? "border-destructive/50 text-destructive"
                  : "border-primary text-primary";
            return (
              <li key={i} className={`h-11 rounded-xl border px-4 flex items-center text-sm truncate ${style} ${i === attempt ? "border-white/30" : ""}`}>
                {g ? (g.kind === "skip" ? "⏭ Saltado" : `${g.kind === "wrong" ? "✗" : "✓"} ${g.label}`) : ""}
              </li>
            );
          })}
        </ol>

        {/* Reproductor */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3">
          <div className="relative h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 bg-white/15" style={{ width: `${(allowedSeconds / TOTAL_SECONDS) * 100}%` }} />
            <motion.div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(Math.min(elapsed, allowedSeconds) / TOTAL_SECONDS) * 100}%` }} />
            {puzzle.steps.map((s) => (
              <div key={s} className="absolute inset-y-0 w-px bg-black/60" style={{ left: `${(s / TOTAL_SECONDS) * 100}%` }} />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <Button
              onClick={playSnippet}
              size="icon"
              className="h-14 w-14 rounded-full glow-green"
              aria-label={playing ? "Parar" : `Escuchar ${allowedSeconds} segundos`}
            >
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" fill="currentColor" />}
            </Button>
            <span>0:{String(TOTAL_SECONDS).padStart(2, "0")}</span>
          </div>
          <p className="text-center text-xs text-muted-foreground" role="status">
            {audioNotice ?? `Ahora puedes escuchar ${allowedSeconds} ${allowedSeconds === 1 ? "segundo" : "segundos"}`}
          </p>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe el nombre de la canción o del artista..."
            aria-label="Buscar canción"
            className="pl-10 h-14 rounded-full glass border-white/15 text-base"
            maxLength={100}
            disabled={checking}
          />
          {(searching || checking) && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          {results.length > 0 && (
            <ul className="absolute bottom-16 left-0 w-full glass-strong rounded-xl overflow-hidden max-h-72 overflow-y-auto z-50" role="listbox">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => submitGuess(r)} className="w-full p-3 text-left hover:bg-primary/20 border-b border-white/5 flex items-center gap-3">
                    {r.cover && <img src={r.cover} alt="" className="w-10 h-10 rounded-md object-cover" loading="lazy" />}
                    <span className="min-w-0">
                      <span className="block font-bold truncate">{r.name}</span>
                      <span className="block text-xs text-muted-foreground truncate">{r.artistName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loadError && <p role="alert" className="text-sm text-center text-destructive">{loadError}</p>}

        <Button variant="ghost" onClick={() => commit({ kind: "skip" })} disabled={checking} className="self-center text-muted-foreground">
          <SkipForward className="w-4 h-4 mr-2" />
          {attempt >= MAX_ATTEMPTS - 1 ? "Me rindo" : `Saltar (+${puzzle.steps[Math.min(attempt + 1, puzzle.steps.length - 1)] - allowedSeconds} s)`}
        </Button>
      </div>
    </div>
  );
};

export default DailyGame;
