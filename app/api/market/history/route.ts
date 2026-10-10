import { findAlbumBySlug } from "@/lib/catalog";
import { clampDays, getSeries, variationPercent } from "@/lib/market-stats";

// Historique des prix : ?album=<slug> pour un album, sans paramètre pour le marché entier.
// ?jours=<n> règle la période (30 par défaut, 365 au maximum).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = clampDays(url.searchParams.get("jours"));
  const slug = url.searchParams.get("album");

  let albumId: string | null = null;
  if (slug) {
    const album = await findAlbumBySlug(slug);
    if (!album) return Response.json({ error: "Album introuvable" }, { status: 404 });
    albumId = album.id;
  }

  const points = await getSeries(days, albumId);
  return Response.json({ points, variation: variationPercent(points) });
}
