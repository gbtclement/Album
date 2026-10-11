import type { CSSProperties, ReactNode } from "react";
import { CardsIcon, CrownIcon, DiscIcon, SparkIcon, StarIcon, UsersIcon } from "@/components/icons";
import type { AchievementGroup } from "@/lib/achievement-rules";
import type { AchievementStatus } from "@/lib/achievements";

const GROUP_STYLE: Record<AchievementGroup, { icon: ReactNode; color: string }> = {
  collection: { icon: <CardsIcon />, color: "var(--r-rare)" },
  rarete: { icon: <StarIcon />, color: "var(--r-epique)" },
  packs: { icon: <DiscIcon />, color: "var(--gold)" },
  artistes: { icon: <CrownIcon />, color: "var(--r-legendaire)" },
  social: { icon: <UsersIcon />, color: "var(--r-peu_commun)" },
  pioche: { icon: <SparkIcon />, color: "var(--coral)" },
};

// Grille des succès du profil : débloqués en couleur, les autres grisés avec leur progression
export function AchievementBadges({ items }: { items: AchievementStatus[] }) {
  const sorted = [...items].sort((a, b) => Number(Boolean(b.unlockedAt)) - Number(Boolean(a.unlockedAt)));
  return (
    <div className="badges">
      {sorted.map((item) => {
        const style = GROUP_STYLE[item.group];
        const on = Boolean(item.unlockedAt);
        return (
          <div key={item.key} className={`badge-tile${on ? " on" : ""}`} style={{ "--c": style.color } as CSSProperties}>
            <span className="medal" aria-hidden="true">{style.icon}</span>
            <strong>{item.title}</strong>
            <small>{item.description}</small>
            {on ? (
              <small>Débloqué le {item.unlockedAt!.toLocaleDateString("fr-FR")}</small>
            ) : (
              <>
                {item.target > 1 && (
                  <div className="bar" aria-label={`${item.progress} sur ${item.target}`}>
                    <div style={{ width: `${(item.progress / item.target) * 100}%`, "--c": style.color } as CSSProperties} />
                  </div>
                )}
                <span className="reward"><i className="coin-i" aria-hidden="true" />{item.reward.toLocaleString("fr-FR")}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
