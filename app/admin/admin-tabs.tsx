import Link from "next/link";

// Onglets de l'espace admin
const TABS = [
  { href: "/admin", label: "Joueurs" },
  { href: "/admin/triche", label: "Triche" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/documentation", label: "Documentation" },
] as const;

export function AdminTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="seg" aria-label="Espace admin">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// Date courte à l'heure de Paris (« 11/10/2026 14:05 »)
export function shortDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
}
