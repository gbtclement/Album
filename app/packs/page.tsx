import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { getPackState } from "@/lib/packs";
import { PackOpener } from "./pack-opener";

export default async function PacksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const state = await getPackState(session.user.id);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Packs</h1>
        <PackOpener
          initialStock={state.stock}
          initialNextPackAt={state.nextPackAt ? state.nextPackAt.toISOString() : null}
        />
      </main>
    </>
  );
}
