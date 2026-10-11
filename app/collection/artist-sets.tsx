import Link from "next/link";
import type { CSSProperties } from "react";
import { Avatar, Thumb } from "@/components/game-ui";
import type { ArtistSet } from "@/lib/artist-sets";
import { PACK_SET_SIZE, SET_MIN_ALBUMS } from "@/lib/artist-set-rules";
import { RARITY_LABELS } from "@/lib/rarity";
import { claimSetAction } from "./actions";

// Onglet Artistes de la collection : un set par artiste commencé, avec sa progression et sa récompense
export function ArtistSets({ sets }: { sets: ArtistSet[] }) {
  if (sets.length === 0) {
    return (
      <p className="empty">
        Aucune collection d&apos;artiste commencée. Chaque artiste d&apos;au moins {SET_MIN_ALBUMS} albums est un set à compléter :
        ouvre des packs pour commencer.
      </p>
    );
  }

  return (
    <div className="stack two">
      {sets.map((set) => {
        const done = set.owned === set.total;
        const missing = set.albums.filter((album) => !album.owned);
        return (
          <details key={set.artist} className={`quest set${done ? " done" : ""}${set.claimed ? " claimed" : ""}`}>
            <summary>
              <Avatar name={set.artist} photo={set.photo} className="set-av" />
              <div className="l">
                <strong>{set.artist}</strong>
                <div className="bar">
                  <div style={{ width: `${(set.owned / set.total) * 100}%`, "--c": done ? "var(--gold)" : "var(--r-rare)" } as CSSProperties} />
                </div>
                <div className="q-meta">
                  <span>{set.owned} / {set.total} albums</span>
                  <span className="reward">
                    <i className="coin-i" aria-hidden="true" />
                    {set.reward.coins.toLocaleString("fr-FR")}
                    {set.reward.pack && <em> + 1 pack</em>}
                  </span>
                </div>
              </div>
              {set.claimed ? (
                <span className="btn" aria-disabled="true">Récupéré</span>
              ) : done ? (
                <form action={claimSetAction}>
                  <input type="hidden" name="artist" value={set.artist} />
                  <button type="submit" className="btn gold">Réclamer</button>
                </form>
              ) : null}
            </summary>
            <div className="set-body">
              <div className="set-thumbs">
                {set.albums.filter((album) => album.owned).map((album) => (
                  <Link key={album.slug} href={`/album/${album.slug}`} aria-label={album.title}>
                    <Thumb cover={album.coverUrl} tier={album.tier} title={album.title} />
                  </Link>
                ))}
              </div>
              {missing.length > 0 && (
                <p className="set-missing">
                  <span>À trouver :</span>{" "}
                  {missing.map((album, index) => (
                    <span key={album.slug}>
                      {index > 0 && " · "}
                      <Link href={`/album/${album.slug}`} className={`tier-${album.tier}`} title={RARITY_LABELS[album.tier]}>{album.title}</Link>
                    </span>
                  ))}
                </p>
              )}
              {set.reward.pack && <p className="set-note">Set de {PACK_SET_SIZE} albums ou plus : un pack offert en plus des pièces.</p>}
            </div>
          </details>
        );
      })}
    </div>
  );
}
