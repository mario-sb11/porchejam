import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h2 className="mb-2 text-lg font-bold text-zinc-100">{title}</h2>
    <div className="space-y-2 text-sm text-zinc-300">{children}</div>
  </section>
);

const Privacy = () => {
  return (
    <div className="min-h-screen gradient-bg px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-6 text-zinc-200 backdrop-blur-sm">
        <h1 className="mb-2 text-3xl font-bold">Política de Privacidad</h1>
        <p className="text-xs text-zinc-500">Última actualización: 27 de octubre de 2026</p>

        <Section title="Resumen">
          <p>
            PorcheJam es un juego musical gratuito. Puedes jugar sin cuenta: en ese caso todo se queda en tu navegador.
            No vendemos datos, no hay publicidad y no usamos cookies de seguimiento.
          </p>
        </Section>

        <Section title="Si juegas como invitado">
          <p>
            Guardamos en el almacenamiento local de tu navegador tu nombre de jugador, tu avatar, tu progreso
            (récords, partidas, rachas de la Canción del Día) y tus ajustes. Estos datos no salen de tu dispositivo y
            puedes borrarlos cuando quieras desde los ajustes de tu navegador. Son imprescindibles para que el juego
            funcione, por eso no piden consentimiento.
          </p>
        </Section>

        <Section title="Si creas una cuenta">
          <p>
            Al iniciar sesión con Google o con tu email guardamos tu email, el nombre que muestra Google, tu nombre de
            jugador, tu avatar, tus estadísticas y tus últimas 50 partidas, para que tu progreso te siga en cualquier
            dispositivo. Tu nombre de jugador y tu avatar son públicos (los verán otros jugadores); tus estadísticas e
            historial solo los ves tú.
          </p>
          <p>
            La base legal es la ejecución del servicio que pides al crear la cuenta. Conservamos los datos mientras la
            cuenta exista; puedes borrarla en cualquier momento desde tu perfil y se eliminará todo.
          </p>
        </Section>

        <Section title="Si juegas en la Arena Online">
          <p>
            Para jugar en una sala guardamos el nombre y el avatar que eliges (los ven los demás jugadores de la sala),
            tus respuestas y tus puntos. Tu navegador se identifica con un código aleatorio del que solo guardamos una
            huella cifrada. Para evitar abusos, al crear una sala guardamos una huella cifrada e irreversible de tu
            conexión (nunca tu dirección IP). Las salas y todo lo anterior se borran automáticamente como mucho 3 horas
            después de la última actividad.
          </p>
        </Section>

        <Section title="Servicios que usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Vercel</strong> aloja la web y mide visitas de forma anónima, sin cookies.</li>
            <li><strong>Supabase</strong> guarda las cuentas y las salas de la Arena en servidores de la Unión Europea (París).</li>
            <li><strong>Google</strong>, solo si eliges iniciar sesión con Google.</li>
            <li><strong>DiceBear</strong> dibuja los avatares ilustrados; recibe tu dirección IP al cargarlos.</li>
            <li>
              <strong>Deezer</strong> proporciona las canciones: los fragmentos de audio y las portadas se cargan
              directamente desde sus servidores, que reciben tu dirección IP como en cualquier web.
            </li>
          </ul>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes acceder a tus datos, corregirlos o borrarlos, y oponerte a su tratamiento. Para cualquier consulta,
            escríbenos a través de{" "}
            <a href="https://github.com/mario-sb11/porchejam/issues" target="_blank" rel="noopener noreferrer" className="underline">
              GitHub
            </a>
            . Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de
            Datos (aepd.es).
          </p>
        </Section>

        <p className="mt-8 text-sm">
          <Link to="/" className="underline">Volver a PorcheJam</Link>
        </p>
      </article>
    </div>
  );
};

export default Privacy;
