import Link from "next/link";
import { Thumb } from "@/components/game-ui";
import { RARITY_LABELS } from "@/lib/rarity";
import { MAX_WISHES, type Wish } from "@/lib/wishlist";
import { toggleWishAction } from "./actions";

// Onglet Souhaits de la collection : albums recherchés, en vente ou non, et coût de fabrication
export function WishList({ wishes, dust }: { wishes: Wish[]; dust: number }) {
  if (wishes.length === 0) {
    return (
      <p className="empty">
        Ta liste de souhaits est vide. Sur la fiche d&apos;un album qui te manque (depuis le marché, les collections d&apos;artiste
        ou l&apos;accueil), touche « ♥ Ajouter à mes souhaits » : le Marché te signalera quand il est mis en vente.
      </p>
    );
  }

  const onSale = wishes.filter((wish) => !wish.owned && wish.on_sale > 0).length;
  return (
    <>
      <div className="row-between wish-head">
        <p className="sub">{wishes.length} / {MAX_WISHES} albums · <span className="dust-i" aria-hidden="true" /> {dust.toLocaleString("fr-FR")} poussières</p>
        {onSale > 0 && <Link href="/marche?souhaits=1" className="btn gold">Voir {onSale > 1 ? `les ${onSale} en vente` : "celui en vente"}</Link>}
      </div>
      <div className="stack two">
        {wishes.map((wish) => (
          <div key={wish.slug} className={`item${wish.owned ? " wish-owned" : ""}`}>
            <Link href={`/album/${wish.slug}`} aria-label={wish.title}>
              <Thumb cover={wish.cover_url} tier={wish.rarity_tier} title={wish.title} />
            </Link>
            <div className="l">
              <strong>{wish.title}</strong>
              <small>
                <span className={`tier-tag tier-${wish.rarity_tier}`}>{RARITY_LABELS[wish.rarity_tier]}</span>
                {" · "}
                {wish.owned
                  ? "obtenu"
                  : wish.on_sale > 0
                    ? `${wish.on_sale} en vente${wish.lowest_price !== null ? ` dès ${wish.lowest_price.toLocaleString("fr-FR")} pièces` : ""}`
                    : `fabrication ${wish.craft_cost.toLocaleString("fr-FR")}`}
              </small>
            </div>
            <form action={toggleWishAction} className="r">
              <input type="hidden" name="slug" value={wish.slug} />
              <input type="hidden" name="from" value="souhaits" />
              <button type="submit" className="btn red" aria-label={`Retirer ${wish.title} de mes souhaits`}>Retirer</button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
