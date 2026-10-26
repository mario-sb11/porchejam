import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NOTICE_KEY = "porchejam_cookie_consent";

/**
 * Aviso informativo. PorcheJam no usa cookies de seguimiento ni publicidad: solo guarda en el
 * navegador lo imprescindible para jugar (nombre, progreso, ajustes) y la analítica es anónima
 * y sin cookies, así que no hace falta pedir consentimiento, solo informar.
 * Si algún día se añaden anuncios, aquí irá un gestor de consentimiento de verdad.
 */
const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(NOTICE_KEY) !== "accepted");
    } catch {
      setVisible(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(NOTICE_KEY, "accepted");
    } catch {
      /* sin almacenamiento el aviso volverá a salir, nada más */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4" role="region" aria-label="Aviso de privacidad">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/15 bg-black/80 p-4 text-sm text-zinc-300 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <p>
          PorcheJam guarda tu nombre y tu progreso en este navegador para que puedas jugar. No usamos cookies de
          seguimiento ni publicidad.{" "}
          <Link to="/privacy" className="underline hover:text-white">
            Más info
          </Link>
        </p>
        <Button onClick={dismiss} size="sm" className="rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
          Entendido
        </Button>
      </div>
    </div>
  );
};

export default CookieBanner;
