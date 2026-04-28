import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DAILY_CATEGORIES } from "@/data/mockData";

const DailyChallenge = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Canción del Día</h1>
              <Badge variant="secondary" className="text-xs gap-1">
                <Calendar className="w-3 h-3" />
                Se renueva a diario
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Elige una categoría y demuestra lo que sabes</p>
          </div>
        </motion.div>

        {/* Category cards */}
        <div className="grid gap-4">
          {DAILY_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-2xl p-5 flex items-center gap-5 cursor-pointer group relative overflow-hidden"
              onClick={() => navigate(`/game?categoria=${cat.id}`)}
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Emoji */}
              <div className="text-4xl flex-shrink-0 relative z-10">{cat.emoji}</div>

              {/* Info */}
              <div className="flex-1 relative z-10">
                <h3 className="text-lg font-display font-bold text-foreground">{cat.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
              </div>

              {/* Streak */}
              <div className="flex flex-col items-center gap-1 relative z-10 mr-2">
                {cat.streak > 0 ? (
                  <>
                    <Flame className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold text-accent">{cat.streak}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Play button */}
              <Button
                size="sm"
                className="rounded-full bg-primary text-primary-foreground font-bold relative z-10 px-5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/game?categoria=${cat.id}`);
                }}
              >
                Jugar
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1"
        >
          <Flame className="w-3 h-3 text-accent" />
          Mantén tu racha jugando cada día
        </motion.p>
      </div>
    </div>
  );
};

export default DailyChallenge;
