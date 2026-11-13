import type {
  CarChassisId,
  CarConfig,
  FlameId,
  GadgetKind,
  PaintId,
  RimsId,
  SpoilerId,
  StripeId,
} from "./types";

const GARAGE_KEY = "millecurve.garage.v1";

export interface ChassisSpec {
  id: CarChassisId;
  name: string;
  tagline: string;
  perk: string;
  topSpeedMult: number;
  accelMult: number;
  handlingMult: number;
  turboDrainMult: number;
  turboRegenMult: number;
  maxLives: number;
  offroadCap: number;
  widthScale: number;
}

export const CHASSIS_OPTIONS: ChassisSpec[] = [
  {
    id: "berlinetta",
    name: "Berlinetta GT",
    tagline: "Gran Turismo Classica",
    perk: "Assetto bilanciato ideale su misto e costiera",
    topSpeedMult: 1.0,
    accelMult: 1.0,
    handlingMult: 1.0,
    turboDrainMult: 1.0,
    turboRegenMult: 1.0,
    maxLives: 3,
    offroadCap: 0.48,
    widthScale: 1.0,
  },
  {
    id: "barchetta",
    name: "Barchetta Sprint",
    tagline: "Leggera da Tornante",
    perk: "Sterzo fulmineo e ricarica turbo +25%",
    topSpeedMult: 0.97,
    accelMult: 1.24,
    handlingMult: 1.26,
    turboDrainMult: 0.92,
    turboRegenMult: 1.25,
    maxLives: 3,
    offroadCap: 0.52,
    widthScale: 0.94,
  },
  {
    id: "prototipo",
    name: "Prototipo V12",
    tagline: "Belva da Velocità",
    perk: "+10% velocità massima e spinta turbo feroce",
    topSpeedMult: 1.1,
    accelMult: 0.95,
    handlingMult: 0.88,
    turboDrainMult: 0.86,
    turboRegenMult: 0.95,
    maxLives: 3,
    offroadCap: 0.43,
    widthScale: 1.06,
  },
  {
    id: "corazzata",
    name: "Stradale Rally",
    tagline: "Telaio Rinforzato",
    perk: "4 vite di partenza e trazione sull'erba",
    topSpeedMult: 0.95,
    accelMult: 1.08,
    handlingMult: 1.08,
    turboDrainMult: 1.04,
    turboRegenMult: 1.05,
    maxLives: 4,
    offroadCap: 0.78,
    widthScale: 1.02,
  },
];

export interface PaintSpec {
  id: PaintId;
  name: string;
  top: string;
  mid: string;
  deep: string;
  cabin: string;
}

export const PAINT_OPTIONS: PaintSpec[] = [
  {
    id: "rosso",
    name: "Rosso Corsa",
    top: "#f45740",
    mid: "#df3b2c",
    deep: "#9e1e15",
    cabin: "#c72d20",
  },
  {
    id: "modena",
    name: "Giallo Modena",
    top: "#fbd04c",
    mid: "#e5af24",
    deep: "#9f720d",
    cabin: "#cf9b1a",
  },
  {
    id: "pino",
    name: "Verde Scuderia",
    top: "#2e9b6b",
    mid: "#1f7a52",
    deep: "#11472f",
    cabin: "#196643",
  },
  {
    id: "dino",
    name: "Azzurro Tirreno",
    top: "#4aa0ea",
    mid: "#287bc4",
    deep: "#15497a",
    cabin: "#2068aa",
  },
  {
    id: "perla",
    name: "Avorio Mille",
    top: "#faf5e8",
    mid: "#e7dec9",
    deep: "#a99e86",
    cabin: "#d8ceb6",
  },
  {
    id: "carbonio",
    name: "Nero Etna",
    top: "#454c4e",
    mid: "#262b2d",
    deep: "#111415",
    cabin: "#1e2224",
  },
  {
    id: "boreale",
    name: "Arancio Amalfi",
    top: "#ff8542",
    mid: "#e66320",
    deep: "#9d3b0b",
    cabin: "#cc5416",
  },
  {
    id: "ametista",
    name: "Viola Imola",
    top: "#a35de0",
    mid: "#7d3ab8",
    deep: "#4a1d75",
    cabin: "#6a2ea0",
  },
];

