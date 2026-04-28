import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const COOKIE_FLAG_KEY = "porchejam_cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_FLAG_KEY) === "accepted";
    setVisible(!accepted);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_FLAG_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/15 bg-black/80 p-4 text-sm text-zinc-300 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <p>
          Usamos cookies para guardar tu progreso y tus monedas dentro de Porchify.
        </p>
        <Button
          onClick={acceptCookies}
          size="sm"
          className="rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Aceptar
        </Button>
      </div>
    </div>
  );
};

export default CookieBanner;
