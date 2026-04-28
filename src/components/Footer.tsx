import { Link } from "react-router-dom";

const deezerBars = [
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-4",
  "h-3",
  "h-2",
];

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
        <p>PorcheJam © 2026</p>
        <div className="flex items-center gap-2">
          <span>Powered by Deezer API</span>
          <span className="inline-flex items-end gap-0.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
            {deezerBars.map((heightClass, index) => (
              <span
                key={`${heightClass}-${index}`}
                className={`w-0.5 rounded-full bg-gradient-to-t from-fuchsia-500 via-purple-500 to-cyan-400 ${heightClass}`}
              />
            ))}
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-zinc-200">
            Privacidad
          </Link>
          <Link to="/terms" className="transition-colors hover:text-zinc-200">
            Términos
          </Link>
          <Link to="/legal" className="transition-colors hover:text-zinc-200">
            Aviso Legal
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
