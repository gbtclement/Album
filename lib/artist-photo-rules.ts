// Photos d'artistes venant de Deezer : comment reconnaître le bon artiste. Ce fichier ne dépend pas de la base.
// Deezer cherche par nom, et deux artistes peuvent porter le même : on ne garde un artiste que si l'un de
// ses albums porte le titre d'un album de notre catalogue. Sinon pas de photo (l'initiale reste affichée).

// Lecture d'une adresse de l'API Deezer (https://api.deezer.com), remplaçable dans les tests
export type DeezerGet = (path: string) => Promise<{ data?: unknown[] } | null>;

type DeezerArtist = { id: number; name: string; picture_xl?: string; nb_fan?: number };

// Homonymes examinés au plus (les plus suivis d'abord) : chacun coûte une requête
const MAX_CANDIDATES = 3;

// « OK Computer (Remastered) » et « ok computer » deviennent identiques : minuscules, sans accents,
// sans mention entre parenthèses ou crochets, « & » lu « and », ponctuation remplacée par des espaces
export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Deezer renvoie une image grise par défaut quand l'artiste n'a pas de photo : son adresse n'a pas d'identifiant
// (« /images/artist//1000x1000… »)
export function usablePicture(url: string | undefined | null) {
  if (!url || url.includes("/images/artist//")) return null;
  return url;
}

// Même album : titres identiques, ou titre Deezer qui commence par le nôtre (« OK Computer OKNOTOK 1997 2017 »)
function sameAlbum(deezerTitle: string, ours: Set<string>) {
  const title = normalizeName(deezerTitle);
  if (ours.has(title)) return true;
  return [...ours].some((own) => own.length >= 4 && title.startsWith(`${own} `));
}

export async function findDeezerArtist(name: string, albumTitles: string[], get: DeezerGet): Promise<{ id: number; picture: string } | null> {
  const wanted = normalizeName(name);
  if (!wanted) return null;
  const search = await get(`/search/artist?q=${encodeURIComponent(name)}&limit=10`);
  const candidates = ((search?.data ?? []) as DeezerArtist[])
    .filter((artist) => normalizeName(artist.name) === wanted)
    .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))
    .slice(0, MAX_CANDIDATES);

  const ours = new Set(albumTitles.map(normalizeName).filter(Boolean));
  for (const candidate of candidates) {
    const albums = await get(`/artist/${candidate.id}/albums?limit=100`);
    const titles = ((albums?.data ?? []) as Array<{ title?: string }>).map((album) => album.title ?? "");
    if (titles.some((title) => sameAlbum(title, ours))) {
      const picture = usablePicture(candidate.picture_xl);
      return picture ? { id: candidate.id, picture } : null;
    }
  }
  return null;
}
