import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Zap, RotateCcw, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MOCK_PLAYERS } from "@/data/mockData";

const confettiEmojis = ["🎉", "🎊", "✨", "🏆", "⭐"];

const FinalResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const playerScore = state?.score ?? 3200;
  const totalRounds = state?.rounds ?? 10;

  const [confetti, setConfetti] = useState<{ id: number; emoji: string; x: number; delay: number }[]>([]);

  const allPlayers = [
    { name: "Tú", avatar: "🎮", score: playerScore },
    ...MOCK_PLAYERS.slice(0, 4).map((p) => ({ name: p.name, avatar: p.avatar, score: p.score })),
  ].sort((a, b) => b.score - a.score);

  const isWinner = allPlayers[0].name === "Tú";

  useEffect(() => {
    if (isWinner) {
      const items = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        emoji: confettiEmojis[i % confettiEmojis.length],
        x: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setConfetti(items);
    }
  }, [isWinner]);

  const podiumOrder = [allPlayers[1], allPlayers[0], allPlayers[2]];
  const podiumHeights = ["h-28", "h-40", "h-20"];
  const podiumColors = ["from-gray-300 to-gray-500", "from-yellow-400 to-yellow-600", "from-amber-600 to-amber-800"];

  const stats = [
    { icon: Trophy, label: "Rondas jugadas", value: String(totalRounds), color: "text-primary" },
    { icon: Target, label: "Jugador más preciso", value: allPlayers[0].name, color: "text-secondary" },
    { icon: Zap, label: "Respuesta más rápida", value: "1.2s", color: "text-accent" },
  ];

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          className="absolute text-2xl pointer-events-none"
          style={{ left: `${c.x}%` }}
          initial={{ y: -40, opacity: 1 }}
          animate={{ y: "110vh", opacity: 0, rotate: 360 }}
          transition={{ duration: 3 + Math.random() * 2, delay: c.delay, ease: "easeIn" }}
        >
          {c.emoji}
        </motion.div>
      ))}

      <div className="max-w-lg w-full relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h1 className="text-4xl font-display font-black text-foreground">Resultados Finales</h1>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mb-10">
          {podiumOrder.map((player, i) => (
            <motion.div
              key={player.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="text-3xl mb-2">{player.avatar}</div>
              <div className="text-xs font-semibold text-foreground mb-1">{player.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{player.score.toLocaleString()} pts</div>
              <div className={`w-20 md:w-24 ${podiumHeights[i]} rounded-t-xl bg-gradient-to-t ${podiumColors[i]} flex items-start justify-center pt-3`}>
                <span className="text-2xl font-display font-black text-background/80">{i === 1 ? "1" : i === 0 ? "2" : "3"}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Full ranking */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="space-y-2 mb-10">
          {allPlayers.map((p, i) => (
            <div key={p.name} className={`glass rounded-xl p-3 flex items-center gap-3 ${p.name === "Tú" ? "border border-primary" : ""}`}>
              <span className="text-sm font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
              <span className="text-xl">{p.avatar}</span>
              <span className="flex-1 text-sm font-semibold text-foreground">{p.name}</span>
              <span className="text-sm font-bold text-primary">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="grid grid-cols-3 gap-3 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <div className="text-lg font-display font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/game")} className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold">
            <RotateCcw className="w-4 h-4 mr-2" /> Jugar de nuevo
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="h-12 px-8 rounded-full border-border text-foreground">
            <Home className="w-4 h-4 mr-2" /> Volver al inicio
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default FinalResults;
