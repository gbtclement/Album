// Icônes du jeu (traits simples, couleur héritée du texte)
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function CardsIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><rect x="3" y="5" width="12" height="16" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v13" /></svg>;
}
export function CartIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M4 9h16l-1.5 11h-13z" /><path d="M8 9V7a4 4 0 0 1 8 0v2" /></svg>;
}
export function TrophyIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M6 3h12v5a6 6 0 0 1-12 0z" /><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 21h6M12 14v7" /></svg>;
}
export function UsersIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16.5 14.2A5 5 0 0 1 22 19" /></svg>;
}
export function UserPlusIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6M16 11h6" /></svg>;
}
export function TrendIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>;
}
export function SwapIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M4 8h14l-3-3M20 16H6l3 3" /></svg>;
}
export function PodiumIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M4 21V12h5v9M9 21V6h6v15M15 21v-6h5v6" /></svg>;
}
export function DiscIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>;
}
export function StarIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>;
}
export function SparkIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>;
}
export function SearchIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2} {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
}
export function LockIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>;
}
export function CheckIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={3} {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}
export function CrownIcon(props: IconProps) {
  return <svg viewBox="0 0 26 18" aria-hidden="true" fill="currentColor" {...props}><path d="M1 5l6 5 6-9 6 9 6-5-3 13H4z" /></svg>;
}
