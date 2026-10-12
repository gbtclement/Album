import { fetchCoverUrl } from "@/lib/musicbrainz";
import { findDeezerCover } from "@/lib/streaming";

// L'image répond-elle vraiment ? (Cover Art Archive redirige vers archive.org, qui peut renvoyer 404 ou 500)
export async function coverWorks(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
    await res.body?.cancel();
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

// Cherche une autre pochette qui fonctionne : d'abord l'image principale de l'album sur Cover Art Archive
// (qui peut différer de celle de l'import), sinon la pochette Deezer.
export async function findReplacementCover(album: { mbid: string; artist: string; title: string; cover_url: string | null }) {
  const caa = await fetchCoverUrl(album.mbid).catch(() => null);
  if (caa && caa !== album.cover_url && (await coverWorks(caa))) return caa;

  const deezer = await findDeezerCover(album.artist, album.title).catch(() => null);
  if (deezer && deezer !== album.cover_url && (await coverWorks(deezer))) return deezer;
  return null;
}
