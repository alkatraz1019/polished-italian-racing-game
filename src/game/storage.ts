import { getPaintSpec } from "./garage";
import type { CarConfig, GameSummary, ScoreEntry } from "./types";

const SCORES_KEY = "millecurve.classifica.v1";
const PILOT_KEY = "millecurve.pilota.v1";
const MUTE_KEY = "millecurve.audio.v1";
const CREDITS_KEY = "millecurve.gettoni.v1";

/** Storici della Coppa Costiera — bersagli da battere in assenza di rete. */
export const LEGENDS: ScoreEntry[] = [
  {
    id: "legend-nuvolari",
    name: "NUVOLARI",
    score: 16400,
    distanceKm: 12.6,
    topSpeedKmh: 304,
    overtakes: 78,
    carChassis: "prototipo",
    carColor: "#df3b2c",
    carNumber: "72",
    date: "1932",
    legend: true,
  },
  {
    id: "legend-ascari",
    name: "ASCARI",
    score: 11200,
    distanceKm: 9.4,
    topSpeedKmh: 294,
    overtakes: 56,
    carChassis: "berlinetta",
    carColor: "#2c7ec9",
    carNumber: "10",
    date: "1952",
    legend: true,
  },
  {
    id: "legend-varzi",
    name: "VARZI",
    score: 7400,
    distanceKm: 6.8,
    topSpeedKmh: 281,
    overtakes: 37,
    carChassis: "barchetta",
    carColor: "#262b2d",
    carNumber: "08",
    date: "1937",
    legend: true,
  },
  {
    id: "legend-bandini",
    name: "BANDINI",
    score: 4200,
    distanceKm: 4.1,
    topSpeedKmh: 262,
    overtakes: 22,
    carChassis: "berlinetta",
    carColor: "#e5af24",
    carNumber: "18",
    date: "1966",
    legend: true,
  },
];

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [...LEGENDS];
    const parsed = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...LEGENDS];
    const valid = parsed.filter(
      (e) => e && typeof e.score === "number" && typeof e.name === "string"
    );
    return valid.length ? sortScores(valid).slice(0, 12) : [...LEGENDS];
  } catch {
    return [...LEGENDS];
  }
}

function sortScores(entries: ScoreEntry[]): ScoreEntry[] {
  return [...entries].sort((a, b) => b.score - a.score);
}

export function personalBest(scores: ScoreEntry[]): number {
  return scores.filter((e) => !e.legend).reduce((max, e) => Math.max(max, e.score), 0);
}

export function personalBestEntry(scores: ScoreEntry[]): ScoreEntry | null {
  const own = scores.filter((e) => !e.legend);
  if (!own.length) return null;
  return own.reduce((best, e) => (e.score > best.score ? e : best), own[0]);
}

export function saveRun(
  summary: GameSummary,
  car: CarConfig
): { scores: ScoreEntry[]; entry: ScoreEntry | null; rank: number; isRecord: boolean } {
  const scores = loadScores();
  const previousBest = personalBest(scores);
  const isRecord = summary.score > previousBest;
  const paint = getPaintSpec(car.paint);
  const entry: ScoreEntry = {
    id: `run-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    name: loadPilotName(),
    score: Math.round(summary.score),
    distanceKm: Number(summary.distanceKm.toFixed(2)),
    topSpeedKmh: Math.round(summary.topSpeedKmh),
    overtakes: summary.overtakes,
    nearMisses: summary.nearMisses,
    itemsCollected: summary.coins + summary.itemsUsed,
    carChassis: car.chassis,
    carColor: paint.mid,
    carNumber: car.number || "27",
    date: formatShortDate(new Date()),
  };
  const next = sortScores([...scores, entry]).slice(0, 12);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  addWalletCoins(summary.coins);
  const rank = next.findIndex((e) => e.id === entry.id);
  return {
    scores: next,
    entry: rank >= 0 ? entry : null,
    rank: rank >= 0 ? rank + 1 : 0,
    isRecord,
  };
}

export function clearScores(): ScoreEntry[] {
  try {
    localStorage.removeItem(SCORES_KEY);
  } catch {
    /* noop */
  }
  return [...LEGENDS];
}

export function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${String(d.getFullYear()).slice(2)}`;
}

export function loadPilotName(): string {
  try {
    const v = localStorage.getItem(PILOT_KEY);
    if (v && v.trim()) return v.trim().slice(0, 12).toUpperCase();
  } catch {
    /* noop */
  }
  return "PILOTA";
}

export function savePilotName(name: string) {
  try {
    localStorage.setItem(PILOT_KEY, name.trim().slice(0, 12).toUpperCase() || "PILOTA");
  } catch {
    /* noop */
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* noop */
  }
}

export function loadWalletCoins(): number {
  try {
    const n = parseInt(localStorage.getItem(CREDITS_KEY) ?? "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addWalletCoins(delta: number): number {
  const next = Math.max(0, loadWalletCoins() + Math.max(0, Math.round(delta)));
  try {
    localStorage.setItem(CREDITS_KEY, String(next));
  } catch {
    /* noop */
  }
  return next;
}
