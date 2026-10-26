import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateLegacyStorage } from "./lib/storage";

// Conserva el progreso guardado por versiones anteriores (claves "porchify_*").
migrateLegacyStorage();

createRoot(document.getElementById("root")!).render(<App />);
