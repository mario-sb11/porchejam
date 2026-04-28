import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, SkipForward, Gamepad2, Ghost, Lightbulb, Clock, Infinity, Tag, Volume2, Sparkles, MessageSquareQuote } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";


const TIME_OPTIONS = [5, 10, 15, 30];
const GLOBAL_TIME_OPTIONS = [60, 120, 300]; 
const ROUND_OPTIONS = [5, 10, 15, 20];
const LIVES_OPTIONS = [1, 3, 5];

// Opciones exclusivas para el Infiltrado
const IMPOSTER_DEBATE_TIMES = [3, 5, 10, 15, 0]; // 0 = Sin límite
const IMPOSTER_AUDIO_TIMES = [5, 10, 15, 30];

const SPECIAL_MODES = [
  { id: "normal", emoji: "🎵", title: "Normal", description: "Escucha y adivina la canción" },
  { id: "inverso", emoji: "⏪", title: "Inverso", description: "La canción suena al revés" },
  { id: "survival", emoji: "☠️", title: "Survival", description: "Fallas y pierdes una vida" },
  { id: "contrarreloj", emoji: "⚡", title: "Contrarreloj", description: "Adivina todas posibles en un tiempo límite" },
];

const ANSWER_MODES = [
  { id: "facil", label: "Fácil", description: "4 opciones clásicas" },
  { id: "medio", label: "Medio", description: "Buscador con sugerencias" },
  { id: "dificil", label: "Difícil", description: "Texto libre estricto" },
];

const REVEAL_MODES = [
  { id: "texto", emoji: "📝", title: "Solo Texto", description: "Lee el título y el artista" },
  { id: "audio", emoji: "🎧", title: "Solo Audio", description: "Escucha un fragmento a ciegas" },
  { id: "mixto", emoji: "🧠", title: "Mixto", description: "Audio y Texto. La experiencia pro" },
];

const CLUE_TYPES = [
  { id: "lyrics", icon: MessageSquareQuote, label: "Letra", desc: "Frase de la canción" },
  { id: "tags", icon: Tag, label: "Palabras", desc: "Palabras relacionadas" },
  { id: "audio", icon: Volume2, label: "Micro-Audio", desc: "Flashazo de audio" },
  { id: "ambas", icon: Sparkles, label: "Aleatorio", desc: "Cualquiera al azar" },
];

const GameSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "solo";
  
  const isImposterMode = searchParams.get("special") === "imposter";

  // Estados Clásicos
  const [listenTime, setListenTime] = useState(15);
  const [globalTime, setGlobalTime] = useState(120);
  const [rounds, setRounds] = useState(10);
  const [answerMode, setAnswerMode] = useState("facil");
  const [specialMode, setSpecialMode] = useState("normal");
  const [lives, setLives] = useState(3);
  const [allowSkip, setAllowSkip] = useState(true);

  // Estados Infiltrado
  const [revealMode, setRevealMode] = useState("mixto");
  const [imposterClues, setImposterClues] = useState(true);
  const [clueMode, setClueMode] = useState("ambas"); // tags, audio, ambas
  const [flashTime, setFlashTime] = useState(0.5); // 0.2 a 1.5
  const [debateTime, setDebateTime] = useState(5); 
  const [audioListenTime, setAudioListenTime] = useState(10); 

  const handleStart = () => {
    let params;
    
    if (isImposterMode) {
      let parsedClueTypes = "tags,audio,lyrics";
      if (clueMode === "tags") parsedClueTypes = "tags";
      if (clueMode === "audio") parsedClueTypes = "audio";
      if (clueMode === "lyrics") parsedClueTypes = "lyrics";
      params = new URLSearchParams({
        mode,
        special: "imposter",
        reveal: revealMode,
        clues: String(imposterClues),
        clueTypes: parsedClueTypes,
        flashTime: String(flashTime),
        debateTime: String(debateTime),
        audioTime: String(audioListenTime),
      });
      navigate(`/imposter?${params.toString()}`); 
      return; 
    } else {
      params = new URLSearchParams({
        mode,
        time: String(specialMode === "contrarreloj" ? globalTime : listenTime),
        rounds: String(rounds),
        answer: answerMode,
        special: specialMode,
        ...(specialMode === "survival" ? { lives: String(lives) } : {}),
        skip: String(allowSkip),
      });
      navigate(`/game?${params.toString()}`); 
    }
  };
  
  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isImposterMode ? "Ajustes del Infiltrado" : "Configuración de Partida"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isImposterMode ? "Prepara el terreno para el engaño" : "Ajusta las reglas a tu gusto"}
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          
          {isImposterMode ? (
            /* ================= PANEL INFILTRADO ================= */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              
              <div className="glass-strong border-orange-500/30 border p-4 rounded-xl flex items-start gap-4 glow-red">
                <Ghost className="w-8 h-8 text-orange-400 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-orange-400">Modo de Engaño</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Un jugador será elegido como el Infiltrado y no conocerá la canción. El resto deberá dar pistas con una sola palabra sin ser demasiado obvios.
                  </p>
                </div>
              </div>

              <Section title="¿Ayudar al Infiltrado?" delay={0.1}>
                <div className="flex items-center justify-between glass rounded-xl p-4 border border-white/5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lightbulb className={`w-5 h-5 ${imposterClues ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Permitir Pistas</div>
                      <div className="text-xs text-muted-foreground">El Infiltrado recibirá ayuda en su tarjeta.</div>
                    </div>
                  </div>
                  <Switch checked={imposterClues} onCheckedChange={setImposterClues} />
                </div>
              </Section>

              <AnimatePresence mode="popLayout">
                {imposterClues && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-6">
                    
                    {/* Selector de Tipo de Pista */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {CLUE_TYPES.map((ct) => {
                        const Icon = ct.icon;
                        const isSelected = clueMode === ct.id;
                        return (
                          <button
                            key={ct.id}
                            onClick={() => setClueMode(ct.id)}
                            className={`flex flex-col items-center justify-center text-center p-3 rounded-xl border-2 transition-all ${
                              isSelected 
                                ? "border-orange-500 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
                                : "border-transparent bg-black/20 text-muted-foreground hover:border-white/10"
                            }`}
                          >
                            <Icon className="w-6 h-6 mb-2" />
                            <span className="text-sm font-bold">{ct.label}</span>
                            <span className="text-[10px] opacity-70 mt-1 leading-tight hidden sm:block">{ct.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Ruleta del Flashazo */}
                    <div className="glass p-5 rounded-xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Duración del Micro-Audio</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tiempo de escucha para el Flashazo
                          </p>
                        </div>
                        <span className="text-2xl font-black text-orange-400 font-display">{flashTime.toFixed(1)}s</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground font-bold">0.2s</span>
                        <input
                          type="range"
                          min="0.2"
                          max="1.5"
                          step="0.1"
                          value={flashTime}
                          onChange={(e) => setFlashTime(parseFloat(e.target.value))}
                          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
                        />
                        <span className="text-xs text-muted-foreground font-bold">1.5s</span>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              <Section title="Dificultad de la Tarjeta (Jugadores Reales)" delay={0.2}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {REVEAL_MODES.map((rm) => {
                    const isSelected = revealMode === rm.id;
                    return (
                      <motion.button
                        key={rm.id} whileTap={{ scale: 0.97 }}
                        onClick={() => setRevealMode(rm.id)}
                        className={`glass rounded-xl p-4 text-left transition-all border-2 ${
                          isSelected 
                            ? "border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
                            : "border-transparent hover:border-white/20 bg-black/20"
                        }`}
                      >
                        <div className="text-2xl mb-2">{rm.emoji}</div>
                        <div className={`text-sm font-bold transition-colors ${isSelected ? "text-orange-400" : "text-foreground"}`}>
                          {rm.title}
                        </div>
                        <div className={`text-xs mt-1 transition-colors ${isSelected ? "text-orange-200" : "text-muted-foreground"}`}>
                          {rm.description}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </Section>

              <AnimatePresence mode="popLayout">
                {(revealMode === "audio" || revealMode === "mixto") && (
                  <motion.div key="audio-time" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Section title="Duración del Fragmento de Audio (Reales)" delay={0.25}>
                      <div className="flex gap-3">
                        {IMPOSTER_AUDIO_TIMES.map((t) => (
                          <ChipButton key={t} selected={audioListenTime === t} onClick={() => setAudioListenTime(t)} isImposter>
                            {t}s
                          </ChipButton>
                        ))}
                      </div>
                    </Section>
                  </motion.div>
                )}
              </AnimatePresence>

              <Section title="Tiempo de Partida" delay={0.3}>
                <p className="text-xs text-orange-400/80 font-semibold mb-3 -mt-2">Recomendado: 5 min</p>
                <div className="flex flex-wrap gap-3">
                  {IMPOSTER_DEBATE_TIMES.map((t) => (
                    <ChipButton key={t} selected={debateTime === t} onClick={() => setDebateTime(t)} isImposter>
                      {t === 0 ? (
                        <span className="flex items-center gap-1"><Infinity className="w-4 h-4" /> Sin límite</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {t} min</span>
                      )}
                    </ChipButton>
                  ))}
                </div>
              </Section>
            </motion.div>
          ) : (
            /* ================= PANEL CLÁSICO ================= */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <Section title="Modo especial" delay={0.1}>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIAL_MODES.map((sm) => {
                    const isSelected = specialMode === sm.id;
                    return (
                      <motion.button
                        key={sm.id} whileTap={{ scale: 0.97 }}
                        onClick={() => setSpecialMode(sm.id)}
                        className={`glass rounded-xl p-4 text-left transition-all border-2 ${
                          isSelected ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(30,215,96,0.2)] glow-green" : "border-transparent hover:border-white/20 bg-black/20"
                        }`}
                      >
                        <div className="text-2xl mb-2">{sm.emoji}</div>
                        <div className={`text-sm font-bold transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {sm.title}
                        </div>
                        <div className={`text-xs mt-1 transition-colors ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                          {sm.description}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </Section>

              <Section title={specialMode === "contrarreloj" ? "Tiempo Global de la Partida" : "Tiempo por canción"} delay={0.15}>
                <div className="flex gap-3">
                  {specialMode === "contrarreloj" 
                    ? GLOBAL_TIME_OPTIONS.map((t) => (
                        <ChipButton key={t} selected={globalTime === t} onClick={() => setGlobalTime(t)}>
                          {t / 60} min
                        </ChipButton>
                      ))
                    : TIME_OPTIONS.map((t) => (
                        <ChipButton key={t} selected={listenTime === t} onClick={() => setListenTime(t)}>
                          {t}s
                        </ChipButton>
                      ))
                  }
                </div>
              </Section>

              <AnimatePresence mode="popLayout">
                {specialMode === "survival" ? (
                  <motion.div key="lives" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Section title="Vidas" delay={0}>
                      <div className="flex gap-3 items-center">
                        {LIVES_OPTIONS.map((l) => (
                          <ChipButton key={l} selected={lives === l} onClick={() => setLives(l)}>
                            <Heart className="w-4 h-4 mr-1 inline" /> {l}
                          </ChipButton>
                        ))}
                      </div>
                    </Section>
                  </motion.div>
                ) : specialMode !== "contrarreloj" ? (
                  <motion.div key="rounds" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Section title="Número de rondas" delay={0}>
                      <div className="flex gap-3">
                        {ROUND_OPTIONS.map((r) => (
                          <ChipButton key={r} selected={rounds === r} onClick={() => setRounds(r)}>
                            {r}
                          </ChipButton>
                        ))}
                      </div>
                    </Section>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Section title="Dificultad de Respuestas" delay={0.2}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ANSWER_MODES.map((am) => {
                    const isSelected = answerMode === am.id;
                    return (
                      <motion.button
                        key={am.id} whileTap={{ scale: 0.97 }}
                        onClick={() => setAnswerMode(am.id)}
                        className={`glass rounded-xl p-4 text-left transition-all border-2 ${
                          isSelected ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(30,215,96,0.2)] glow-green" : "border-transparent bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <div className={`text-sm font-bold transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {am.label}
                        </div>
                        <div className={`text-xs mt-1 transition-colors ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                          {am.description}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </Section>

              <Section title="Ajustes Extras" delay={0.3}>
                <div className="flex items-center justify-between glass rounded-xl p-4 bg-black/20 border border-transparent hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <SkipForward className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Permitir saltar</div>
                      <div className="text-xs text-muted-foreground">Los jugadores pueden rendirse en una ronda</div>
                    </div>
                  </div>
                  <Switch checked={allowSkip} onCheckedChange={setAllowSkip} />
                </div>
              </Section>
            </motion.div>
          )}

        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12 flex justify-center">
          <Button 
            onClick={handleStart} 
            size="lg" 
            className={`h-14 px-12 text-lg font-bold rounded-full text-primary-foreground transition-all ${
              isImposterMode 
                ? "bg-orange-500 hover:bg-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.4)]" 
                : "bg-primary animate-pulse_glow"
            }`}
          >
            {isImposterMode ? <Ghost className="w-5 h-5 mr-2" /> : <Gamepad2 className="w-5 h-5 mr-2" />}
            Empezar Partida
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

const Section = ({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </motion.div>
);

const ChipButton = ({ selected, onClick, children, isImposter = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; isImposter?: boolean }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`h-11 px-5 rounded-full font-semibold text-sm transition-all flex items-center ${
      selected 
        ? (isImposter ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-primary text-primary-foreground glow-green shadow-[0_0_15px_rgba(30,215,96,0.2)]") 
        : "glass border border-white/5 text-muted-foreground hover:text-foreground bg-black/20"
    }`}
  >
    {children}
  </motion.button>
);

export default GameSettings;