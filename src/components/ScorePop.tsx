import { motion, AnimatePresence } from "framer-motion";

interface ScorePopProps {
  score: number | null;
  key_id: string;
}

const ScorePop = ({ score, key_id }: ScorePopProps) => {
  return (
    <AnimatePresence>
      {score !== null && (
        <motion.div
          key={key_id}
          className="text-4xl md:text-6xl font-display font-black text-glow-green text-primary"
          initial={{ scale: 0, y: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], y: -60, opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, times: [0, 0.3, 0.6, 1] }}
        >
          +{score} pts
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScorePop;
