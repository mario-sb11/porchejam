# Arena Online (multijugador)

Estado: **primera versión implementada** (rama `fase-6-arena`).

## Experiencia

1. El anfitrión elige música (Jam Session → «Arena Online»), las reglas (rondas, segundos por canción,
   modo de respuesta) y crea la sala. Recibe un código de 6 caracteres sin letras confusas
   (`K7PQ2M`) y un enlace `/arena/K7PQ2M` para compartir.
2. Los demás entran con el código (Inicio → Arena Online) o el enlace. No hace falta cuenta.
3. Cada ronda: cuenta atrás de 3 s y la canción suena a la vez en todos los móviles. Cada uno
   responde en el suyo: 4 opciones, buscador o texto libre (hasta 3 intentos, cada fallo resta).
4. Al responder todos (o al acabar el tiempo) se revela la canción con la clasificación de la ronda.
5. Podio final, lista de canciones que han sonado y «Revancha» (el anfitrión vuelve a la sala).

## Arquitectura

```
Navegador ──(supabase-js, clave publicable)──▶ public.arena_*  (funciones SECURITY DEFINER)
    │                                              │
    │                                              ▼
    │                                    esquema arena_private (no expuesto)
    │                                    rooms · players · rounds · round_keys · answers
    │
    └──▶ /api/arena/start  (Vercel) ──Deezer──▶ elige canciones ──▶ arena_server_load(secreto)
         /api/arena/audio  (Vercel) ──────────▶ audio recién firmado de la ronda en juego
```

- **Sin WebSockets**: cada móvil consulta `arena_state` (0,8 s durante la partida, 2 s en la sala
  de espera). Es robusto en móviles que bloquean conexiones en segundo plano y no necesita cambiar
  la CSP. La propia consulta hace avanzar la partida cuando vence una fase, así no depende de que
  el anfitrión siga conectado.
- **El servidor manda**: las canciones las elige Vercel y las guarda con `ARENA_SERVER_SECRET`
  (la base de datos solo guarda su hash). Hasta que se revela la ronda, el navegador solo recibe
  la URL del audio y, en modo fácil, las 4 opciones. La base de datos comprueba las respuestas y
  calcula los puntos con su reloj: `100 + 900 × tiempo restante − 150 por fallo` (mínimo 50).
- **Identidad**: un token aleatorio de 32 bytes por navegador (`localStorage`); en la base de
  datos solo su SHA-256. Si hay sesión iniciada se guarda también el `user_id`.
- **Sincronización**: cada respuesta trae `now()` del servidor; el cliente estima el desfase con la
  muestra de menor latencia y arranca el audio en `startsAt`. iOS exige desbloquear el audio con un
  toque: se hace con el primer toque en la sala usando un único elemento `<audio>`.

## Límites y seguridad

- Tablas en `arena_private`, sin permisos para `anon`/`authenticated`; solo las funciones.
- Nombres con el mismo formato que los perfiles; avatares sin caracteres peligrosos; portadas y
  audios solo de `*.dzcdn.net`.
- 12 jugadores activos por sala; una respuesta por ronda (3 intentos en texto).
- Creación de salas: 3 por minuto por navegador y 10 cada 10 minutos por conexión (HMAC de la IP
  de Cloudflare con el secreto del servidor, nunca la IP). Tope global de 5000 salas.
- Las salas se borran a las 3 h sin actividad o a los 30 min si nadie aparece.
- El anfitrión pasa al jugador activo más antiguo si se desconecta más de 20 s.
- Pruebas: `supabase/tests/arena.test.sql` (`npm run test:db`, también en CI) y `tests/api/arena.test.ts`.

## Configuración

- Vercel: `ARENA_SERVER_SECRET` (secreto, sin prefijo `VITE_`) y las variables de Supabase ya
  usadas por las cuentas.
- Supabase: `insert into arena_private.config values (true, sha256(convert_to('<secreto>', 'UTF8')))`.
  Para rotarlo, se actualizan ambos a la vez.

## Siguientes pasos

- Realtime (Broadcast) para bajar la latencia y el número de consultas si crece el uso.
- Expulsar jugadores, sala privada con contraseña y ranking global de la Arena.
- Comodines (distorsión, robo de tiempo, escudo...).
