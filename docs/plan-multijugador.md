# Plan: Arena Online (multijugador en tiempo real)

Estado: **diseño**. Se implementa cuando las fases 1–3 estén en producción, porque necesita
probarse con varios dispositivos a la vez.

## Experiencia

1. El anfitrión elige playlist/artistas y ajustes (rondas, segundos de audio, modo de respuesta) y
   crea una sala. Recibe un código de 6 letras (`PJ-4KQ7`) y un enlace para compartir.
2. Los demás entran con el código o el enlace, eligen nombre y avatar. Lobby con quién está listo.
3. Cada ronda suena el mismo fragmento a la vez en todos los móviles. Cada uno responde en el suyo
   (buscador o texto libre). Puntos por acertar y por rapidez, como en solitario.
4. Entre rondas, clasificación animada (ya existe `BetweenRoundsRanking`). Al final, podio
   (`FinalResults`) y "Revancha".

## Arquitectura

```
Móvil anfitrión ─┐                         ┌─ /api/room/* (Vercel): crea salas, elige canciones,
Móvil jugador  ──┼── Supabase Realtime ────┤   comprueba respuestas y calcula puntos
Móvil jugador  ──┘   (canal room:CÓDIGO)   └─ Postgres: rooms, room_players, room_rounds, room_answers
```

- **Supabase Realtime**: `Presence` para saber quién está en la sala y `Broadcast` para los eventos
  (`round:start`, `round:end`, `game:end`). Sin servidor propio de WebSockets.
- **El servidor manda, no el anfitrión**: las canciones y las respuestas correctas viven solo en el
  servidor (`/api/room/*` con la clave de servicio de Supabase, nunca en el navegador). Los
  móviles solo reciben el audio; envían su respuesta y el servidor devuelve si acierta y cuántos
  puntos suma. Así nadie puede hacer trampas mirando la red, tampoco el anfitrión.
- **Invitados sin cuenta**: Supabase *anonymous sign-in* da a cada invitado un usuario temporal,
  necesario para que la seguridad por filas sepa quién es quién. Si luego crea cuenta, se vincula.
- **Canales privados**: Realtime Authorization con RLS en `realtime.messages`: solo los jugadores de
  la sala pueden escuchar su canal.

## Sincronización del audio

- El servidor fija `startsAt` (hora del servidor + 3 s) al empezar cada ronda.
- Cada móvil estima su desfase con el reloj del servidor (cabecera `Date` de `/api`, varias muestras)
  y precarga el audio durante la cuenta atrás, así suena en todos a la vez (±100 ms).
- El tiempo de respuesta se mide en el servidor (`answeredAt - startsAt`), no en el móvil.

## Datos

| Tabla | Campos clave |
| --- | --- |
| `rooms` | `code` (único), `host_id`, `settings` (jsonb), `status` (lobby/playing/finished), `expires_at` |
| `room_players` | `room_id`, `user_id`, `display_name`, `avatar`, `score`, `joined_at` |
| `room_rounds` | `room_id`, `number`, `track_id` (privado), `preview_url`, `starts_at`, `ends_at` |
| `room_answers` | `round_id`, `user_id`, `track_id`, `correct`, `points`, `answered_at` (una por jugador) |

RLS: los jugadores ven su sala, sus jugadores y sus rondas **sin** `track_id` (vista o columna sin
permiso); `room_answers` solo la propia hasta que termina la ronda. Las salas caducan a las 6 h y
se limpian con un cron diario.

## Seguridad y límites

- Código de sala con alfabeto sin caracteres confusos; 30 bits de entropía.
- Máximo 12 jugadores por sala y una respuesta por jugador y ronda (restricción única).
- Límite de creación de salas por usuario (5 por hora) y de mensajes por segundo.
- Si el anfitrión se va, pasa a ser anfitrión el jugador más antiguo.
- Plan gratuito de Supabase: 200 conexiones simultáneas y 2 M de mensajes al mes; de sobra para
  empezar.

## Fases

1. Salas, lobby con presencia y unión por código/enlace.
2. Rondas sincronizadas con respuestas validadas en servidor y clasificación entre rondas.
3. Final, revancha, reconexión y cambio de anfitrión.
4. Comodines (distorsión, robo de tiempo, escudo...) de la biblia original.

## Requisitos previos

- Fase 2 aplicada (cuentas y Supabase configurado) y clave de servicio de Supabase como variable
  **secreta** en Vercel (`SUPABASE_SECRET_KEY`), nunca con prefijo `VITE_`.
- Añadir `wss://<proyecto>.supabase.co` a `connect-src` de la CSP en `vercel.json`.