export const STRIPE_OPTIONS: { id: StripeId; name: string }[] = [
  { id: "tricolore", name: "Tricolore" },
  { id: "oro_doppio", name: "Doppio Oro" },
  { id: "crema", name: "Banda Crema" },
  { id: "nero_corse", name: "Nero Corse" },
  { id: "nessuna", name: "Pura" },
];

export const SPOILER_OPTIONS: {
  id: SpoilerId;
  name: string;
  desc: string;
  speedBonus: number;
  gripBonus: number;
}[] = [
  {
    id: "nessuno",
    name: "Coda Pulita",
    desc: "+Velocità in rettilineo",
    speedBonus: 0.025,
    gripBonus: -0.04,
  },
  {
    id: "gt",
    name: "Labbro GT",
    desc: "Equilibrio aerodinamico",
    speedBonus: 0.005,
    gripBonus: 0.05,
  },
  {
    id: "corsa_alta",
    name: "Ala Gran Premio",
    desc: "+Tenuta nei tornanti",
    speedBonus: -0.015,
    gripBonus: 0.14,
  },
];

export const RIMS_OPTIONS: { id: RimsId; name: string; rim: string; spoke: string }[] = [
  { id: "cromo", name: "Cromo", rim: "#d5dad8", spoke: "#8f9897" },
  { id: "oro", name: "Oro Magnesio", rim: "#e9b45c", spoke: "#9f742a" },
  { id: "nero", name: "Nero Forgiato", rim: "#2d3233", spoke: "#16191a" },
  { id: "bianco", name: "Bianco Rally", rim: "#f3ecdd", spoke: "#b5ad9c" },
];

export const FLAME_OPTIONS: {
  id: FlameId;
  name: string;
  core: string;
  outer: string;
  glowRgba: string;
}[] = [
  {
    id: "ambra",
    name: "Ambra Classica",
    core: "#ffb84d",
    outer: "#ff5c33",
    glowRgba: "255,180,90",
  },
  {
    id: "azzurra",
    name: "Ossigeno Blu",
    core: "#7ce8ff",
    outer: "#2979ff",
    glowRgba: "86,186,255",
  },
  {
    id: "smeraldo",
    name: "Nitro Verde",
    core: "#8cffb0",
    outer: "#1ccf6d",
    glowRgba: "64,224,132",
  },
  {
    id: "cremisi",
    name: "Plasma Viola",
    core: "#ff8ce6",
    outer: "#b829ff",
    glowRgba: "212,90,255",
  },
];

export const GADGET_META: Record<
  GadgetKind,
  { name: string; short: string; desc: string; color: string }
> = {
  emp: {
    name: "Onda d'Urto",
    short: "URTO",
    desc: "Spazza via il traffico davanti a te (+220 pt/auto)",
    color: "#57c7ff",
  },
  crono: {
    name: "Crono-Guida 2×",
    short: "CRONO 2×",
    desc: "Rallenta i rivali e raddoppia i punti per 6.5s",
    color: "#b78cff",
  },
  overboost: {
    name: "Furia Tricolore",
    short: "FURIA",
    desc: "4.5s di super-spinta invincibile che travolge tutto",
    color: "#ff7a45",
  },
};

export const DEFAULT_CAR_CONFIG: CarConfig = {
  chassis: "berlinetta",
  paint: "rosso",
  stripe: "tricolore",
  spoiler: "gt",
  rims: "oro",
  flame: "ambra",
  number: "27",
  plate: "BO 27",
};

export function getPaintSpec(id: PaintId): PaintSpec {
  return PAINT_OPTIONS.find((p) => p.id === id) ?? PAINT_OPTIONS[0];
}

export function getChassisSpec(id: CarChassisId): ChassisSpec {
  return CHASSIS_OPTIONS.find((c) => c.id === id) ?? CHASSIS_OPTIONS[0];
}

export function getRimsSpec(id: RimsId) {
  return RIMS_OPTIONS.find((r) => r.id === id) ?? RIMS_OPTIONS[0];
}

export function getFlameSpec(id: FlameId) {
  return FLAME_OPTIONS.find((f) => f.id === id) ?? FLAME_OPTIONS[0];
}

