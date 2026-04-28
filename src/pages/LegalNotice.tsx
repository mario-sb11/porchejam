const LegalNotice = () => {
  return (
    <div className="min-h-screen gradient-bg px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-6 text-zinc-200 backdrop-blur-sm">
        <h1 className="mb-4 text-3xl font-bold">Aviso Legal</h1>
        <p className="text-sm text-zinc-300">
          Las marcas y contenidos musicales pertenecen a sus respectivos titulares.
          PorcheJam utiliza la Deezer API para funcionalidades de búsqueda y preview.
        </p>
      </div>
    </div>
  );
};

export default LegalNotice;
