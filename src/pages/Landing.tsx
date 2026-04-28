import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Headphones, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VinylRecord from "@/components/VinylRecord";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const savedUsername = localStorage.getItem("porchejam_username");
    // Si ya hay usuario guardado, lo mandamos directo al dashboard
    if (savedUsername?.trim()) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      localStorage.setItem("porchejam_username", nickname.trim());
      navigate("/dashboard");
    }
  };

  const handleGoogleLogin = () => {
    console.log("Iniciando sesión con Google...");
    alert("¡Pronto conectaremos esto con la base de datos!");
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
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="h-14 w-full rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </button>

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