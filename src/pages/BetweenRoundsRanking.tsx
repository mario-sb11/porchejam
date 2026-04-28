import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PLAYERS } from "@/data/mockData";

interface Props {
  roundNumber: number;
  totalRounds: number;
  playerScore: number;
  roundScore: number;
  onNext: () => void;
  isHost?: boolean;
}

const BetweenRoundsRanking = ({ roundNumber, totalRounds, playerScore, roundScore, onNext, isHost = true }: Props) => {
  const [countdown, setCountdown] = useState(10);

  const players = [
    { name: "Tú", avatar: "🎮", roundPts: roundScore, totalPts: playerScore, isCurrentUser: true },
    ...MOCK_PLAYERS.slice(0, 4).map((p) => ({
      name: p.name,
      avatar: p.avatar,
      roundPts: Math.floor(Math.random() * 800 + 200),
      totalPts: p.score,
      isCurrentUser: false,
    })),
  ].sort((a, b) => b.totalPts - a.totalPts);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          onNext();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onNext]);

  return (
    <div className="min-h-screen gradient-bg px-4 py-8 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-display font-bold text-foreground">Clasificación</h1>
          <p className="text-muted-foreground text-sm mt-1">Ronda {roundNumber} de {totalRounds}</p>
        </motion.div>

        <div className="space-y-3 mb-10">
          {players.map((player, i) => (
            <motion.div
              key={player.name}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className={`glass rounded-xl p-4 flex items-center gap-4 ${
                player.isCurrentUser ? "border border-primary glow-green" : ""
              }`}
            >
              <span className="text-lg font-display font-bold text-muted-foreground w-8 text-center">{i + 1}</span>
              <span className="text-2xl">{player.avatar}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{player.name}</div>
                <div className="text-xs text-primary">+{player.roundPts} pts</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-display font-bold text-foreground">{player.totalPts.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center">
          {isHost ? (
            <Button onClick={onNext} size="lg" className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold">
              Siguiente ronda ({countdown}s)
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">Esperando al host... ({countdown}s)</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default BetweenRoundsRanking;