export interface ComputedCarPhysics {
  topSpeedMult: number;
  accelMult: number;
  handlingMult: number;
  curveDriftMult: number;
  turboDrainMult: number;
  turboRegenMult: number;
  maxLives: number;
  offroadCap: number;
  ratings: {
    velocita: number;
    accelerazione: number;
    tenuta: number;
    turbo: number;
    robustezza: number;
  };
}

export function computeCarPhysics(cfg: CarConfig): ComputedCarPhysics {
  const ch = getChassisSpec(cfg.chassis);
  const sp = SPOILER_OPTIONS.find((s) => s.id === cfg.spoiler) ?? SPOILER_OPTIONS[1];
  const topSpeedMult = ch.topSpeedMult + sp.speedBonus;
  const accelMult = ch.accelMult;
  const handlingMult = ch.handlingMult + sp.gripBonus * 0.7;
  const curveDriftMult = Math.max(0.58, 1 - sp.gripBonus - (ch.handlingMult - 1) * 0.45);
  const clamp100 = (v: number) => Math.max(18, Math.min(100, Math.round(v)));

  return {
    topSpeedMult,
    accelMult,
    handlingMult,
    curveDriftMult,
    turboDrainMult: ch.turboDrainMult,
    turboRegenMult: ch.turboRegenMult,
    maxLives: ch.maxLives,
    offroadCap: ch.offroadCap,
    ratings: {
      velocita: clamp100(70 + (topSpeedMult - 1) * 230),
      accelerazione: clamp100(68 + (accelMult - 1) * 120),
      tenuta: clamp100(68 + (handlingMult - 1) * 95),
      turbo: clamp100(70 + (ch.turboRegenMult - ch.turboDrainMult) * 85),
      robustezza: clamp100(ch.maxLives === 4 ? 96 : 64 + (ch.offroadCap - 0.45) * 80),
    },
  };
}

export function sanitizeCarConfig(raw: Partial<CarConfig> | null | undefined): CarConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CAR_CONFIG };
  const chassis = CHASSIS_OPTIONS.some((c) => c.id === raw.chassis)
    ? (raw.chassis as CarChassisId)
    : DEFAULT_CAR_CONFIG.chassis;
  const paint = PAINT_OPTIONS.some((p) => p.id === raw.paint)
    ? (raw.paint as PaintId)
    : DEFAULT_CAR_CONFIG.paint;
  const stripe = STRIPE_OPTIONS.some((s) => s.id === raw.stripe)
    ? (raw.stripe as StripeId)
    : DEFAULT_CAR_CONFIG.stripe;
  const spoiler = SPOILER_OPTIONS.some((s) => s.id === raw.spoiler)
    ? (raw.spoiler as SpoilerId)
    : DEFAULT_CAR_CONFIG.spoiler;
  const rims = RIMS_OPTIONS.some((r) => r.id === raw.rims)
    ? (raw.rims as RimsId)
    : DEFAULT_CAR_CONFIG.rims;
  const flame = FLAME_OPTIONS.some((f) => f.id === raw.flame)
    ? (raw.flame as FlameId)
    : DEFAULT_CAR_CONFIG.flame;
  const cleanedNum = String(raw.number ?? "27")
    .replace(/[^0-9A-Z]/gi, "")
    .slice(0, 2)
    .toUpperCase();
  const cleanedPlate = String(raw.plate ?? "BO 27")
    .replace(/[^0-9A-Z ·-]/gi, "")
    .slice(0, 7)
    .toUpperCase();
  return {
    chassis,
    paint,
    stripe,
    spoiler,
    rims,
    flame,
    number: cleanedNum || "27",
    plate: cleanedPlate || "IT",
  };
}

export function loadCarConfig(): CarConfig {
  try {
    const raw = localStorage.getItem(GARAGE_KEY);
    if (!raw) return { ...DEFAULT_CAR_CONFIG };
    return sanitizeCarConfig(JSON.parse(raw) as Partial<CarConfig>);
  } catch {
    return { ...DEFAULT_CAR_CONFIG };
  }
}

export function saveCarConfig(cfg: CarConfig): void {
  try {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(sanitizeCarConfig(cfg)));
  } catch {
    /* noop */
  }
}
