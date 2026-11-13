export type Phase = "attract" | "playing" | "paused" | "over";

export type CarChassisId = "berlinetta" | "barchetta" | "prototipo" | "corazzata";
export type PaintId =
  | "rosso"
  | "modena"
  | "pino"
  | "dino"
  | "perla"
  | "carbonio"
  | "boreale"
  | "ametista";
export type StripeId = "tricolore" | "oro_doppio" | "crema" | "nero_corse" | "nessuna";
export type SpoilerId = "nessuno" | "gt" | "corsa_alta";
export type RimsId = "cromo" | "oro" | "nero" | "bianco";
export type FlameId = "ambra" | "azzurra" | "smeraldo" | "cremisi";

export interface CarConfig {
  chassis: CarChassisId;
  paint: PaintId;
  stripe: StripeId;
  spoiler: SpoilerId;
  rims: RimsId;
  flame: FlameId;
  number: string;
  plate: string;
}

export type TrackItemKind =
  | "coin"
  | "nitro"
  | "shield"
  | "magnet"
  | "repair"
  | "mystery"
  | "oil";

export type GadgetKind = "emp" | "crono" | "overboost";

export interface ActiveEffects {
  shield: number;
  magnet: number;
  crono: number;
  overboost: number;
  slip: boolean;
}

export interface HudState {
  score: number;
  speedKmh: number;
  gear: number;
  combo: number;
  comboProgress: number;
  lives: number;
  maxLives: number;
  turbo: number;
  distanceKm: number;
  lap: number;
  boost: boolean;
  offroad: boolean;
  elapsed: number;
  coins: number;
  heldGadget: GadgetKind | null;
  effects: ActiveEffects;
}

export interface GameSummary {
  score: number;
  distanceKm: number;
  topSpeedKmh: number;
  overtakes: number;
  nearMisses: number;
  durationSec: number;
  coins: number;
  itemsUsed: number;
  laps: number;
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  distanceKm: number;
  topSpeedKmh: number;
  overtakes: number;
  nearMisses?: number;
  itemsCollected?: number;
  carChassis?: string;
  carColor?: string;
  carNumber?: string;
  date: string;
  legend?: boolean;
  online?: boolean;
}
