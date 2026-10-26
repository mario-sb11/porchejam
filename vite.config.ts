import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

/**
 * En desarrollo sirve las funciones de /api (las mismas que despliega Vercel) desde el propio
 * servidor de Vite, así `npm run dev` levanta frontend y backend a la vez sin servidor aparte.
 */
function apiDevServer(): Plugin {
  const apiDir = path.resolve(__dirname, "api");

  return {
    name: "porchejam-api-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const route = url.pathname.slice("/api/".length).replace(/\/$/, "");
        // Solo rutas simples: evita que alguien salga de la carpeta /api con "../".
        const file = path.join(apiDir, `${route}.ts`);
        if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(route) || route.split("/").some((p) => p.startsWith("_")) || !fs.existsSync(file)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "No encontrado" }));
        }

        try {
          const mod = await server.ssrLoadModule(file);
          const method = (req.method ?? "GET").toUpperCase();
          const fn = mod[method];
          if (typeof fn !== "function") {
            res.statusCode = 405;
            return res.end(JSON.stringify({ error: "Método no permitido" }));
          }
          const response: Response = await fn(new Request(url, { method }));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(`[api] ${req.url}: ${String(error)}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Error interno" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    hmr: { overlay: false },
  },
  plugins: [react(), apiDevServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
