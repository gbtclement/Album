import { auth } from "@/auth";
import { exportUserData } from "@/lib/account";
import { HOUR, isRateLimited } from "@/lib/rate-limit";

// Téléchargement de toutes les données du joueur connecté (RGPD : droit d'accès et de portabilité), en JSON
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Connecte-toi pour télécharger tes données.", { status: 401 });

  // L'export lit beaucoup de tables : quelques téléchargements par heure suffisent
  if (await isRateLimited(`export:${session.user.id}`, 5, HOUR)) {
    return new Response("Trop de téléchargements : réessaie dans une heure.", { status: 429 });
  }

  const data = await exportUserData(session.user.id);
  if (!data) return new Response("Compte introuvable.", { status: 404 });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="album-mes-donnees-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
