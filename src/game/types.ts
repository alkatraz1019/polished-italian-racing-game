export type Phase = "attract" | "playing" | "paused" | "over";

export interface HudState {
  score: number;
  speedKmh: number;
  gear: number;
  combo: number;
  comboProgress: number;
  lives: number;
  turbo: number;
  distanceKm: number;
  boost: boolean;
  offroad: boolean;
  elapsed: number;
}

export interface GameSummary {
  score: number;
  distanceKm: number;
  topSpeedKmh: number;
  overtakes: number;
  nearMisses: number;
  durationSec: number;
  turboUsed?: number;
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  distanceKm: number;
  topSpeedKmh: number;
  overtakes: number;
  date: string;
  legend?: boolean;
}
