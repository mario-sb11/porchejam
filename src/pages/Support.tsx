import { motion } from "framer-motion";
import { ArrowLeft, Coffee, Heart, Server, Sparkles } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { donationUrl } from "@/lib/donations";

const reasons = [
  { icon: Server, title: "Mantener los servidores", text: "Base de datos, cuentas y el backend que habla con Deezer." },
  { icon: Sparkles, title: "Nuevos modos", text: "Multijugador online, más categorías diarias y retos nuevos." },
  { icon: Heart, title: "Sin anuncios molestos", text: "Cuanto más apoyo, más tiempo seguirá siendo limpio y gratis." },
];

const Support = () => {
  const navigate = useNavigate();
  if (!donationUrl) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen gradient-bg px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground mb-6" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="text-6xl mb-4" aria-hidden="true">🦝☕</div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground">Apoya PorcheJam</h1>
          <p className="text-muted-foreground mt-3">
            PorcheJam es gratis y lo hace una sola persona. Si te lo pasas bien jugando con tus amigos, puedes invitar a
            Mapi a un café para que siga habiendo temazos.
          </p>
        </motion.div>

        <div className="grid gap-3 mb-10">
          {reasons.map((r, i) => (
            <motion.div key={r.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }} className="glass rounded-2xl p-4 flex items-start gap-4">
              <div className="p-2 rounded-xl bg-primary/15 text-primary"><r.icon className="w-5 h-5" /></div>
              <div>
                <h2 className="font-display font-bold text-foreground">{r.title}</h2>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg" className="h-14 px-8 rounded-full text-lg font-bold glow-green">
            <a href={donationUrl} target="_blank" rel="noopener noreferrer">
              <Coffee className="w-5 h-5 mr-2" /> Invitar a un café
            </a>
          </Button>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Se abre una página externa de pago. PorcheJam no recibe ni guarda tus datos de pago. Apoyar es totalmente
            voluntario y no desbloquea ventajas en el juego.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;
