import type { ScoreEntry } from "./types";

const SCORES_KEY = "veloce.classifica.v1";
const PILOT_KEY = "veloce.pilota.v1";
const MUTE_KEY = "veloce.audio.v1";

/** Storici del circolo — bersagli da battere per i nuovi piloti. */
const LEGENDS: ScoreEntry[] = [
  {
    id: "legend-nuvolari",
    name: "NUVOLARI",
    score: 14800,
    distanceKm: 11.4,
    topSpeedKmh: 296,
    overtakes: 74,
    date: "1932",
    legend: true,
  },
  {
    id: "legend-ascari",
    name: "ASCARI",
    score: 9600,
    distanceKm: 8.6,
    topSpeedKmh: 288,
    overtakes: 51,
    date: "1952",
    legend: true,
  },
  {
    id: "legend-varzi",
    name: "VARZI",
    score: 6200,
    distanceKm: 6.1,
    topSpeedKmh: 274,
    overtakes: 33,
    date: "1937",
    legend: true,
  },
  {
    id: "legend-campari",
    name: "CAMPARI",
    score: 3600,
    distanceKm: 3.8,
    topSpeedKmh: 251,
    overtakes: 19,
    date: "1924",
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
    return valid.length ? sortScores(valid).slice(0, 8) : [...LEGENDS];
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

export function saveRun(summary: {
  score: number;
  distanceKm: number;
  topSpeedKmh: number;
  overtakes: number;
}): { scores: ScoreEntry[]; entry: ScoreEntry | null; rank: number; isRecord: boolean } {
  const scores = loadScores();
  const previousBest = personalBest(scores);
  const isRecord = summary.score > previousBest;
  const entry: ScoreEntry = {
    id: `run-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    name: loadPilotName(),
    score: Math.round(summary.score),
    distanceKm: Number(summary.distanceKm.toFixed(2)),
    topSpeedKmh: Math.round(summary.topSpeedKmh),
    overtakes: summary.overtakes,
    date: formatShortDate(new Date()),
  };
  const next = sortScores([...scores, entry]).slice(0, 8);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — la gara continua */
  }
  const rank = next.findIndex((e) => e.id === entry.id);
  return {
    scores: next,
    entry: rank >= 0 ? entry : null,
    rank: rank >= 0 ? rank + 1 : 0,
    isRecord: isRecord && rank === 0,
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
    if (v && v.trim()) return v.trim().slice(0, 10).toUpperCase();
  } catch {
    /* noop */
  }
  return "TU";
}

export function savePilotName(name: string) {
  try {
    localStorage.setItem(PILOT_KEY, name.trim().slice(0, 10).toUpperCase() || "TU");
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
