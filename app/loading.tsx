// Affiché pendant le chargement d'une page (navigation et rendu à la requête)
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center text-zinc-500">
      <p role="status">Chargement...</p>
    </main>
  );
}
