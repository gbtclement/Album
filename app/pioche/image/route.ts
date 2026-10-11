import sharp from "sharp";
import { auth } from "@/auth";
import { getDrawCrop } from "@/lib/daily-draw";

const OUTPUT_SIZE = 480;

// Morceau de la pochette du jour, découpé ici sur le serveur : le navigateur ne reçoit jamais l'image entière
// ni son adresse (sinon un clic droit sur l'image donnerait la réponse)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Connexion requise", { status: 401 });

  const crop = await getDrawCrop(session.user.id);
  if (!crop?.coverUrl) return new Response("Aucune pioche aujourd'hui", { status: 404 });

  // Le morceau est agrandi : on part de la version 1200 px de Cover Art Archive quand elle existe, sinon de la pochette enregistrée
  const url = crop.coverUrl.replace(/^http:\/\//, "https://");
  const download = (address: string) => fetch(address, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  let source = /-500\.jpg$/.test(url) ? await download(url.replace(/-500\.jpg$/, "-1200.jpg")) : null;
  if (!source?.ok) source = await download(url);
  if (!source?.ok) return new Response("Pochette indisponible", { status: 502 });

  const image = sharp(Buffer.from(await source.arrayBuffer()));
  const { width = 0, height = 0 } = await image.metadata();
  if (!width || !height) return new Response("Pochette illisible", { status: 502 });

  const piece = await image
    .extract({
      left: Math.floor(crop.x * width),
      top: Math.floor(crop.y * height),
      width: Math.max(1, Math.floor(crop.size * width)),
      height: Math.max(1, Math.floor(crop.size * height)),
    })
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  return new Response(new Uint8Array(piece), {
    headers: {
      "Content-Type": "image/webp",
      // Propre au joueur et au jour : jamais gardée par un cache partagé
      "Cache-Control": "private, no-store",
    },
  });
}
