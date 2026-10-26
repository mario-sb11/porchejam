import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, CheckCircle2, Flame, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DAILY_CATEGORIES, currentStreak, readProgress, todayInMadrid } from "@/lib/daily";

const DailyChallenge = () => {
  const navigate = useNavigate();
  const today = todayInMadrid();

  const categories = useMemo(
    () =>
      DAILY_CATEGORIES.map((cat) => ({
        ...cat,
        streak: currentStreak(cat.id, today),
        progress: readProgress(cat.id, today),
      })),
    [today],
  );

  const open = (id: string, finished: boolean) =>
    navigate(finished ? `/cancion-del-dia/${id}/resultado` : `/cancion-del-dia/${id}`);

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Canción del Día</h1>
              <Badge variant="secondary" className="text-xs gap-1">
                <Calendar className="w-3 h-3" />
                Se renueva a diario
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">La misma canción para todos. 6 intentos, cada vez suena un poco más.</p>
          </div>
        </motion.div>

        <div className="grid gap-4">
          {categories.map((cat, i) => {
            const finished = cat.progress.status !== "playing";
            return (
              <motion.button
                type="button"
                key={cat.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => open(cat.id, finished)}
                className="glass rounded-2xl p-5 flex items-center gap-5 text-left group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-4xl flex-shrink-0 relative z-10" aria-hidden="true">{cat.emoji}</div>

                <div className="flex-1 relative z-10">
                  <h3 className="text-lg font-display font-bold text-foreground">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
                </div>

                <div className="flex flex-col items-center gap-1 relative z-10 mr-2 min-w-[2rem]" title="Racha de días acertando">
                  {cat.streak > 0 ? (
                    <>
                      <Flame className="w-5 h-5 text-accent" />
                      <span className="text-xs font-bold text-accent">{cat.streak}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                <span className="relative z-10">
                  {cat.progress.status === "won" && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
                      <CheckCircle2 className="w-4 h-4" /> {cat.progress.guesses.length}/6
                    </span>
                  )}
                  {cat.progress.status === "lost" && (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive">
                      <XCircle className="w-4 h-4" /> X/6
                    </span>
                  )}
                  {cat.progress.status === "playing" && (
                    <span className="rounded-full bg-primary text-primary-foreground font-bold px-5 py-2 text-sm">
                      {cat.progress.guesses.length > 0 ? "Seguir" : "Jugar"}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3 text-accent" />
          Mantén tu racha jugando cada día
        </motion.p>
      </div>
    </div>
  );
};

export default DailyChallenge;
