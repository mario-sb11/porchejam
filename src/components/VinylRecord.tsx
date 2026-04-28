import { motion } from "framer-motion";

const VinylRecord = () => {
  return (
    <motion.div
      className="relative w-64 h-64 md:w-80 md:h-80"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-muted to-background border border-border" />
      {/* Grooves */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-border/30"
          style={{
            inset: `${12 + i * 8}px`,
          }}
        />
      ))}
      {/* Label center */}
      <div className="absolute inset-0 m-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-background" />
      </div>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full opacity-30 blur-xl bg-gradient-to-r from-primary/40 to-secondary/40" />
    </motion.div>
  );
};

export default VinylRecord;
