import { motion } from "framer-motion";

interface CircularTimerProps {
  timeRemaining: number;
  maxTime: number;
}

const CircularTimer = ({ timeRemaining, maxTime }: CircularTimerProps) => {
  const progress = Math.max(0, Math.min(1, timeRemaining / maxTime));
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (progress > 0.5) return "hsl(var(--primary))";
    if (progress > 0.25) return "hsl(var(--secondary))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="54" fill="none"
          stroke={getColor()} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.2, ease: "linear" }}
          style={{ filter: `drop-shadow(0 0 8px ${getColor()})` }}
        />
      </svg>
      {/* Fondo oscuro para que el número sea hiper-legible sobre la portada */}
      <div className="absolute w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
        <span className="text-4xl font-display font-black text-white drop-shadow-md">
          {Math.ceil(timeRemaining)}
        </span>
      </div>
    </div>
  );
};

export default CircularTimer;