const CREDITS = [
  { name: "Avataaars y Bottts", author: "Pablo Stanley", license: "Uso libre personal y comercial", url: "https://avataaars.com/" },
  { name: "Adventurer", author: "Lisa Wischofsky", license: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "Lorelei", author: "Lisa Wischofsky", license: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { name: "Big Smile", author: "Ashley Seo", license: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "Notionists", author: "Zoish", license: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { name: "Open Peeps", author: "Pablo Stanley", license: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { name: "Pixel Art", author: "DiceBear", license: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
];

const LegalNotice = () => {
  return (
    <div className="min-h-screen gradient-bg px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-6 text-zinc-200 backdrop-blur-sm">
        <h1 className="mb-4 text-3xl font-bold">Aviso Legal</h1>
        <p className="text-sm text-zinc-300">
          Las marcas y contenidos musicales pertenecen a sus respectivos titulares.
          PorcheJam utiliza la Deezer API para funcionalidades de búsqueda y preview.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold text-zinc-100">Créditos de los avatares</h2>
        <p className="text-sm text-zinc-300 mb-2">
          Los avatares se generan con{" "}
          <a href="https://www.dicebear.com" target="_blank" rel="noopener noreferrer" className="underline">DiceBear</a>{" "}
          a partir de estos diseños (los personajes especiales son adaptaciones de PorcheJam):
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          {CREDITS.map((c) => (
            <li key={c.name}>
              <strong>{c.name}</strong>, de {c.author} ·{" "}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline">{c.license}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LegalNotice;
