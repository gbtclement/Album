import Link from "next/link";
import { RARITY_LABELS, type RarityTier } from "@/lib/rarity";

export type CardData = {
  slug: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  tier: RarityTier;
  count?: number;
  isNew?: boolean;
};

const TIER_STYLES: Record<RarityTier, string> = {
  commun: "bg-zinc-200 text-zinc-800",
  peu_commun: "bg-emerald-100 text-emerald-800",
  rare: "bg-sky-100 text-sky-800",
  epique: "bg-violet-100 text-violet-800",
  legendaire: "bg-amber-100 text-amber-900",
};

// Carte d'album : pochette, badge de rareté et badge de doublon (xN) si le joueur en a plusieurs
export function AlbumCard({ card }: { card: CardData }) {
  return (
    <Link href={`/album/${card.slug}`} className="group flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
        {card.coverUrl && (
          // Pochettes servies par Cover Art Archive : pas de optimisation Next nécessaire
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt={`Pochette de ${card.title}`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        )}
        {card.count !== undefined && card.count > 1 && (
          <span
            title={`Tu possèdes ${card.count} exemplaires de cet album`}
            className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
          >
            x{card.count}
          </span>
        )}
        {card.isNew && (
          <span className="absolute left-2 top-2 rounded bg-amber-300 px-2 py-0.5 text-xs font-semibold text-zinc-900">
            Nouveau
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{card.title}</p>
        <p className="truncate text-sm text-zinc-500">{card.artist}</p>
        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${TIER_STYLES[card.tier]}`}>
          {RARITY_LABELS[card.tier]}
        </span>
      </div>
    </Link>
  );
}
