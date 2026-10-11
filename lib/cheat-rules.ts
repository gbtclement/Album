// Détection de triche (espace admin) : règles de calcul, sans base de données.
// Rien n'est sanctionné automatiquement : ces signaux classent des comptes à examiner par un admin.
import { PACK_INTERVAL_MS } from "@/lib/pack-rules";

// Un pack ouvert moins de 15 s après sa recharge : réflexe de robot (un humain met des minutes, ou des heures)
export const REFLEX_WINDOW_MS = 15_000;
// Seuils des signaux (sur la période analysée, 7 jours)
const REFLEX_MIN_COUNT = 20;
const REFLEX_MIN_SHARE = 0.5;
const METRONOME_MIN_INTERVALS = 30;
const METRONOME_MAX_CV = 0.15;
// Écarts au-delà de 2 h : une pause, pas un rythme
const METRONOME_MAX_GAP_MS = 2 * 60 * 60 * 1000;
const SLEEPLESS_HOURS = 20;
const SLEEPLESS_MIN_DAYS = 2;
const DRAW_MIN_PLAYED = 7;
const DRAW_MAX_MEDIAN_SECONDS = 8;
export const MULE_MIN_ACCOUNTS = 3;
// Un compte apparaît dans la liste dès qu'un signal est présent (le plus faible vaut 15 points)
export const SUSPECT_MIN_SCORE = 15;

export type OpeningSignals = {
  openings: number;
  reflexCount: number;
  reflexShare: number;
  // Coefficient de variation des écarts entre ouvertures (0 = parfaitement régulier) ; null si trop peu de données
  intervalCv: number | null;
  sleeplessDays: number;
  maxHoursInADay: number;
};

export type DrawSignals = { played: number; solved: number; medianAnswerSeconds: number | null };

export type Reason = { key: "reflexe" | "metronome" | "sans-sommeil" | "pioche" | "mules"; points: number; text: string };

const dayHour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });

export function analyzeOpenings(times: Date[], intervalMs = PACK_INTERVAL_MS): OpeningSignals {
  const sorted = times.map((time) => time.getTime()).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((time, index) => time - sorted[index]);

  // Réflexe : écart compris entre une recharge et une recharge + 15 s (le robot attendait le pack suivant)
  const reflexCount = gaps.filter((gap) => gap >= intervalMs && gap <= intervalMs + REFLEX_WINDOW_MS).length;

  // Régularité : écarts de moins de 2 h ; un humain varie beaucoup, un script presque pas
  const rhythm = gaps.filter((gap) => gap > 0 && gap <= METRONOME_MAX_GAP_MS);
  let intervalCv: number | null = null;
  if (rhythm.length >= METRONOME_MIN_INTERVALS) {
    const mean = rhythm.reduce((sum, gap) => sum + gap, 0) / rhythm.length;
    const variance = rhythm.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / rhythm.length;
    intervalCv = Math.sqrt(variance) / mean;
  }

  // Sommeil : nombre d'heures différentes (heure de Paris) avec au moins une ouverture, jour par jour
  const hoursByDay = new Map<string, Set<string>>();
  for (const time of sorted) {
    const parts = Object.fromEntries(dayHour.formatToParts(time).map((part) => [part.type, part.value]));
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const set = hoursByDay.get(day) ?? new Set<string>();
    set.add(parts.hour);
    hoursByDay.set(day, set);
  }
  const hourCounts = [...hoursByDay.values()].map((set) => set.size);

  return {
    openings: sorted.length,
    reflexCount,
    reflexShare: gaps.length ? reflexCount / gaps.length : 0,
    intervalCv,
    sleeplessDays: hourCounts.filter((count) => count >= SLEEPLESS_HOURS).length,
    maxHoursInADay: hourCounts.length ? Math.max(...hourCounts) : 0,
  };
}

export function scoreSuspect({ openings, draws, muleAccounts }: { openings: OpeningSignals; draws: DrawSignals | null; muleAccounts: number }) {
  const reasons: Reason[] = [];
  if (openings.reflexCount >= REFLEX_MIN_COUNT && openings.reflexShare >= REFLEX_MIN_SHARE) {
    reasons.push({
      key: "reflexe",
      points: 30,
      text: `Réflexe surhumain : ${openings.reflexCount} packs ouverts moins de 15 s après leur recharge (${Math.round(openings.reflexShare * 100)} % des ouvertures).`,
    });
  }
  if (openings.intervalCv !== null && openings.intervalCv < METRONOME_MAX_CV) {
    reasons.push({
      key: "metronome",
      points: 20,
      text: `Régularité de métronome : écarts entre ouvertures presque identiques (variation de ${Math.round(openings.intervalCv * 100)} %).`,
    });
  }
  if (openings.sleeplessDays >= SLEEPLESS_MIN_DAYS) {
    reasons.push({
      key: "sans-sommeil",
      points: 20,
      text: `Jamais endormi : actif au moins ${SLEEPLESS_HOURS} h sur 24 pendant ${openings.sleeplessDays} jours (jusqu'à ${openings.maxHoursInADay} h).`,
    });
  }
  if (
    draws &&
    draws.played >= DRAW_MIN_PLAYED &&
    draws.solved === draws.played &&
    draws.medianAnswerSeconds !== null &&
    draws.medianAnswerSeconds < DRAW_MAX_MEDIAN_SECONDS
  ) {
    reasons.push({
      key: "pioche",
      points: 15,
      text: `Pioche trop parfaite : ${draws.solved}/${draws.played} bonnes réponses, en ${Math.round(draws.medianAnswerSeconds)} s en général.`,
    });
  }
  if (muleAccounts >= MULE_MIN_ACCOUNTS) {
    reasons.push({
      key: "mules",
      points: 15,
      text: `Comptes « mules » : ${muleAccounts} comptes récents lui envoient leurs cartes ou leurs pièces, et presque uniquement à lui.`,
    });
  }
  return { score: Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0)), reasons };
}
