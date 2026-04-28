import { motion } from "framer-motion";

interface MusicVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
}

const MusicVisualizer = ({ isPlaying, barCount = 32 }: MusicVisualizerProps) => {
  return (
    <div className="flex items-end justify-center gap-[2px] h-24 md:h-32">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 md:w-2 rounded-full bg-gradient-to-t from-primary via-secondary to-accent"
          animate={
            isPlaying
              ? {
                  height: [
                    `${20 + Math.random() * 30}%`,
                    `${50 + Math.random() * 50}%`,
                    `${10 + Math.random() * 40}%`,
                    `${60 + Math.random() * 40}%`,
                    `${20 + Math.random() * 30}%`,
                  ],
                }
              : { height: "10%" }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.8 + Math.random() * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.03,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
};

export default MusicVisualizer;
