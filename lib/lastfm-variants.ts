// Last.fm range chaque version d'un album à part (« Abbey Road », « Abbey Road (Remastered) », « … (Super Deluxe
// Edition) ») et ne reconnaît pas certains signes typographiques de MusicBrainz (’ ‐ …). Ce fichier, sans base
// ni réseau, rapproche nos titres des noms Last.fm et additionne les écoutes de toutes les versions d'un album.

// Signes typographiques remplacés par leur équivalent simple, comme les écrivent les utilisateurs de Last.fm
export function lastfmText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[〜～]/g, "~")
    .replace(/\s+/g, " ")
    .trim();
}

function plain(value: string) {
  return lastfmText(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Titre complet comparable (« sgt pepper s lonely hearts club band remastered »)
export function fullTitle(value: string) {
  return plain(value);
}

// Titre de base : sans ce qui est entre parenthèses ou crochets (« (Remastered) », « [Disc 1] »)
export function baseTitle(value: string) {
  return plain(lastfmText(value).replace(/\([^)]*\)|\[[^\]]*\]/g, " "));
}

export type LastfmAlbumEntry = { name: string; playcount: number };
export type VariantMatch = { playcount: number; top: string; versions: number };

// Pour chacun de nos titres (d'un même artiste), additionne les écoutes des versions Last.fm :
// 1. une version au titre identique à l'un de nos albums lui revient (même si un autre a le même titre de base) ;
// 2. les autres versions vont à notre album de même titre de base s'il n'y en a qu'un ; s'il y en a plusieurs,
//    à celui dont le titre n'a rien entre parenthèses (« Abbey Road » plutôt que « Abbey Road (Super Deluxe) ») ;
//    sinon on ne devine pas.
export function matchVariants(ourTitles: string[], entries: LastfmAlbumEntry[]): Map<string, VariantMatch> {
  const byFull = new Map(ourTitles.map((title) => [fullTitle(title), title]));
  const byBase = new Map<string, string[]>();
  for (const title of ourTitles) byBase.set(baseTitle(title), [...(byBase.get(baseTitle(title)) ?? []), title]);

  const result = new Map<string, VariantMatch & { topCount: number }>();
  for (const entry of entries) {
    if (!(entry.playcount > 0)) continue;
    const exact = byFull.get(fullTitle(entry.name));
    const candidates = byBase.get(baseTitle(entry.name)) ?? [];
    const plainOnes = candidates.filter((title) => fullTitle(title) === baseTitle(title));
    const owner = exact ?? (candidates.length === 1 ? candidates[0] : plainOnes.length === 1 ? plainOnes[0] : null);
    if (!owner) continue;
    const current = result.get(owner) ?? { playcount: 0, top: entry.name, versions: 0, topCount: 0 };
    current.playcount += entry.playcount;
    current.versions += 1;
    if (entry.playcount > current.topCount) {
      current.top = entry.name;
      current.topCount = entry.playcount;
    }
    result.set(owner, current);
  }
  return new Map([...result].map(([title, match]) => [title, { playcount: match.playcount, top: match.top, versions: match.versions }]));
}
