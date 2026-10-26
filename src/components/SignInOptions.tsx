import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const GoogleIcon = () => (
  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Botones para iniciar sesión según los métodos activados en este despliegue.
 * Si no hay cuentas activadas, muestra el botón de Google como "Próximamente".
 */
const SignInOptions = () => {
  const { accountsEnabled, providers, signInWithGoogle, signInWithEmail } = useAuth();
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!accountsEnabled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Muy pronto podrás guardar tu progreso con tu cuenta de Google"
        className="relative h-14 w-full rounded-full bg-white/80 text-black font-bold text-lg flex items-center justify-center opacity-60 cursor-not-allowed"
      >
        <GoogleIcon />
        Continuar con Google
        <span className="absolute -top-2 right-4 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">Próximamente</span>
      </button>
    );
  }

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle(); // redirige a Google
    } catch {
      setError("No se pudo conectar con Google. Inténtalo de nuevo.");
      setBusy(null);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Escribe un email válido.");
      return;
    }
    setError(null);
    setBusy("email");
    try {
      await signInWithEmail(email);
      setEmailSent(true);
    } catch {
      setError("No se pudo enviar el enlace. Espera un momento y vuelve a intentarlo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {providers.has("google") && (
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy !== null}
          className="h-14 w-full rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] disabled:opacity-70"
        >
          {busy === "google" ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <GoogleIcon />}
          Continuar con Google
        </button>
      )}

      {providers.has("email") && !showEmail && !emailSent && (
        <Button type="button" variant="outline" onClick={() => setShowEmail(true)} className="h-12 rounded-full border-white/20 bg-white/5">
          <Mail className="w-4 h-4 mr-2" /> Entrar con email
        </Button>
      )}

      {providers.has("email") && showEmail && !emailSent && (
        <form onSubmit={handleEmail} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            className="h-12 rounded-full glass border-white/20 px-5"
            required
          />
          <Button type="submit" disabled={busy !== null} className="h-12 rounded-full px-6 font-bold">
            {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar enlace"}
          </Button>
        </form>
      )}

      {emailSent && (
        <p role="status" className="text-sm text-center text-primary">
          Te hemos enviado un enlace a {email.trim()}. Ábrelo en este dispositivo para entrar.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-center text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default SignInOptions;
