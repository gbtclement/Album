import Link from "next/link";

// Adresse de la page avec certains paramètres changés (les autres, comme la rareté choisie, sont gardés)
export function withParams(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

// Choix du tri sous forme de liens : fonctionne sans JavaScript et garde le tri dans l'adresse
export function SortLinks({
  options,
  current,
  href,
}: {
  options: Array<{ value: string; label: string }>;
  current: string;
  href: (value: string) => string;
}) {
  return (
    <nav className="sortbar" aria-label="Trier">
      <span>Trier</span>
      {options.map((option) => (
        <Link key={option.value} href={href(option.value)} aria-current={option.value === current ? "true" : undefined} scroll={false}>
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn" rel="prev">Précédente</Link>
      ) : (
        <span className="btn" aria-disabled="true">Précédente</span>
      )}
      <span className="pager-pos">
        Page <b>{page}</b> sur {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="btn" rel="next">Suivante</Link>
      ) : (
        <span className="btn" aria-disabled="true">Suivante</span>
      )}
    </nav>
  );
}
