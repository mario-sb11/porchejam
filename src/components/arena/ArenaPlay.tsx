import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search, Send, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GlassCard from "@/components/ui/GlassCard";
import PlayerAvatar from "@/components/PlayerAvatar";
import MusicVisualizer from "@/components/MusicVisualizer";
import { apiUrl } from "@/lib/api";
import { arena, type ArenaState } from "@/lib/arena";
import { cn } from "@/lib/utils";

interface Props {
  state: ArenaState;
  serverNow: number;
  needsTap: boolean;
  onTapToPlay: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onAnswered: () => void;
}

interface SearchResult { id: string; name: string; artistName: string }

/** Ronda en juego: cuenta atrás, pregunta con su reloj y revelación con la clasificación. */
const ArenaPlay = ({ state, serverNow, needsTap, onTapToPlay, muted, onToggleMute, onAnswered }: Props) => {
  const { room, current, mine, players, me } = state;
  const [chosen, setChosen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number; attemptsLeft: number } | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundNumber = current?.number ?? 0;
  // Cada ronda empieza limpia.
  useEffect(() => {
    setChosen(null);
    setFeedback(null);
    setWrongGuesses([]);
    setError(null);
  }, [roundNumber]);

  if (!current) return null;

  const startsAt = Date.parse(current.startsAt);
  const endsAt = Date.parse(current.endsAt);
  const reveal = room.phase === "reveal" ? current.reveal : null;
  const countdown = !reveal && serverNow < startsAt;
  const remaining = Math.max(0, (endsAt - serverNow) / 1000);
  const total = room.settings.seconds;
  const answerMode = room.settings.answer;
  const done = Boolean(mine && (mine.correct || answerMode === "facil" || mine.attempts >= 3));
  const answeredCount = players.filter((p) => p.answered).length;
  const meScore = players.find((p) => p.id === me)?.score ?? 0;

  const send = async (answer: { option?: number; text?: string }, label: string) => {
    if (sending || done || reveal) return;
    setSending(true);
    setError(null);
    try {
      const result = await arena.answer(room.code, answer);
      setFeedback(result);
      if (!result.correct && answer.text !== undefined) setWrongGuesses((g) => [...g, label]);
      onAnswered();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between glass-strong rounded-2xl px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ronda</p>
          <p className="font-display font-bold">{roundNumber}/{room.settings.rounds}</p>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          className="p-2 rounded-full hover:bg-white/10 text-muted-foreground"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tus puntos</p>
          <p className="font-display font-bold text-primary">{meScore}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {countdown ? (
          <motion.div key={`cd-${roundNumber}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
            <p className="text-muted-foreground mb-2">Prepárate...</p>
            <motion.p
              key={Math.ceil((startsAt - serverNow) / 1000)}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-display font-black text-primary text-glow-green"
              aria-live="assertive"
            >
              {Math.max(1, Math.ceil((startsAt - serverNow) / 1000))}
            </motion.p>
          </motion.div>
        ) : reveal ? (
          <motion.div key={`rv-${roundNumber}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <GlassCard className="p-5 flex items-center gap-4">
              {reveal.cover ? <img src={reveal.cover} alt="" className="w-20 h-20 rounded-xl object-cover" /> : <div className="w-20 h-20 rounded-xl bg-white/5" />}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Era...</p>
                <h2 className="text-xl font-display font-black truncate">{reveal.title}</h2>
                <p className="text-muted-foreground truncate">{reveal.artist}</p>
              </div>
            </GlassCard>
            <RoundRanking state={state} />
            <p className="text-center text-sm text-muted-foreground">
              {roundNumber < room.settings.rounds ? "Siguiente canción en unos segundos..." : "¡Última ronda! Calculando el podio..."}
            </p>
          </motion.div>
        ) : (
          <motion.div key={`q-${roundNumber}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Reloj */}
            <div>
              <div className="h-3 rounded-full bg-black/40 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.ceil(remaining)} aria-label="Tiempo restante">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", remaining / total > 0.5 ? "bg-primary" : remaining / total > 0.25 ? "bg-secondary" : "bg-destructive")}
                  style={{ width: `${(remaining / total) * 100}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">{Math.ceil(remaining)} s</p>
            </div>

            <div className="h-16"><MusicVisualizer isPlaying={!muted && !needsTap && remaining > 0} barCount={24} /></div>

            {needsTap && (
              <Button onClick={onTapToPlay} className="w-full h-12 gap-2 font-bold">
                <Volume2 className="w-5 h-5" /> Toca para escuchar
              </Button>
            )}

            {done ? (
              <GlassCard className={cn("p-5 text-center", mine?.correct ? "border-primary/40" : "border-destructive/40")}>
                <p className="text-3xl mb-1">{mine?.correct ? "🎉" : "😬"}</p>
                <p className="font-display font-bold text-lg">
                  {mine?.correct ? `¡Correcto! +${mine.points}` : "¡Fallaste!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1" aria-live="polite">
                  Han respondido {answeredCount} de {players.filter((p) => p.online).length}...
                </p>
              </GlassCard>
            ) : answerMode === "facil" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(current.options ?? []).map((option, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    disabled={sending}
                    onClick={() => {
                      setChosen(i);
                      void send({ option: i }, option.title);
                    }}
                    className={cn("h-auto min-h-[64px] py-3 flex flex-col border-white/10 glass hover:bg-white/10 whitespace-normal", chosen === i && "ring-2 ring-primary")}
                  >
                    <span className="font-bold text-sm text-center leading-tight">{option.title}</span>
                    <span className="text-xs opacity-70 mt-1">{option.artist}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <TextAnswer
                mode={answerMode}
                sending={sending}
                attemptsLeft={feedback ? feedback.attemptsLeft : 3 - (mine?.attempts ?? 0)}
                wrongGuesses={wrongGuesses}
                onSubmit={(text) => send({ text }, text)}
              />
            )}

            {error && <p className="text-sm text-center text-red-400" role="alert">{error}</p>}
            <PlayersStrip state={state} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Buscador (modo medio) o texto libre (modo difícil), con hasta 3 intentos. */
const TextAnswer = ({
  mode,
  sending,
  attemptsLeft,
  wrongGuesses,
  onSubmit,
}: {
  mode: "medio" | "dificil";
  sending: boolean;
  attemptsLeft: number;
  wrongGuesses: string[];
  onSubmit: (text: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (mode !== "medio" || q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(apiUrl("search", { q, type: "track" }), { signal: controller.signal });
        if (res.ok) setResults(((await res.json()) as SearchResult[]).slice(0, 5));
      } catch {
        /* cancelada o sin red */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, mode]);

  const submit = (text: string) => {
    if (!text.trim() || sending) return;
    setQuery("");
    setResults([]);
    onSubmit(text.trim());
  };

  return (
    <div className="space-y-3">
      {wrongGuesses.length > 0 && (
        <ul className="space-y-1">
          {wrongGuesses.map((g, i) => (
            <li key={i} className="text-sm text-red-400 flex items-center gap-2"><X className="w-4 h-4" /> {g}</li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "dificil") submit(query);
          else if (results[0]) submit(results[0].name);
        }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={sending}
          maxLength={100}
          autoComplete="off"
          aria-label={mode === "medio" ? "Busca la canción" : "Escribe el título"}
          placeholder={mode === "medio" ? "Busca la canción..." : "Escribe el título de la canción..."}
          className="pl-10 pr-12 h-14 rounded-full glass border-0 text-base"
        />
        <button type="submit" disabled={sending} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Enviar respuesta">
          {sending || searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
        {mode === "medio" && results.length > 0 && (
          <ul className="absolute bottom-16 left-0 w-full glass-strong rounded-xl overflow-hidden z-20" role="listbox">
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => submit(r.name)} className="w-full p-3 text-left hover:bg-primary/20 border-b border-white/5">
                  <div className="font-bold text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.artistName}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <p className="text-xs text-center text-muted-foreground">
        {attemptsLeft} {attemptsLeft === 1 ? "intento" : "intentos"} · cada fallo resta puntos
      </p>
    </div>
  );
};

/** Quién ha respondido ya (sin decir si ha acertado). */
const PlayersStrip = ({ state }: { state: ArenaState }) => (
  <div className="flex flex-wrap justify-center gap-3 pt-2" aria-label="Jugadores">
    {state.players.map((p) => (
      <div key={p.id} className={cn("relative", !p.online && "opacity-40")} title={p.name}>
        <PlayerAvatar avatar={p.avatar} name={p.name} className="w-9 h-9 text-lg" />
        {p.answered && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" aria-label={`${p.name} ha respondido`} />
          </span>
        )}
      </div>
    ))}
  </div>
);

/** Clasificación tras cada ronda, con los puntos ganados. */
const RoundRanking = ({ state }: { state: ArenaState }) => {
  const sorted = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players]);
  return (
    <ol className="space-y-2">
      {sorted.map((p, i) => (
        <motion.li key={p.id} layout className={cn("glass rounded-xl p-3 flex items-center gap-3", p.id === state.me && "border border-primary/40")}>
          <span className="w-6 text-center font-display font-bold text-muted-foreground">{i + 1}</span>
          <PlayerAvatar avatar={p.avatar} name={p.name} className="w-9 h-9 text-lg" />
          <span className="flex-1 truncate font-semibold text-sm">{p.name}</span>
          {p.roundCorrect ? (
            <span className="text-xs font-bold text-primary">+{p.roundPoints}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          <span className="font-display font-bold w-16 text-right">{p.score}</span>
        </motion.li>
      ))}
    </ol>
  );
};

export default ArenaPlay;
