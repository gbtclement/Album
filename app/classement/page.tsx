import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CrownIcon } from "@/components/icons";
import { Avatar } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { listFriends } from "@/lib/friends";
import { getPlayerRank, getRankingAmong, getTopPlayers, type LeaderRow } from "@/lib/leaderboard";

export const metadata: Metadata = { title: "Classement" };

type Props = {
  searchParams: Promise<{ vue?: string }>;
};

function PodiumStep({ row, place, isMe }: { row: LeaderRow | undefined; place: 1 | 2 | 3; isMe: boolean }) {
  if (!row) return <div />;
  const cls = place === 1 ? "first" : place === 2 ? "second" : "third";
  return (
    <div className={`step ${cls}`}>
      {place === 1 && <CrownIcon className="crown" />}
      <Avatar name={row.pseudo} />
      <span className="n">{row.pseudo}{isMe ? " (toi)" : ""}</span>
      <span className="price">{row.score.toLocaleString("fr-FR")}</span>
      <div className="block">{place}</div>
    </div>
  );
}

function LeaderLine({ row, isMe }: { row: LeaderRow; isMe: boolean }) {
  return (
    <div className={`item${isMe ? " me" : ""}`}>
      <span className="rank">{row.rank}</span>
      <Avatar name={row.pseudo} />
      <div className="l">
        <strong>{row.pseudo}{isMe ? " (toi)" : ""}</strong>
        <small>{row.albums} album{row.albums > 1 ? "s" : ""} · {row.rares} épique{row.rares > 1 ? "s" : ""} ou légendaire{row.rares > 1 ? "s" : ""}</small>
      </div>
      <span className="price">{row.score.toLocaleString("fr-FR")}</span>
    </div>
  );
}

export default async function ClassementPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;
  const { vue } = await searchParams;
  const friendsView = vue === "amis";

  const rows = friendsView
    ? await getRankingAmong([userId, ...(await listFriends(userId)).map((friend) => friend.id)])
    : await getTopPlayers(100);
  const me = friendsView ? null : await getPlayerRank(userId);
  const meShown = rows.some((row) => row.user_id === userId);
  const [first, second, third] = rows;

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Classement</h1>
        <p className="sub">Score = albums différents pondérés par rareté (1 / 2 / 5 / 10 / 25). Les doublons ne comptent qu&apos;une fois.</p>

        <nav className="seg" aria-label="Classement global ou entre amis">
          <Link href="/classement" aria-current={friendsView ? undefined : "page"}>Global</Link>
          <Link href="/classement?vue=amis" aria-current={friendsView ? "page" : undefined}>Amis</Link>
        </nav>

        {rows.length === 0 ? (
          <p className="empty">
            {friendsView ? "Ni toi ni tes amis n'avez encore d'album. Ouvre un pack pour commencer." : "Personne n'a encore d'album. Ouvre un pack pour apparaître ici."}
          </p>
        ) : (
          <>
            <div className="podium">
              <PodiumStep row={second} place={2} isMe={second?.user_id === userId} />
              <PodiumStep row={first} place={1} isMe={first?.user_id === userId} />
              <PodiumStep row={third} place={3} isMe={third?.user_id === userId} />
            </div>
            <div className="stack">
              {rows.slice(3).map((row) => (
                <LeaderLine key={row.user_id} row={row} isMe={row.user_id === userId} />
              ))}
            </div>
          </>
        )}

        {me && !meShown && (
          <>
            <div className="label">Ta position</div>
            <LeaderLine row={me} isMe />
          </>
        )}
      </main>
    </>
  );
}
