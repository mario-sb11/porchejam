# PorcheJam

Este proyecto es una aplicación web fullstack dedicada al descubrimiento musical a través de mecánicas de juego basadas en la identificación de audio y la navegación de metadatos.

## Origen del proyecto (Porchify)

La idea surgió inicialmente para trabajar con las playlists de Spotify. Tras desarrollar una primera versión, las restricciones de su API en modo desarrollo (limitada a 5 usuarios específicos) impedían la publicación del proyecto. Por ello, migré la lógica a la API de Deezer, que permite un acceso abierto y una gestión de datos más flexible para el usuario final.

## Funcionalidades principales

La aplicación se estructura en torno a diferentes formas de interactuar con la música:

1. **Jam Session (Modo Principal):** Es el eje central del proyecto. Un motor de juego donde el usuario debe identificar canciones a través de fragmentos de audio de playlists dinámicas. Dentro de este motor se incluyen variantes como:
    * **Modo Solitario:** Adivinar canción/artista contra reloj, por rondas, supervivencia con vidas, modo reverso...
    * **Modo Fiesta Local:** El modo fiesta local consiste en un multijugador desde un mismo dispostivo, este modo consta de 3 submodos: Por turnos, El impostor y zumbadores.
    * **Modo Fiesta Local "Por turnos":** Adivinar canción/artista por rondas, supervivencia, la patata caliente, reversa
    * **Modo Fiesta Local "Impostor":** Dinámica de deducción social donde varios jugadores reciben la misma información sobre una canción (audio, nombre y artista), excepto 1 (el impostor) que recibirá una pista o nada, este debe fingir que tiene la misma información que el resto sin haberla recibido, los jugadores reales tienen que pillar al impostor.
    * **Modo Multijugador en línea:** Este modo se encuentra en desarrollo.
2. **Music Race:** Un reto de lógica y cultura musical. El objetivo es conectar un artista inicial con uno de destino navegando únicamente a través de sus álbumes, colaboraciones y artistas relacionados.
3. **Buscador y Personalización:** Herramienta para explorar el catálogo global y configurar partidas basadas en gustos específicos.
4. **Mascota Interactiva (Mapi):** Un componente de UI animado que reacciona a la interacción del usuario. Gestiona estados globales para activar el "Modo Rave", un Easter Egg que transforma la estética y el comportamiento sonoro de la aplicación.

## Metodología de Desarrollo: Vibe Coding

Este proyecto se ha ejecutado bajo la filosofía de **Vibe Coding**. Como recién graduado en DAM, he utilizado herramientas de IA generativa no solo para acelerar la escritura de código, sino para centrarme en lo que realmente aporta valor:
* **Diseño de arquitectura:** Estructurar el flujo de datos entre la API y el cliente.
* **UX/UI:** Priorizar la fluidez de las animaciones y el feedback visual.
* **Iteración rápida:** Probar y descartar mecánicas de juego en tiempo real, manteniendo el enfoque en el "vibe" y el acabado final del producto.

## Stack Tecnológico

* **Frontend:** React 18 + TypeScript (Vite), Tailwind CSS con estética Glassmorphism y Framer Motion para animaciones.
* **Backend:** funciones serverless de Vercel en `/api` (TypeScript). Actúan como capa intermedia (BFF) entre la app y la API de Deezer: validan cada parámetro, filtran los datos que necesita el cliente y cachean las respuestas en la CDN.
* **API:** Deezer API para imágenes, metadatos y previews de audio de 30 segundos.

## Arquitectura

```
Navegador (React)  ──►  /api/* (Vercel Functions)  ──►  api.deezer.com
       │                        │
       │                        └─ caché en la CDN de Vercel + reintentos si Deezer limita peticiones
       └─ audio: se descarga directamente del CDN de Deezer (no pasa por el servidor)
```

| Endpoint | Uso |
| --- | --- |
| `GET /api/top-playlists` | Playlists destacadas |
| `GET /api/search?q=&type=artist\|track\|playlist` | Buscador |
| `GET /api/tracks?id=&type=playlist\|artist\|album&index=` | Canciones con preview (paginado de 50 en 50) |
| `GET /api/race/connections?id=&type=artist\|track\|album` | Conexiones para Music Race |
| `GET /api/preview?id=` | Renueva la URL de una preview (Deezer las firma con ~15 min de validez) |

### Cuentas y progreso

* **Invitado:** el progreso se guarda en el navegador (`localStorage`, claves `porchejam_*`).
* **Con cuenta (Supabase):** login con Google, perfil público y estadísticas privadas en PostgreSQL con RLS. El progreso de invitado se importa una vez al crear la cuenta. Ver [docs/configurar-cuentas.md](docs/configurar-cuentas.md).
* Las cuentas son opcionales: sin las variables de entorno (`.env.example`) la app funciona en modo invitado.

### Seguridad

* Validación estricta de entradas en el backend (ids numéricos, tipos permitidos, límites de longitud y paginación).
* Sin CORS abierto: el backend solo se consume desde el propio dominio.
* Cabeceras de seguridad en `vercel.json`: Content-Security-Policy, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
* Los errores internos nunca se devuelven al cliente.

## Despliegue y Demo

La aplicación está desplegada en **https://porche-jam.vercel.app/**. Cada push a `main` se publica automáticamente en Vercel (frontend y backend juntos) y cada rama genera una URL de previsualización.

---

## Instalación y ejecución local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # frontend + /api en http://127.0.0.1:5173
```

No hace falta arrancar ningún servidor aparte: en desarrollo, Vite sirve también las funciones de `/api`.

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Entorno de desarrollo |
| `npm run build` | Build de producción |
| `npm run typecheck` | Comprobación de tipos (app, API y configuración) |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest) |
