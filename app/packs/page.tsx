import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DrawBanner } from "@/components/draw-banner";
import { SiteNav } from "@/components/site-nav";
import { isDrawPending } from "@/lib/daily-draw";
import { db } from "@/lib/db";
import { getPackState } from "@/lib/packs";
import { PackRoom } from "./pack-opener";

export const metadata: Metadata = { title: "Packs" };

export default async function PacksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const [state, settings, drawPending] = await Promise.all([
    getPackState(session.user.id),
    db.query<{ auto_reveal: boolean }>("select auto_reveal from users where id = $1", [session.user.id]),
    isDrawPending(session.user.id),
  ]);

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <PackRoom stock={state.stock} autoReveal={settings.rows[0]?.auto_reveal ?? false} />
        <div style={{ maxWidth: 420, margin: "8px auto 0" }}>
          <DrawBanner pending={drawPending} />
        </div>
      </main>
    </>
  );
}
