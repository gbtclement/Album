"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CardsIcon, CartIcon, PodiumIcon, SwapIcon, TrendIcon, TrophyIcon, UserPlusIcon, UsersIcon } from "@/components/icons";
import { MAX_STOCK, PACK_INTERVAL_MS } from "@/lib/pack-rules";

// Temps restant avant le prochain pack, mis à jour chaque seconde.
// À zéro, la page est rechargée côté serveur pour que le stock soit recalculé.
function useNextPack(nextPackAt: string | null) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const refreshed = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = nextPackAt ? Math.max(0, new Date(nextPackAt).getTime() - now) : 0;
  useEffect(() => {
    if (nextPackAt && remaining === 0 && refreshed.current !== nextPackAt) {
      refreshed.current = nextPackAt;
      router.refresh();
    }
  }, [nextPackAt, remaining, router]);
  return remaining;
}

function formatRemaining(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Compteur du HUD : "2:14" avant le prochain pack, rien quand le stock est plein
export function PackTimer({ nextPackAt }: { nextPackAt: string | null }) {
  const remaining = useNextPack(nextPackAt);
  if (!nextPackAt) return null;
  // Le serveur et le navigateur n'ont pas exactement la même heure : la seconde peut différer
  return <span className="res-timer" suppressHydrationWarning>{formatRemaining(remaining)}</span>;
}

type Group = { key: string; label: string; color: string; icon: ReactNode; items: Array<{ href: string; label: string; icon: ReactNode }> };

const GROUPS: Record<"marche" | "social", Group> = {
  marche: {
    key: "marche",
    label: "Marché",
    color: "var(--r-peu_commun)",
    icon: <CartIcon />,
    items: [
      { href: "/marche", label: "Marché", icon: <CartIcon /> },
      { href: "/bourse", label: "Bourse", icon: <TrendIcon /> },
      { href: "/echanges", label: "Échanges", icon: <SwapIcon /> },
    ],
  },
  social: {
    key: "social",
    label: "Social",
    color: "var(--r-epique)",
    icon: <UsersIcon />,
    items: [
      { href: "/amis", label: "Amis", icon: <UserPlusIcon /> },
      { href: "/classement", label: "Classement", icon: <PodiumIcon /> },
    ],
  },
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DockProps = {
  stock: number;
  nextPackAt: string | null;
  questsReady: number;
  social: number;
  // Collections d'artiste terminées dont la récompense attend
  collection: number;
};

// Barre de jeu en bas de l'écran : Collection, Marché (plateau), vinyle des packs, Quêtes, Social (plateau)
export function Dock({ stock, nextPackAt, questsReady, social, collection }: DockProps) {
  const pathname = usePathname();
  const remaining = useNextPack(nextPackAt);
  // Le plateau retient la page où il a été ouvert : il se ferme de lui-même quand on change de page
  const [openState, setOpenState] = useState<{ key: "marche" | "social"; path: string } | null>(null);
  const open = openState?.path === pathname ? openState.key : null;
  const setOpen = (key: "marche" | "social" | null) => setOpenState(key ? { key, path: pathname } : null);
  const [trayStyle, setTrayStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenState(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Place le plateau au-dessus du bouton, sans sortir de l'écran
  useEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current?.getBoundingClientRect();
    const button = buttons.current[open]?.getBoundingClientRect();
    const tray = trayRef.current?.getBoundingClientRect();
    if (!wrap || !button || !tray) return;
    const center = button.left + button.width / 2 - wrap.left;
    const left = Math.max(8, Math.min(wrap.width - tray.width - 8, center - tray.width / 2));
    setTrayStyle({ left, "--arrow": `${center - left}px`, "--tab-color": GROUPS[open].color } as CSSProperties);
    trayRef.current?.querySelector("a")?.focus({ preventScroll: true });
  }, [open]);

  // Anneau du vinyle : part du délai déjà écoulée avant le prochain pack
  const progress = stock >= MAX_STOCK || !nextPackAt ? 100 : Math.round((1 - remaining / PACK_INTERVAL_MS) * 100);
  const groupActive = (group: Group) => group.items.some((item) => isActive(pathname, item.href));

  const groupButton = (key: "marche" | "social", badge = 0) => {
    const group = GROUPS[key];
    return (
      <button
        ref={(element) => {
          buttons.current[key] = element;
        }}
        type="button"
        className="tab"
        style={{ "--tab-color": group.color } as CSSProperties}
        aria-current={groupActive(group) ? "page" : undefined}
        aria-expanded={open === key}
        onClick={() => setOpen(open === key ? null : key)}
      >
        {badge > 0 && <span className="badge">{badge}</span>}
        {group.icon}
        <span className="lbl">{group.label}<span className="caret" aria-hidden="true">▲</span></span>
      </button>
    );
  };

  return (
    <>
      {open && <button type="button" className="scrim" aria-label="Fermer le menu" onClick={() => setOpen(null)} />}
      <div className="dock-wrap" ref={wrapRef}>
        {open && (
          <div className="tray" ref={trayRef} style={trayStyle}>
            {GROUPS[open].items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <nav className="dock" aria-label="Menu principal">
          <Link href="/collection" className="tab" style={{ "--tab-color": "var(--r-rare)" } as CSSProperties} aria-current={isActive(pathname, "/collection") ? "page" : undefined}>
            {collection > 0 && <span className="badge">{collection}</span>}
            <CardsIcon />
            <span className="lbl">Collection</span>
          </Link>
          {groupButton("marche")}
          <Link
            href="/packs"
            className="pack-btn"
            aria-label={`Packs : ${stock} disponible${stock > 1 ? "s" : ""}`}
            aria-current={isActive(pathname, "/packs") ? "page" : undefined}
            style={{ "--p": `${progress}%` } as CSSProperties}
          >
            <span className="ring" />
            <span className="vinyl"><span className="hub" /></span>
            <span className="sheen" />
            {stock > 0 && <span className="count">{stock}</span>}
          </Link>
          <Link href="/quetes" className="tab" style={{ "--tab-color": "var(--gold)" } as CSSProperties} aria-current={isActive(pathname, "/quetes") ? "page" : undefined}>
            {questsReady > 0 && <span className="badge">{questsReady}</span>}
            <TrophyIcon />
            <span className="lbl">Quêtes</span>
          </Link>
          {groupButton("social", social)}
        </nav>
      </div>
    </>
  );
}

// Message de confirmation ou d'erreur, affiché en haut puis retiré de l'adresse de la page.
// À utiliser avec key={message} : un nouveau message recrée le composant et le réaffiche.
export function Toast({ message }: { message?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("message");
    window.history.replaceState(null, "", url);
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;
  return <div className="toast" role="status">{message}</div>;
}
