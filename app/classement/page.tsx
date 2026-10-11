import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CrownIcon } from "@/components/icons";
import { Avatar } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { listFriends } from "@/lib/friends";
import { getPlayerRank, getRankingAmong, getTopPlayers } from "@/lib/leaderboard";
import { currentSeason } from "@/lib/pass";
import { seasonEnd } from "@/lib/pass-rules";
import { getSeasonRank, getSeasonTop } from "@/lib/season";
import { SEASON_REWARD_TABLE, seasonName, seasonReward, seasonRewardLabel } from "@/lib/season-rules";

export const metadata: Metadata = { title: "Classement" };

type Props = {
  searchParams: Promise<{ vue?: string }>;
};

type View = "global" | "amis" | "saison";

// Ligne commune aux trois classements : détail sous le pseudo propre à chacun
type Row = { rank: number; user_id: string; pseudo: string; score: number; detail: string };

function PodiumStep({ row, place, isMe }: { row: Row | undefined; place: 1 | 2 | 3; isMe: boolean }) {
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

function LeaderLine({ row, isMe }: { row: Row; isMe: boolean }) {
  return (
    <div className={`item${isMe ? " me" : ""}`}>
      <span className="rank">{row.rank}</span>
      <Avatar name={row.pseudo} />
      <div className="l">
        <strong>{row.pseudo}{isMe ? " (toi)" : ""}</strong>
        {row.detail && <small>{row.detail}</small>}
      </div>
      <span className="price">{row.score.toLocaleString("fr-FR")}</span>
    </div>
  );
}

function collectionDetail(row: { albums: number; rares: number }) {
  return `${row.albums} album${row.albums > 1 ? "s" : ""} · ${row.rares} épique${row.rares > 1 ? "s" : ""} ou légendaire${row.rares > 1 ? "s" : ""}`;
}

// Sous un joueur du top 20 de la saison : ce qu'il gagnerait s'il finissait à cette place
function seasonDetail(rank: number) {
  const reward = seasonReward(rank);
  if (!reward) return "";
  const parts = [`${reward.coins.toLocaleString("fr-FR")} pièces`];
  if (reward.legendary) parts.push(`${reward.legendary} Légendaire`);
  if (reward.epic) parts.push(`${reward.epic} Épique${reward.epic > 1 ? "s" : ""}`);
  if (reward.classic) parts.push(`${reward.classic} pack${reward.classic > 1 ? "s" : ""}`);
  return `Gagne ${parts.join(" + ")}`;
}

function daysLeft(endsAt: Date) {
  const hours = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 3_600_000));
  if (hours >= 48) return `${Math.floor(hours / 24)} jours`;
  if (hours >= 1) return `${hours} h`;
  return "moins d'une heure";
}

const SUBTITLES: Record<View, string> = {
  global: "Score = albums différents pondérés par rareté (1 / 2 / 5 / 10 / 25). Les doublons ne comptent qu'une fois.",
  amis: "Le même score, entre toi et tes amis.",
  saison: "Points du mois : chaque carte ouverte en pack (1 / 2 / 5 / 10 / 25), doublons compris. Le marché, les échanges et la pioche ne comptent pas.",
};

export default async function ClassementPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;
  const { vue } = await searchParams;
  const view: View = vue === "amis" ? "amis" : vue === "saison" ? "saison" : "global";
  const season = currentSeason();

  let rows: Row[];
  let me: Row | null = null;
  if (view === "saison") {
    rows = (await getSeasonTop(100)).map((row) => ({ ...row, detail: seasonDetail(row.rank) }));
    const mine = await getSeasonRank(userId);
    me = mine && { ...mine, detail: seasonDetail(mine.rank) };
  } else if (view === "amis") {
    rows = (await getRankingAmong([userId, ...(await listFriends(userId)).map((friend) => friend.id)])).map((row) => ({ ...row, detail: collectionDetail(row) }));
  } else {
    rows = (await getTopPlayers(100)).map((row) => ({ ...row, detail: collectionDetail(row) }));
    const mine = await getPlayerRank(userId);
    me = mine && { ...mine, detail: collectionDetail(mine) };
  }
  const meShown = rows.some((row) => row.user_id === userId);
  const [first, second, third] = rows;

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Classement</h1>
        <p className="sub">{SUBTITLES[view]}</p>

        <nav className="seg" aria-label="Type de classement">
          <Link href="/classement" aria-current={view === "global" ? "page" : undefined}>Global</Link>
          <Link href="/classement?vue=amis" aria-current={view === "amis" ? "page" : undefined}>Amis</Link>
          <Link href="/classement?vue=saison" aria-current={view === "saison" ? "page" : undefined}>Saison</Link>
        </nav>

        {view === "saison" && (
          <p className="season-banner">
            <strong>{seasonName(season)}</strong>
            <span>Fin dans {daysLeft(seasonEnd(season))} · le top 20 est récompensé</span>
          </p>
        )}

        {rows.length === 0 ? (
          <p className="empty">
            {view === "saison"
              ? "Personne n'a encore ouvert de pack ce mois-ci. Ouvre un pack pour prendre la tête !"
              : view === "amis"
                ? "Ni toi ni tes amis n'avez encore d'album. Ouvre un pack pour commencer."
                : "Personne n'a encore d'album. Ouvre un pack pour apparaître ici."}
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
            <h2 className="label">Ta position</h2>
            <LeaderLine row={me} isMe />
          </>
        )}

        {view === "saison" && (
          <>
            <h2 className="label">Récompenses de fin de saison</h2>
            <div className="season-rewards">
              {SEASON_REWARD_TABLE.map((row) => (
                <div key={row.from} className={`season-reward${row.from <= 3 ? ` podium-${row.from}` : ""}`}>
                  <b>{row.from === row.to ? (row.from === 1 ? "1er" : `${row.from}e`) : `${row.from}e – ${row.to}e`}</b>
                  <span>{seasonRewardLabel(row.reward)}</span>
                </div>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 10 }}>
              Versées automatiquement à ta première visite du mois suivant.
            </p>
          </>
        )}
      </main>
    </>
  );
}
