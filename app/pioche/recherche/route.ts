import { auth } from "@/auth";
import { searchAlbumTitles } from "@/lib/daily-draw";

// Suggestions de la pioche du jour : ?q=<début du titre>
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Connexion requise" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ albums: await searchAlbumTitles(query.slice(0, 80)) });
}
