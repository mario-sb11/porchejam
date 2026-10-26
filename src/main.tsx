import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateLegacyStorage } from "./lib/storage";
import { inject as injectAnalytics } from "@vercel/analytics";

// Conserva el progreso guardado por versiones anteriores (claves "porchify_*").
migrateLegacyStorage();

// Analítica de Vercel: sin cookies ni datos personales, solo visitas agregadas.
// Se activa en el panel de Vercel (Analytics → Enable); si no está activada no hace nada.
if (import.meta.env.PROD) injectAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
