import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Headphones, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VinylRecord from "@/components/VinylRecord";
import { useNavigate } from "react-router-dom";
import SignInOptions from "@/components/SignInOptions";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // al volver de Google se espera a sincronizar la cuenta
    const savedUsername = localStorage.getItem("porchejam_username");
    // Si ya hay jugador (invitado o con cuenta), directo al dashboard
    if (session || savedUsername?.trim()) {
      navigate("/dashboard");
    }
  }, [navigate, session, loading]);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      localStorage.setItem("porchejam_username", nickname.trim());
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-4 overflow-hidden relative">
      
      {/* Ambient particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-8 md:gap-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative">
          <VinylRecord />
          <motion.div className="absolute -top-4 -right-4 text-4xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Headphones className="w-10 h-10 text-secondary" />
          </motion.div>
        </motion.div>

        <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tight">
            <span className="text-primary text-glow-green">Porche</span>
            <span className="text-secondary text-glow-purple">Jam</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mt-4 max-w-md mx-auto">
            El duelo musical libre. Sin límites, sin cortes.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6, duration: 0.5 }} 
          className="flex flex-col gap-5 w-full max-w-md"
        >
          <SignInOptions />

          <div className="flex items-center gap-4 px-2">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">o entra como invitado</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form onSubmit={handleEnter} className="flex flex-col sm:flex-row items-center gap-3">
            <Input 
              type="text" 
              placeholder="Introduce tu nombre..." 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-14 px-6 text-lg rounded-full glass border-white/20 text-foreground placeholder:text-foreground/50 focus-visible:ring-primary text-center sm:text-left flex-1"
              maxLength={15}
              required
            />
            <Button
              type="submit"
              size="lg"
              disabled={!nickname.trim()}
              className="h-14 px-8 text-lg font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto flex-shrink-0"
            >
              Entrar <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-4">
            <Zap className="w-3 h-3 text-primary" /> Gratis · 100% Público
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;