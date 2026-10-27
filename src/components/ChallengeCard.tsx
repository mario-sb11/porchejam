import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hammer, MapPin, RotateCcw } from "lucide-react";
import { PLACE_LABELS, type Challenge } from "@/data/challenges";
import { cn } from "@/lib/utils";

/**
 * Tarjeta informativa de un desafío. Al pulsarla se da la vuelta y explica dónde encontrarlo y
 * cómo se juega. Es un botón de verdad (teclado y lector de pantalla), y sin animación si el
 * sistema pide reducir movimiento.
 */
const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();
  const face = "[grid-area:card] [backface-visibility:hidden] rounded-xl p-4 flex flex-col";

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={`${challenge.title}: ${flipped ? "ocultar detalles" : "ver cómo se juega"}`}
      className="text-left [perspective:1000px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <motion.div
        className="grid [grid-template-areas:'card'] [transform-style:preserve-3d] h-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* Cara delantera */}
        <div
          aria-hidden={flipped}
          className={cn(
            face,
            "gap-2 border transition-colors",
            challenge.comingSoon ? "bg-black/20 border-white/5" : "glass border-white/10 hover:border-primary/30",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={cn("text-2xl", challenge.comingSoon && "opacity-50 grayscale")}>{challenge.icon}</span>
            {challenge.comingSoon ? (
              <span className="bg-black/60 border border-white/10 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground font-bold flex items-center gap-1">
                <Hammer className="w-2.5 h-2.5" /> Próximamente
              </span>
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden />
            )}
          </div>
          <h4 className={cn("font-semibold text-sm", challenge.comingSoon ? "text-muted-foreground" : "text-foreground")}>
            {challenge.title}
          </h4>
          <p className="text-xs text-muted-foreground">{challenge.tagline}</p>
          {challenge.places.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {challenge.places.map((place) => (
                <span key={place} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                  {PLACE_LABELS[place]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cara trasera */}
        <div
          aria-hidden={!flipped}
          className={cn(face, "gap-2 [transform:rotateY(180deg)] glass-strong border border-primary/30")}
        >
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <span aria-hidden>{challenge.icon}</span> {challenge.title}
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed">{challenge.howTo}</p>
          {challenge.where ? (
            <p className="text-[11px] text-primary mt-auto flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" aria-hidden /> {challenge.where}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-auto">Lo estamos preparando.</p>
          )}
        </div>
      </motion.div>
    </button>
  );
};

export default ChallengeCard;
