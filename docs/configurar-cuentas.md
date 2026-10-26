# Activar las cuentas (Supabase + Google)

La app funciona sin cuentas (modo invitado). Para activarlas hacen falta estos pasos, una sola vez.

## 1. Base de datos

Aplica, en orden, los archivos de `supabase/migrations/` en el proyecto `porchejam` de Supabase
(SQL Editor → pegar → Run, o pedírselo a Claude). Crean:

| Tabla | Contenido | Quién la lee |
| --- | --- | --- |
| `profiles` | nombre y avatar | todos (es público) |
| `player_stats` | récord, partidas, aciertos, modo favorito | solo su dueño |
| `matches` | últimas 50 partidas | solo su dueño |

Nadie puede escribir directamente en `player_stats` ni en `matches`: solo a través de las funciones
`record_match` e `import_guest_stats`, que validan los datos y limitan la frecuencia.
`delete_my_account` permite a cada jugador borrar su cuenta y todos sus datos (RGPD).

## 2. URLs permitidas en Supabase

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://porche-jam.vercel.app`
- **Redirect URLs:** añade
  - `https://porche-jam.vercel.app/**`
  - `https://porche-jam-*-mario2004betis-6690s-projects.vercel.app/**` (despliegues de prueba)
  - `http://127.0.0.1:5173/**` (desarrollo)

## 3. Login con Google

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto → *APIs y servicios* →
   *Pantalla de consentimiento de OAuth* (tipo Externo, nombre "PorcheJam", tu email de contacto).
2. *Credenciales* → *Crear credenciales* → *ID de cliente de OAuth* → tipo *Aplicación web*.
   - **URI de redireccionamiento autorizado:** `https://podrqpgvmtvkdehxvemw.supabase.co/auth/v1/callback`
3. Copia el *ID de cliente* y el *Secreto*.
4. Supabase → Authentication → Sign In / Providers → **Google** → actívalo y pega ambos valores.

## 4. Login con email (opcional)

El servidor de correo que trae Supabase de serie solo envía a los miembros de tu organización, así
que para usuarios reales hace falta un SMTP propio (por ejemplo Resend, con plan gratuito):
Supabase → Authentication → Emails → SMTP Settings.

## 5. Activarlo en la web

En Vercel → proyecto `porche-jam` → Settings → Environment Variables:

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://podrqpgvmtvkdehxvemw.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_...` (Supabase → Settings → API Keys) |
| `VITE_AUTH_PROVIDERS` | `google` (o `google,email` cuando haya SMTP) |

Vuelve a desplegar. Mientras `VITE_AUTH_PROVIDERS` esté vacío, el botón de Google sale como
"Próximamente" y todo sigue en modo invitado.

## Cómo funciona

- **Invitado:** todo se guarda en el navegador, igual que siempre. No necesita aceptar cookies
  porque son datos imprescindibles para jugar.
- **Al crear la cuenta:** lo jugado como invitado se sube una única vez a la cuenta.
- **Con cuenta:** cada partida se guarda en el navegador al instante y en la nube después; la nube
  manda y el navegador actúa como caché.
- **Al cerrar sesión:** se borra el progreso de ese navegador (por si es un dispositivo compartido).
