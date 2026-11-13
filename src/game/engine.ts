import { AudioEngine } from "./audio";
import {
  computeCarPhysics,
  DEFAULT_CAR_CONFIG,
  GADGET_META,
  getFlameSpec,
  type ComputedCarPhysics,
} from "./garage";
import {
  buildPlayerSprite,
  buildSprites,
  type SpriteAsset,
  type SpriteCatalog,
} from "./sprites";
import type {
  CarConfig,
  GadgetKind,
  GameSummary,
  HudState,
  Phase,
  TrackItemKind,
} from "./types";

const SEG_LEN = 200;
const RUMBLE_LEN = 3;
const ROAD_WIDTH = 2000;
const TRACK_SEGMENTS = 1700;
const DRAW_DIST = 190;
const CAM_HEIGHT = 1000;
const FOV = 100;
const CAM_DEPTH = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
const PLAYER_Z = CAM_HEIGHT * CAM_DEPTH;
const MAX_SPEED = 12000;
const TURBO_MAX = 100;
const PLAYER_HALF = 0.115;
const LANES = [-0.64, 0, 0.64];

const SHIELD_DURATION = 12;
const MAGNET_DURATION = 10;
const CRONO_DURATION = 6.5;
const OVERBOOST_DURATION = 4.5;

interface Point3D {
  world: { x: number; y: number; z: number };
  camera: { x: number; y: number; z: number };
  screen: { x: number; y: number; w: number; scale: number };
}

interface Scenery {
  asset: SpriteAsset;
  offset: number;
}

interface Segment {
  index: number;
  p1: Point3D;
  p2: Point3D;
  curve: number;
  light: boolean;
  clip: number;
  rendered: boolean;
  looped: boolean;
  sprites: Scenery[];
}

interface TrafficCar {
  x: number;
  targetX: number;
  z: number;
  speed: number;
  baseSpeed: number;
  sprite: SpriteAsset;
  halfWidth: number;
  passed: boolean;
  nearMissed: boolean;
  prevZ: number;
  wobble: number;
}

interface TrackItem {
  id: number;
  kind: TrackItemKind;
  x: number;
  z: number;
  bob: number;
  dodged: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  coreColor?: string;
  kind: "spark" | "smoke" | "dust" | "flame" | "confetti";
  layer: "back" | "front";
  gravity: number;
  rot: number;
  vr: number;
}

interface Popup {
  text: string;
  sub: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
}

export interface EngineCallbacks {
  onHud: (hud: HudState) => void;
  onGameOver: (summary: GameSummary) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeIn(a: number, b: number, p: number) {
  return a + (b - a) * Math.pow(p, 2);
}
function easeInOut(a: number, b: number, p: number) {
  return a + ((b - a) * -Math.cos(p * Math.PI)) / 2 + (b - a) / 2;
}
function emptyPoint(): Point3D {
  return {
    world: { x: 0, y: 0, z: 0 },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MilleCurveGame {
  readonly audio = new AudioEngine();

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private carConfig: CarConfig;
  private carPhysics: ComputedCarPhysics;
  private sprites: SpriteCatalog;
  private segments: Segment[] = [];
  private trackLength = 0;
  private background: HTMLCanvasElement | null = null;
  private bgWidth = 0;
  private width = 800;
  private height = 500;
  private dpr = 1;
  private raf = 0;
  private lastTime = 0;
  private needsRender = false;
  private observer: ResizeObserver | null = null;

  mode: Phase = "attract";
  private playerX = 0;
  private position = 0;
  private prevPosition = 0;
  private speed = 4200;
  private steerSmooth = 0;
  private offroad = false;
  private brakeActive = false;
  private turboActive = false;
  private turboLocked = false;
  private turbo = 55;
  private nitroSurgeTimer = 0;
  private level = 0;
  private lives = 3;
  private maxLives = 3;
  private lap = 1;
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private elapsed = 0;
  private overtakes = 0;
  private nearMisses = 0;
  private coins = 0;
  private itemsUsed = 0;
  private topSpeed = 0;

  // Oggetti ed effetti attivi
  private items: TrackItem[] = [];
  private nextItemSpawnZ = 5500;
  private itemSeq = 1;
  private heldGadget: GadgetKind | null = null;
  private shieldTimer = 0;
  private magnetTimer = 0;
  private cronoTimer = 0;
  private overboostTimer = 0;
  private slipTimer = 0;
  private shockwaveAnim = 0;

  private shake = 0;
  private flash = 0;
  private flashColor = "255,120,80";
  private startFlash = 0;
  private invuln = 0;
  private overTimer = 0;
  private reported = false;
  private summary: GameSummary | null = null;
  private hudTimer = 0;
  private popups: Popup[] = [];
  private particles: Particle[] = [];
  private traffic: TrafficCar[] = [];
  private playerScreen = { x: 400, y: 400, w: 200, h: 140 };
  private exhaustTimer = 0;
  private bgDrift = 0;
  private drawDist = DRAW_DIST;
  private offroadWarned = false;

  private keys = new Set<string>();
  private touchSteer = 0;
  private touchBrake = false;
  private touchTurbo = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks, initialCar: CarConfig = DEFAULT_CAR_CONFIG) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.cb = cb;
    this.carConfig = initialCar;
    this.carPhysics = computeCarPhysics(initialCar);
    this.maxLives = this.carPhysics.maxLives;
    this.lives = this.maxLives;
    this.sprites = buildSprites(initialCar);
    this.buildTrack();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement ?? canvas);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  setCarConfig(cfg: CarConfig) {
    this.carConfig = cfg;
    this.carPhysics = computeCarPhysics(cfg);
    this.sprites.player = buildPlayerSprite(cfg);
    if (this.mode === "attract") {
      this.maxLives = this.carPhysics.maxLives;
      this.lives = this.maxLives;
    }
    this.needsRender = true;
  }

  /* ------------------------------------------------------------ pista */

  private buildTrack() {
    const segs: Segment[] = [];
    const addSegment = (curve: number, y: number) => {
      const n = segs.length;
      const prevY = n > 0 ? segs[n - 1].p2.world.y : 0;
      segs.push({
        index: n,
        p1: { ...emptyPoint(), world: { x: 0, y: prevY, z: n * SEG_LEN } },
        p2: { ...emptyPoint(), world: { x: 0, y, z: (n + 1) * SEG_LEN } },
        curve,
        light: Math.floor(n / RUMBLE_LEN) % 2 === 0,
        clip: 0,
        rendered: false,
        looped: false,
        sprites: [],
      });
    };
    const lastY = () => (segs.length ? segs[segs.length - 1].p2.world.y : 0);
    const addRoad = (enter: number, hold: number, leave: number, curve: number, yDelta: number) => {
      const startY = lastY();
      const endY = startY + yDelta;
      const total = enter + hold + leave;
      for (let n = 0; n < enter; n++)
        addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, (n + 1) / total));
      for (let n = 0; n < hold; n++)
        addSegment(curve, easeInOut(startY, endY, (enter + n + 1) / total));
      for (let n = 0; n < leave; n++)
        addSegment(easeInOut(curve, 0, (n + 1) / leave), easeInOut(startY, endY, (enter + hold + n + 1) / total));
    };

    // Circuito costiero chiuso senza dislivelli bruschi sul traguardo
    addRoad(25, 55, 25, 0, 0);
    addRoad(28, 42, 28, 2.2, 180);
    addRoad(24, 48, 24, -2.7, 220);
    addRoad(22, 32, 22, 0, -180);
    addRoad(28, 48, 28, 3.3, 0);
    addRoad(22, 40, 22, -1.8, -240);
    addRoad(18, 56, 18, 1.1, 210);
    addRoad(28, 32, 28, -3.4, 0);
    addRoad(24, 44, 24, 2.5, 280);
    addRoad(28, 76, 28, 0, -160);
    addRoad(20, 30, 20, 3.7, -210);
    addRoad(26, 42, 26, -2.3, 180);
    addRoad(28, 48, 28, 1.5, 0);
    addRoad(22, 36, 22, -3.5, -260);
    addRoad(26, 60, 26, 2.4, 160);

    while (segs.length < TRACK_SEGMENTS - 120) {
      addRoad(20, 36, 20, -2.4, -120);
      if (segs.length >= TRACK_SEGMENTS - 120) break;
      addRoad(20, 36, 20, 2.1, 120);
    }

    // Raccordo finale dolce fino a quota y = 0 e curva = 0 per un giro infinito perfetto
    const rem = Math.max(30, TRACK_SEGMENTS - segs.length);
    const enter = Math.floor(rem * 0.25);
    const leave = Math.floor(rem * 0.25);
    const hold = rem - enter - leave;
    addRoad(enter, hold, leave, 0, -lastY());

    this.segments = segs;
    this.trackLength = segs.length * SEG_LEN;

    // Scenografia costiera + portale traguardo
    const rnd = mulberry32(1932);
    segs[3]?.sprites.push({ asset: this.sprites.finishArch, offset: 0 });
    segs[10]?.sprites.push({ asset: this.sprites.boards[0], offset: -1.52 });
    segs[11]?.sprites.push({ asset: this.sprites.flag, offset: -1.22 });
    segs[11]?.sprites.push({ asset: this.sprites.flag, offset: 1.22 });

    for (let i = 24; i < segs.length - 12; i++) {
      const seg = segs[i];
      const add = (asset: SpriteAsset, offset: number) => seg.sprites.push({ asset, offset });
      if (i % 11 === 0) add(this.sprites.cypress, -(1.28 + rnd() * 0.55));
      if (i % 13 === 0) add(this.sprites.cypress, 1.32 + rnd() * 0.5);
      if (i % 8 === 0) add(this.sprites.bush, (i % 16 === 0 ? -1 : 1) * (1.12 + rnd() * 0.22));
      if (i % 37 === 0) add(this.sprites.pine, (i % 74 === 0 ? -1 : 1) * (1.72 + rnd() * 0.5));
      if (i % 23 === 0) add(this.sprites.flag, (i % 46 === 0 ? -1 : 1) * (1.22 + rnd() * 0.18));
      if (i % 73 === 0)
        add(
          this.sprites.boards[Math.floor(rnd() * this.sprites.boards.length)],
          (i % 146 === 0 ? -1 : 1) * (1.62 + rnd() * 0.2)
        );
      if (i % 389 === 0) add(this.sprites.grandstand, 2.15);
    }
  }

  private findSegment(z: number): Segment {
    const idx = ((Math.floor(z / SEG_LEN) % this.segments.length) + this.segments.length) % this.segments.length;
    return this.segments[idx];
  }

  /* --------------------------------------------------------- proiezione */

  private projectScreen(p: Point3D) {
    const w = this.width;
    const h = this.height;
    const safeZ = Math.max(CAM_DEPTH + 1, p.camera.z);
    p.screen.scale = CAM_DEPTH / safeZ;
    p.screen.x = Math.round(w / 2 + p.screen.scale * p.camera.x * (w / 2));
    p.screen.y = Math.round(h / 2 - p.screen.scale * p.camera.y * (h / 2));
    p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * (w / 2));
  }

  private projectSegment(
    seg: Segment,
    camX1: number,
    camX2: number,
    camY: number,
    camZ: number
  ): boolean {
    const p1 = seg.p1;
    const p2 = seg.p2;
    p1.camera.x = (p1.world.x || 0) - camX1;
    p1.camera.y = (p1.world.y || 0) - camY;
    p1.camera.z = (p1.world.z || 0) - camZ;

    p2.camera.x = (p2.world.x || 0) - camX2;
    p2.camera.y = (p2.world.y || 0) - camY;
    p2.camera.z = (p2.world.z || 0) - camZ;

    const nearZ = CAM_DEPTH + 1.5;
    if (p2.camera.z <= nearZ) {
      return false;
    }

    // Se il segmento attraversa il piano vicino della telecamera, ritaglia p1 in 3D
    if (p1.camera.z < nearZ) {
      const dz = p2.camera.z - p1.camera.z;
      const t = dz > 0.0001 ? clamp((nearZ - p1.camera.z) / dz, 0, 1) : 0;
      p1.camera.x = lerp(p1.camera.x, p2.camera.x, t);
      p1.camera.y = lerp(p1.camera.y, p2.camera.y, t);
      p1.camera.z = nearZ;
    }

    this.projectScreen(p1);
    this.projectScreen(p2);
    return true;
  }

  /* ----------------------------------------------------------- ingresso */

  setInput(input: { steer?: number; brake?: boolean; turbo?: boolean }) {
    if (input.steer !== undefined) this.touchSteer = clamp(input.steer, -1, 1);
    if (input.brake !== undefined) this.touchBrake = input.brake;
    if (input.turbo !== undefined) this.touchTurbo = input.turbo;
  }

  triggerGadget() {
    if (this.mode !== "playing" || !this.heldGadget) return;
    const gadget = this.heldGadget;
    this.heldGadget = null;
    this.itemsUsed += 1;

    if (gadget === "emp") {
      this.audio.play("emp");
      this.shockwaveAnim = 1.0;
      this.shake = Math.max(this.shake, 18);
      this.flash = 0.35;
      this.flashColor = "92,205,255";
      const pcz = this.position + PLAYER_Z;
      let cleared = 0;
      for (const car of this.traffic) {
        const dist = car.z - pcz;
        if (dist > -400 && dist < 24000) {
          cleared += 1;
          this.spawnExplosionAtScreen(this.width * (0.35 + Math.random() * 0.3), this.height * 0.56, "#66d4ff");
          this.recycleCar(car);
        }
      }
      // Pulisce anche eventuali chiazze d'olio vicine
      this.items = this.items.filter((it) => !(it.kind === "oil" && it.z - pcz < 22000 && it.z > pcz - 400));
      const pts = Math.max(220, cleared * 220) * this.scoreMultiplier;
      this.score += pts;
      this.combo = Math.min(12, this.combo + Math.max(1, cleared));
      this.comboTimer = 6;
      this.addPopup("ONDA D'URTO!", `+${Math.round(pts)} · pista libera`, "#66d4ff", 1.15);
    } else if (gadget === "crono") {
      this.audio.play("crono");
      this.cronoTimer = CRONO_DURATION;
      this.flash = 0.28;
      this.flashColor = "185,140,255";
      this.addPopup("CRONO-GUIDA 2×", "rivali rallentati · punti doppi", "#c69eff", 1.1);
    } else if (gadget === "overboost") {
      this.audio.play("turbo");
      this.overboostTimer = OVERBOOST_DURATION;
      this.turbo = TURBO_MAX;
      this.turboLocked = false;
      this.shake = Math.max(this.shake, 14);
      this.flash = 0.32;
      this.flashColor = "255,145,75";
      this.addPopup("FURIA TRICOLORE!", "invincibile a tutta birra", "#ff8d54", 1.18);
    }
    this.emitHud();
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    if (this.mode === "playing") {
      if (["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "shift", "e", "x", "w"].includes(k)) {
        e.preventDefault();
      }
      if ((k === "e" || k === "x" || k === "arrowup" || k === "w") && !e.repeat) {
        this.triggerGadget();
        return;
      }
      this.keys.add(k);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = () => {
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchTurbo = false;
  };

  private get inputs() {
    const k = this.keys;
    let steer = this.touchSteer;
    if (k.has("arrowleft") || k.has("a") || k.has("q")) steer -= 1;
    if (k.has("arrowright") || k.has("d")) steer += 1;
    return {
      steer: clamp(steer, -1, 1),
      brake: this.touchBrake || k.has("arrowdown") || k.has("s"),
      turbo: this.touchTurbo || k.has("shift") || k.has(" "),
    };
  }

  private get scoreMultiplier() {
    return this.cronoTimer > 0 ? 2 : 1;
  }

  /* ------------------------------------------------------------- partita */

  start() {
    this.audio.unlock();
    this.audio.startEngine();
    this.carPhysics = computeCarPhysics(this.carConfig);
    this.sprites.player = buildPlayerSprite(this.carConfig);
    this.mode = "playing";
    this.position = 0;
    this.prevPosition = 0;
    this.playerX = 0;
    this.steerSmooth = 0;
    this.speed = 4400;
    this.level = 0;
    this.maxLives = this.carPhysics.maxLives;
    this.lives = this.maxLives;
    this.lap = 1;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.overtakes = 0;
    this.nearMisses = 0;
    this.coins = 0;
    this.itemsUsed = 0;
    this.topSpeed = 0;
    this.turbo = 60;
    this.turboActive = false;
    this.turboLocked = false;
    this.nitroSurgeTimer = 0;
    this.heldGadget = null;
    this.shieldTimer = 0;
    this.magnetTimer = 0;
    this.cronoTimer = 0;
    this.overboostTimer = 0;
    this.slipTimer = 0;
    this.shockwaveAnim = 0;
    this.invuln = 0;
    this.shake = 6;
    this.flash = 0;
    this.startFlash = 1.15;
    this.overTimer = 0;
    this.reported = false;
    this.summary = null;
    this.popups = [];
    this.particles = [];
    this.offroadWarned = false;
    this.traffic = [];
    this.items = [];
    this.nextItemSpawnZ = 6200;
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchTurbo = false;
    for (let i = 0; i < 4; i++) this.spawnCar(i === 0 ? 9500 : undefined);
    this.maintainItems();
    this.audio.play("start");
    this.emitHud();
  }

  pause() {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    this.needsRender = true;
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchTurbo = false;
    this.audio.stopEngine();
  }

  resume() {
    if (this.mode !== "paused") return;
    this.mode = "playing";
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchTurbo = false;
    this.audio.unlock();
    this.audio.startEngine();
  }

  toMenu() {
    this.mode = "attract";
    this.speed = 4200;
    this.playerX = 0;
    this.traffic = [];
    this.items = [];
    this.particles = [];
    this.popups = [];
    this.startFlash = 0;
    this.shieldTimer = 0;
    this.magnetTimer = 0;
    this.cronoTimer = 0;
    this.overboostTimer = 0;
    this.slipTimer = 0;
    this.heldGadget = null;
    this.audio.stopEngine();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.audio.dispose();
  }

  burstConfetti() {
    const colors = ["#1f7a52", "#f3ecdd", "#e23e31", "#e9b45c"];
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        x: this.width * (0.12 + Math.random() * 0.76),
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 130,
        vy: 90 + Math.random() * 220,
        size: 4 + Math.random() * 7,
        life: 2.4 + Math.random() * 1.8,
        maxLife: 4,
        color: colors[i % colors.length],
        kind: "confetti",
        layer: "front",
        gravity: 90,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 9,
      });
    }
  }

  /* ---------------------------------------------- traffico & oggetti */

  private canPlaceInLane(lane: number, z: number): boolean {
    const closeSameLane = this.traffic.some(
      (c) => Math.abs(c.z - z) < 3400 && Math.abs(c.targetX - lane) < 0.3
    );
    if (closeSameLane) return false;
    // Evita muri impossibili a 3 corsie
    const occupiedLanes = new Set<number>();
    occupiedLanes.add(lane);
    for (const c of this.traffic) {
      if (Math.abs(c.z - z) < 4000) {
        const nearest = LANES.reduce((best, l) =>
          Math.abs(l - c.targetX) < Math.abs(best - c.targetX) ? l : best
        );
        occupiedLanes.add(nearest);
      }
    }
    return occupiedLanes.size < 3;
  }

  private spawnCar(atZ?: number) {
    const isTruck = Math.random() > 0.82;
    const sprite = isTruck
      ? this.sprites.truck
      : this.sprites.cars[Math.floor(Math.random() * this.sprites.cars.length)];
    let lane = LANES[Math.floor(Math.random() * LANES.length)];
    let z = atZ ?? this.position + PLAYER_Z + 14000 + Math.random() * 26000;
    if (this.mode === "attract") z = this.position + PLAYER_Z + 9000 + Math.random() * 20000;

    for (let attempt = 0; attempt < 10; attempt++) {
      if (this.canPlaceInLane(lane, z)) break;
      lane = LANES[(attempt + 1) % LANES.length];
      z += 3600;
    }

    const baseSpeed = isTruck ? 2800 + Math.random() * 1100 : 3500 + Math.random() * 2500;
    this.traffic.push({
      x: lane,
      targetX: lane,
      z,
      prevZ: z,
      speed: baseSpeed,
      baseSpeed,
      sprite,
      halfWidth: sprite.worldWidth / 2 / ROAD_WIDTH,
      passed: false,
      nearMissed: false,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private recycleCar(car: TrafficCar) {
    const isTruck = Math.random() > 0.82;
    car.sprite = isTruck
      ? this.sprites.truck
      : this.sprites.cars[Math.floor(Math.random() * this.sprites.cars.length)];
    car.halfWidth = car.sprite.worldWidth / 2 / ROAD_WIDTH;
    let lane = LANES[Math.floor(Math.random() * LANES.length)];
    let z = this.position + PLAYER_Z + 19000 + Math.random() * 30000;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (this.canPlaceInLane(lane, z)) break;
      lane = LANES[(attempt + 1) % LANES.length];
      z += 3600;
    }
    car.x = lane;
    car.targetX = lane;
    car.z = z;
    car.prevZ = z;
    car.baseSpeed = isTruck ? 2800 + Math.random() * 1100 : 3500 + Math.random() * 2500;
    car.speed = car.baseSpeed;
    car.passed = false;
    car.nearMissed = false;
  }

  private maintainItems() {
    const pcz = this.position + PLAYER_Z;
    // Rimuove oggetti ormai superati
    this.items = this.items.filter((it) => it.z > pcz - 1800);

    const horizonZ = this.position + this.drawDist * SEG_LEN + 18000;
    while (this.nextItemSpawnZ < horizonZ) {
      const laneIdx = Math.floor(Math.random() * LANES.length);
      const lane = LANES[laneIdx];
      const roll = Math.random();

      if (roll < 0.38) {
        // Scia di 4 gettoni d'oro lungo la traiettoria
        const targetLaneIdx = clamp(laneIdx + (Math.random() > 0.5 ? 1 : -1), 0, 2);
        const endLane = Math.random() < 0.45 ? LANES[targetLaneIdx] : lane;
        const count = 4;
        for (let i = 0; i < count; i++) {
          this.items.push({
            id: this.itemSeq++,
            kind: "coin",
            x: lerp(lane, endLane, i / (count - 1)),
            z: this.nextItemSpawnZ + i * 760,
            bob: i * 0.7,
            dodged: false,
          });
        }
        this.nextItemSpawnZ += 5600 + Math.random() * 3200;
      } else if (roll < 0.56) {
        // Cassa Scuderia (Oggetto Tattico attivabile!)
        this.items.push({
          id: this.itemSeq++,
          kind: "mystery",
          x: lane,
          z: this.nextItemSpawnZ,
          bob: Math.random() * 6,
          dodged: false,
        });
        this.nextItemSpawnZ += 6800 + Math.random() * 4000;
      } else if (roll < 0.72) {
        // Bombola Nitro
        this.items.push({
          id: this.itemSeq++,
          kind: "nitro",
          x: lane,
          z: this.nextItemSpawnZ,
          bob: Math.random() * 6,
          dodged: false,
        });
        this.nextItemSpawnZ += 6000 + Math.random() * 3600;
      } else if (roll < 0.85) {
        // Power-up difensivo / supporto: Scudo, Calamita o Riparazione
        const needRepair = this.lives < this.maxLives && Math.random() < 0.5;
        const kind: TrackItemKind = needRepair
          ? "repair"
          : Math.random() < 0.52
          ? "shield"
          : "magnet";
        this.items.push({
          id: this.itemSeq++,
          kind,
          x: lane,
          z: this.nextItemSpawnZ,
          bob: Math.random() * 6,
          dodged: false,
        });
        this.nextItemSpawnZ += 6600 + Math.random() * 4000;
      } else {
        // Ostacolo stradale: Macchia d'Olio
        this.items.push({
          id: this.itemSeq++,
          kind: "oil",
          x: lane,
          z: this.nextItemSpawnZ,
          bob: 0,
          dodged: false,
        });
        this.nextItemSpawnZ += 5400 + Math.random() * 3600;
      }
    }
  }

  /* ------------------------------------------------------------ aggiorna */

  private loop = (time: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const rawDt = this.lastTime ? (time - this.lastTime) / 1000 : 0.016;
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(0.045, rawDt) : 0.016;
    this.lastTime = time;
    if (this.mode === "paused") {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      return;
    }
    this.update(dt);
    this.render();
  };

  private update(dt: number) {
    if (this.mode === "over") {
      this.overTimer = Math.max(0, this.overTimer - dt);
      this.speed = Math.max(0, this.speed - dt * 9000);
      this.prevPosition = this.position;
      this.position += this.speed * dt;
      this.shake = Math.max(0, this.shake - dt * 26);
      this.flash = Math.max(0, this.flash - dt * 2.4);
      this.updateParticles(dt);
      if (this.overTimer <= 0 && !this.reported) {
        this.reported = true;
        if (this.summary) this.cb.onGameOver(this.summary);
      }
      return;
    }

    if (this.mode === "attract") {
      this.elapsed += dt;
      this.speed = 4500 + Math.sin(this.elapsed * 0.35) * 900;
      this.prevPosition = this.position;
      this.position += this.speed * dt;
      this.playerX = Math.sin(this.elapsed * 0.5) * 0.26 + Math.sin(this.elapsed * 0.17) * 0.1;
      this.steerSmooth = Math.cos(this.elapsed * 0.5) * 0.4;
      this.shake = Math.max(0, this.shake - dt * 8);
      this.flash = 0;
      if (this.traffic.length < 3) this.spawnCar();
      for (const car of this.traffic) {
        car.prevZ = car.z;
        car.z += car.speed * dt;
        if (car.z < this.position + PLAYER_Z - 6000 || car.z > this.position + 42000) this.recycleCar(car);
      }
      this.exhaustTimer -= dt;
      if (this.exhaustTimer <= 0) {
        this.exhaustTimer = 0.08;
        this.emitExhaust(0.55);
      }
      this.updateParticles(dt);
      this.updatePopups(dt);
      this.bgDrift = lerp(this.bgDrift, this.playerX, 0.05);
      return;
    }

    /* ---------------- gara ---------------- */
    this.elapsed += dt;
    this.startFlash = Math.max(0, this.startFlash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    this.cronoTimer = Math.max(0, this.cronoTimer - dt);
    this.overboostTimer = Math.max(0, this.overboostTimer - dt);
    this.nitroSurgeTimer = Math.max(0, this.nitroSurgeTimer - dt);
    this.slipTimer = Math.max(0, this.slipTimer - dt);
    this.shockwaveAnim = Math.max(0, this.shockwaveAnim - dt * 1.65);

    this.level = clamp(Math.max(this.position / 680000, this.elapsed / 175), 0, 1);

    const input = this.inputs;
    const phys = this.carPhysics;
    const speedRatio = this.speed / MAX_SPEED;
    const playerSeg = this.findSegment(this.position + PLAYER_Z);
    const offroad = Math.abs(this.playerX) > 1.02;
    this.offroad = offroad;

    // Sterzo personalizzato + eventuale sbandata sull'olio + guardrail banchina
    const cronoGrip = this.cronoTimer > 0 ? 1.18 : 1;
    const steerRate =
      (1.55 + speedRatio * 1.25) *
      phys.handlingMult *
      cronoGrip *
      (this.brakeActive ? 1.15 : 1);
    const dx = dt * steerRate * (0.35 + 0.65 * speedRatio);
    const slipWobble = this.slipTimer > 0 ? Math.sin(this.elapsed * 23) * dt * 1.15 : 0;
    const edgeDamp = clamp(1 - Math.max(0, Math.abs(this.playerX) - 0.9) * 2.1, 0.22, 1);
    this.playerX += input.steer * dx + slipWobble;
    this.playerX -=
      dx * speedRatio * playerSeg.curve * 0.165 * phys.curveDriftMult * edgeDamp;
    if (Math.abs(this.playerX) > 1.06 && input.steer * Math.sign(this.playerX) <= 0) {
      this.playerX -= Math.sign(this.playerX) * dt * 0.58;
    }
    this.playerX = clamp(Number.isFinite(this.playerX) ? this.playerX : 0, -1.16, 1.16);
    this.steerSmooth = lerp(
      this.steerSmooth,
      input.steer + (this.slipTimer > 0 ? Math.sin(this.elapsed * 23) * 0.65 : 0),
      1 - Math.pow(0.001, dt)
    );

    // Fumo gomme durante sbandata olio
    if (this.slipTimer > 0 && Math.random() < 0.7) {
      this.particles.push({
        x: this.playerScreen.x + (Math.random() - 0.5) * this.playerScreen.w * 0.85,
        y: this.playerScreen.y + this.playerScreen.h * 0.45,
        vx: (Math.random() - 0.5) * 140,
        vy: -25 - Math.random() * 75,
        size: 10 + Math.random() * 14,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        color: "rgba(215,212,205,0.42)",
        kind: "smoke",
        layer: "front",
        gravity: -35,
        rot: 0,
        vr: 0,
      });
    }

    // Turbo + Overboost
    const forcedBoost = this.overboostTimer > 0 || this.nitroSurgeTimer > 0;
    const wantTurbo = forcedBoost || (input.turbo && !this.turboLocked && this.turbo > 3);
    if (wantTurbo && !this.turboActive && !forcedBoost) {
      this.audio.play("turbo");
      this.shake = Math.max(this.shake, 7);
      this.flash = 0.16;
      this.flashColor = getFlameSpec(this.carConfig.flame).glowRgba;
      this.addPopup("TURBO!", "spinta massima", "#e9b45c", 0.7);
    }
    this.turboActive = wantTurbo;
    this.brakeActive = input.brake && this.overboostTimer <= 0;

    if (this.overboostTimer > 0 || this.nitroSurgeTimer > 0) {
      // Non consuma la riserva durante Furia Tricolore o spinta Bombola Nitro
      this.turbo = Math.min(TURBO_MAX, this.turbo + dt * 6);
    } else if (this.turboActive) {
      this.turbo = Math.max(0, this.turbo - dt * 21.5 * phys.turboDrainMult);
      if (this.turbo <= 0.5) {
        this.turboActive = false;
        this.turboLocked = true;
      }
    } else {
      this.turbo = Math.min(TURBO_MAX, this.turbo + dt * 4.5 * phys.turboRegenMult);
      if (this.turboLocked && this.turbo > 18) this.turboLocked = false;
    }

    // Velocità con fisica del telaio scelto
    let target = MAX_SPEED * (0.74 + 0.26 * this.level) * phys.topSpeedMult;
    if (this.overboostTimer > 0) target *= 1.36;
    else if (this.turboActive) target *= 1.24;
    if (this.slipTimer > 0) target *= 0.76;
    if (this.brakeActive) target = MAX_SPEED * 0.26;
    if (offroad && this.overboostTimer <= 0) {
      target = Math.min(target, MAX_SPEED * phys.offroadCap);
    }

    const rate = this.brakeActive
      ? 4.2
      : (this.turboActive ? 2.0 : 1.0) * phys.accelMult;
    this.speed += (target - this.speed) * clamp(rate * dt, 0, 1);
    this.speed = clamp(this.speed, 700, MAX_SPEED * 1.52);
    this.topSpeed = Math.max(this.topSpeed, this.speed);

    this.prevPosition = this.position;
    this.position += this.speed * dt;

    // Controllo completamento Giro sul Traguardo!
    const currentLap = Math.floor(this.position / this.trackLength) + 1;
    if (currentLap > this.lap) {
      this.lap = currentLap;
      const lapBonus = 500 * currentLap * this.scoreMultiplier;
      this.score += lapBonus;
      this.turbo = Math.min(TURBO_MAX, this.turbo + 30);
      this.audio.play("lap");
      this.flash = 0.22;
      this.flashColor = "233,180,92";
      this.addPopup(`GIRO ${currentLap}!`, `traguardo +${lapBonus}`, "#e9b45c", 1.15);
    }

    // Punteggio continuo
    const gain =
      (this.speed / MAX_SPEED) *
      68 *
      dt *
      (this.turboActive ? 1.42 : 1) *
      this.scoreMultiplier;
    this.score += gain;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (offroad) {
      this.shake = Math.max(this.shake, 2.2);
      if (!this.offroadWarned) {
        this.offroadWarned = true;
        this.addPopup("FUORI PISTA", "rientra sull'asfalto", "#e9b45c", 0.9);
      }
      if (Math.random() < 0.6) {
        this.particles.push({
          x: this.playerScreen.x + (Math.random() - 0.5) * this.playerScreen.w * 0.7,
          y: this.playerScreen.y + this.playerScreen.h * 0.5,
          vx: (Math.random() - 0.5) * 150,
          vy: -40 - Math.random() * 90,
          size: 6 + Math.random() * 12,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9,
          color: "rgba(198,180,140,0.55)",
          kind: "dust",
          layer: "front",
          gravity: -20,
          rot: 0,
          vr: 0,
        });
      }
    } else {
      this.offroadWarned = false;
    }

    this.shake = Math.max(0, this.shake + (speedRatio > 0.9 ? 0.35 : 0.12) * dt * 10 - dt * 14);
    this.flash = Math.max(0, this.flash - dt * 2.2);

    this.maintainItems();
    this.updateItems(dt);
    this.updateTraffic(dt, offroad);
    this.updateParticles(dt);
    this.updatePopups(dt);

    this.exhaustTimer -= dt;
    const exhaustEvery = this.turboActive ? 0.026 : 0.07;
    if (this.exhaustTimer <= 0) {
      this.exhaustTimer = exhaustEvery;
      this.emitExhaust(this.turboActive ? 1.35 : 0.6);
    }

    this.bgDrift = lerp(this.bgDrift, this.playerX, 0.06);

    this.hudTimer += dt;
    if (this.hudTimer >= 0.065) {
      this.hudTimer = 0;
      this.emitHud();
    }
    this.audio.updateEngine(this.speed / MAX_SPEED, this.turboActive, offroad, this.cronoTimer > 0);
  }

  private updateItems(dt: number) {
    const pcz = this.position + PLAYER_Z;
    const prevPcz = this.prevPosition + PLAYER_Z;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.bob += dt * 4.2;

      // Attrazione magnetica su gettoni e bonus positivi
      if (this.magnetTimer > 0 && item.kind !== "oil") {
        const dist = item.z - pcz;
        if (dist > -300 && dist < 6400) {
          const pull = clamp(1 - dist / 6400, 0.15, 1) * dt * 5.8;
          item.x = lerp(item.x, this.playerX, clamp(pull, 0, 1));
        }
      }

      const lateral = Math.abs(item.x - this.playerX);
      const hitWidth =
        item.kind === "oil"
          ? PLAYER_HALF + 0.12
          : this.magnetTimer > 0
          ? PLAYER_HALF + 0.28
          : PLAYER_HALF + 0.16;

      const crossedZ =
        (item.z >= prevPcz - 340 && item.z <= pcz + 380) || Math.abs(item.z - pcz) < 420;

      if (crossedZ && lateral < hitWidth) {
        this.collectItem(item);
        this.items.splice(i, 1);
        continue;
      }

      // Bonus schivata olio a filo!
      if (item.kind === "oil" && !item.dodged && item.z < pcz - 360) {
        item.dodged = true;
        if (lateral < hitWidth + 0.22) {
          const pts = 90 * this.scoreMultiplier;
          this.score += pts;
          this.audio.play("overtake");
          this.addPopup("SCHIVATA!", `olio evitato +${pts}`, "#f3ecdd", 0.85);
        }
      }
    }
  }

  private collectItem(item: TrackItem) {
    const mult = this.scoreMultiplier;
    switch (item.kind) {
      case "coin": {
        this.coins += 1;
        const pts = 75 * this.combo * mult;
        this.score += pts;
        this.turbo = Math.min(TURBO_MAX, this.turbo + 4.5);
        this.comboTimer = Math.max(this.comboTimer, 4.5);
        this.audio.play("coin");
        this.spawnPickupSparks("#ffd86b", 10);
        if (this.coins % 5 === 0) {
          this.addPopup(`${this.coins} GETTONI!`, `+${pts} punti`, "#ffd86b", 0.92);
        }
        break;
      }
      case "nitro": {
        this.itemsUsed += 1;
        this.turbo = Math.min(TURBO_MAX, this.turbo + 48);
        this.turboLocked = false;
        this.nitroSurgeTimer = 1.7;
        const pts = 140 * mult;
        this.score += pts;
        this.audio.play("turbo");
        this.flash = 0.2;
        this.flashColor = getFlameSpec(this.carConfig.flame).glowRgba;
        this.spawnPickupSparks("#ff9c42", 18);
        this.addPopup("BOMBOLA NITRO!", `+48% turbo · +${pts}`, "#ffa94d", 1.02);
        break;
      }
      case "shield": {
        this.itemsUsed += 1;
        this.shieldTimer = SHIELD_DURATION;
        const pts = 150 * mult;
        this.score += pts;
        this.audio.play("powerup");
        this.flash = 0.16;
        this.flashColor = "72,232,190";
        this.spawnPickupSparks("#68f2cc", 18);
        this.addPopup("SCUDO CORSE!", "para 1 urto per 12s", "#68f2cc", 1.05);
        break;
      }
      case "magnet": {
        this.itemsUsed += 1;
        this.magnetTimer = MAGNET_DURATION;
        const pts = 140 * mult;
        this.score += pts;
        this.audio.play("powerup");
        this.spawnPickupSparks("#ffd86b", 16);
        this.addPopup("CALAMITA D'ORO!", "attira gettoni e bonus", "#ffd86b", 1.02);
        break;
      }
      case "repair": {
        this.itemsUsed += 1;
        this.audio.play("powerup");
        this.spawnPickupSparks("#65e898", 18);
        if (this.lives < this.maxLives) {
          this.lives += 1;
          this.score += 180 * mult;
          this.addPopup("PIT STOP!", "+1 vita ripristinata", "#65e898", 1.1);
        } else {
          const pts = 400 * mult;
          this.score += pts;
          this.turbo = Math.min(TURBO_MAX, this.turbo + 30);
          this.addPopup("ASSETTO PERFETTO!", `vite piene · +${pts}`, "#65e898", 1.05);
        }
        break;
      }
      case "mystery": {
        const pool: GadgetKind[] = ["emp", "crono", "overboost"];
        const rolled = pool[Math.floor(Math.random() * pool.length)];
        this.audio.play("powerup");
        this.spawnPickupSparks("#d49eff", 20);
        if (this.heldGadget) {
          this.score += 220 * mult;
        }
        this.heldGadget = rolled;
        const meta = GADGET_META[rolled];
        this.addPopup(`OGGETTO: ${meta.short}`, "premi E o ↑ per attivare", meta.color, 1.08);
        break;
      }
      case "oil": {
        if (this.overboostTimer > 0 || this.invuln > 0) {
          break;
        }
        if (this.shieldTimer > 0) {
          this.shieldTimer = Math.max(0, this.shieldTimer - 3.5);
          this.audio.play("shield_hit");
          this.addPopup("SCUDO STABILE", "olio neutralizzato", "#68f2cc", 0.9);
          break;
        }
        this.slipTimer = 1.25;
        this.combo = 1;
        this.comboTimer = 0;
        this.shake = Math.max(this.shake, 12);
        this.audio.play("oil");
        this.addPopup("OLIO IN PISTA!", "controsterza!", "#ff9b66", 1.05);
        break;
      }
    }
    this.emitHud();
  }

  private spawnPickupSparks(color: string, count: number) {
    const cx = this.playerScreen.x;
    const cy = this.playerScreen.y;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 70 + Math.random() * 240;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 24,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        size: 2 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.35,
        maxLife: 0.65,
        color,
        kind: "spark",
        layer: "front",
        gravity: 220,
        rot: a,
        vr: 0,
      });
    }
  }

  private spawnExplosionAtScreen(sx: number, sy: number, color: string) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 340;
      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 70,
        size: 2 + Math.random() * 3.5,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        color,
        kind: "spark",
        layer: "front",
        gravity: 300,
        rot: a,
        vr: 0,
      });
    }
  }

  private updateTraffic(dt: number, offroad: boolean) {
    const targetCount = 4 + Math.round(this.level * 6);
    while (this.traffic.length < targetCount) this.spawnCar();

    const pcz = this.position + PLAYER_Z;
    const prevPcz = this.prevPosition + PLAYER_Z;
    const rivalTimeScale = this.cronoTimer > 0 ? 0.58 : 1;

    for (const car of this.traffic) {
      // Gestione intelligente corsia: non tampona le auto più lente davanti
      let blockedAhead: TrafficCar | null = null;
      for (const other of this.traffic) {
        if (other === car) continue;
        const gap = other.z - car.z;
        if (gap > 0 && gap < 2800 && Math.abs(other.targetX - car.targetX) < 0.28) {
          blockedAhead = other;
          break;
        }
      }
      if (blockedAhead && car.speed > blockedAhead.speed) {
        const freeLane = LANES.find(
          (l) =>
            Math.abs(l - car.targetX) > 0.3 &&
            this.canPlaceInLane(l, car.z) &&
            Math.abs(car.z - pcz) > 2600
        );
        if (freeLane !== undefined) {
          car.targetX = freeLane;
        } else {
          car.speed = lerp(car.speed, blockedAhead.speed * 0.96, clamp(dt * 4, 0, 1));
        }
      } else {
        car.speed = lerp(car.speed, car.baseSpeed, clamp(dt * 1.5, 0, 1));
      }

      car.x = lerp(car.x, car.targetX, clamp(dt * 3.2, 0, 1));
      car.prevZ = car.z;
      car.z += car.speed * rivalTimeScale * dt;
      car.wobble += dt * 2;

      const lateral = Math.abs(car.x - this.playerX);
      const hitWidth = PLAYER_HALF + car.halfWidth;
      const overlappedZ =
        (car.prevZ >= prevPcz - 420 && car.z <= pcz + 460) || Math.abs(car.z - pcz) < 460;

      if (!offroad && lateral < hitWidth && overlappedZ) {
        if (this.overboostTimer > 0) {
          // Furia Tricolore travolge i rivali!
          const pts = 260 * this.scoreMultiplier;
          this.score += pts;
          this.overtakes += 1;
          this.combo = Math.min(12, this.combo + 2);
          this.comboTimer = 6;
          this.shake = Math.max(this.shake, 11);
          this.audio.play("shield_hit");
          this.spawnPickupSparks("#ff9b54", 24);
          this.addPopup("TRAVOLTO!", `+${pts} furia tricolore`, "#ff9b54", 1.05);
          this.recycleCar(car);
          continue;
        } else if (this.shieldTimer > 0) {
          // Lo Scudo assorbe il botto!
          this.shieldTimer = 0;
          this.invuln = 1.2;
          const pts = 280 * this.scoreMultiplier;
          this.score += pts;
          this.shake = Math.max(this.shake, 14);
          this.flash = 0.35;
          this.flashColor = "72,232,190";
          this.audio.play("shield_hit");
          this.spawnPickupSparks("#68f2cc", 26);
          this.addPopup("SCUDO SALVA!", `impatto assorbito · +${pts}`, "#68f2cc", 1.12);
          this.recycleCar(car);
          this.emitHud();
          continue;
        } else if (this.invuln <= 0) {
          this.crash(car);
        }
      } else if (car.z < pcz - 380 && !car.passed) {
        car.passed = true;
        const mult = this.scoreMultiplier;
        if (lateral < hitWidth + 0.24) {
          car.nearMissed = true;
          this.nearMisses += 1;
          this.combo = Math.min(12, this.combo + 2);
          this.comboTimer = 6;
          this.turbo = Math.min(TURBO_MAX, this.turbo + 21);
          const pts = 150 * this.combo * mult;
          this.score += pts;
          this.shake = Math.max(this.shake, 5);
          this.flash = 0.1;
          this.flashColor = "255,226,180";
          this.audio.play("nearmiss");
          this.addPopup("PELO!", `+${pts} · sfiorato`, "#e9b45c", 1.05);
        } else {
          this.overtakes += 1;
          this.combo = Math.min(12, this.combo + 1);
          this.comboTimer = 5.5;
          this.turbo = Math.min(TURBO_MAX, this.turbo + 15);
          const pts = 100 * this.combo * mult;
          this.score += pts;
          this.audio.play("overtake");
          this.addPopup(
            this.combo > 2 ? `SORPASSO ×${this.combo}` : "SORPASSO!",
            `+${pts}`,
            "#f3ecdd",
            0.9
          );
        }
        if (car.z < pcz - 2600) this.recycleCar(car);
      }
      if (car.z < pcz - 2800) this.recycleCar(car);
    }
  }

  private crash(car: TrafficCar) {
    this.lives -= 1;
    this.invuln = 1.85;
    this.combo = 1;
    this.comboTimer = 0;
    this.slipTimer = 0;
    this.turbo = Math.max(0, this.turbo - 18);
    this.speed *= 0.44;
    this.shake = 30;
    this.flash = 1;
    this.flashColor = "255,92,54";
    this.audio.play("crash");

    const impactX = this.playerScreen.x + (car.x - this.playerX) * this.playerScreen.w * 1.8;
    const impactY = this.playerScreen.y - this.playerScreen.h * 0.1;
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 460;
      this.particles.push({
        x: impactX + (Math.random() - 0.5) * 30,
        y: impactY + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 90,
        size: 1.5 + Math.random() * 3.5,
        life: 0.35 + Math.random() * 0.55,
        maxLife: 0.9,
        color: Math.random() > 0.4 ? "#ffd27a" : "#ff6b3d",
        kind: "spark",
        layer: "front",
        gravity: 420,
        rot: a,
        vr: 0,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: impactX + (Math.random() - 0.5) * 60,
        y: impactY,
        vx: (Math.random() - 0.5) * 130,
        vy: -30 - Math.random() * 120,
        size: 12 + Math.random() * 22,
        life: 0.7 + Math.random() * 0.6,
        maxLife: 1.3,
        color: "rgba(64,60,54,0.5)",
        kind: "smoke",
        layer: "front",
        gravity: -60,
        rot: 0,
        vr: 0,
      });
    }
    this.addPopup("BOTTO!", `vite -1 · ${Math.max(0, this.lives)} rimaste`, "#ff8a6a", 1.2);
    car.z = this.position + PLAYER_Z - 3200;
    car.passed = true;
    car.speed *= 0.7;

    if (this.lives <= 0) {
      this.mode = "over";
      this.overTimer = 0.72;
      this.shake = 36;
      this.summary = {
        score: Math.floor(this.score),
        distanceKm: Number((this.position / 140000).toFixed(2)),
        topSpeedKmh: Math.round(this.topSpeed / 40),
        overtakes: this.overtakes,
        nearMisses: this.nearMisses,
        durationSec: Math.round(this.elapsed),
        coins: this.coins,
        itemsUsed: this.itemsUsed,
        laps: this.lap,
      };
      this.audio.stopEngine();
      this.audio.play("lost");
    }
    this.emitHud();
  }

  private emitExhaust(strength: number) {
    const baseX = this.playerScreen.x;
    const baseY = this.playerScreen.y + this.playerScreen.h * 0.48;
    const flameSpec = getFlameSpec(this.carConfig.flame);
    for (const side of [-0.32, 0.32]) {
      if (Math.random() > strength) continue;
      const isFlame = (this.turboActive || this.overboostTimer > 0) && Math.random() < 0.85;
      this.particles.push({
        x: baseX + side * this.playerScreen.w,
        y: baseY,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 90,
        size: isFlame ? 8 + Math.random() * 11 : 6 + Math.random() * 8,
        life: isFlame ? 0.22 + Math.random() * 0.16 : 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: isFlame
          ? Math.random() > 0.45
            ? flameSpec.core
            : flameSpec.outer
          : "rgba(146,142,132,0.32)",
        kind: isFlame ? "flame" : "smoke",
        layer: "back",
        gravity: -30,
        rot: 0,
        vr: 0,
      });
    }
  }

  private addPopup(text: string, sub: string, color: string, scale: number) {
    if (this.popups.some((p) => p.text === text && p.life > p.maxLife * 0.35)) return;
    this.popups.push({
      text,
      sub,
      x: this.width * 0.5 + (Math.random() - 0.5) * this.width * 0.14,
      y: this.height * 0.29 + Math.random() * this.height * 0.03,
      life: 1.1,
      maxLife: 1.1,
      color,
      scale,
    });
    if (this.popups.length > 3) this.popups.shift();
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rot += p.vr * dt;
      if (p.kind === "smoke" || p.kind === "dust") {
        p.size += dt * 34;
        p.vx *= 1 - dt * 1.4;
      }
      if (this.particles.length > 280) this.particles.splice(0, this.particles.length - 280);
    }
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.y -= dt * 28;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  private emitHud() {
    this.cb.onHud(this.getSnapshot());
  }

  /* -------------------------------------------------------------- disegno */

  private resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    if ((rect.width < 40 || rect.height < 40) && this.width > 0 && this.height > 0) {
      return;
    }
    const w = Math.max(280, Math.round(rect.width || 800));
    const h = Math.max(320, Math.round(rect.height || 600));
    const nextDpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 1.8);
    if (w === this.width && h === this.height && nextDpr === this.dpr && this.background) {
      return;
    }
    this.dpr = nextDpr;
    this.drawDist = w < 700 ? 140 : 168;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.playerScreen = {
      x: w / 2,
      y: h * 0.86,
      w: Math.min(w * 0.235, 300),
      h: Math.min(w * 0.235, 300) * 0.7,
    };
    this.ctx.imageSmoothingQuality = "low";
    this.buildBackground();
    this.needsRender = true;
  }

  private buildBackground() {
    const w = this.width;
    const h = this.height;
    const bw = Math.ceil(w * 1.3);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bw * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(this.dpr, this.dpr);
    const horizon = h * 0.5;
    const rnd = mulberry32(77);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 4);
    sky.addColorStop(0, "#111e2b");
    sky.addColorStop(0.32, "#33465a");
    sky.addColorStop(0.58, "#8a7a76");
    sky.addColorStop(0.78, "#e2a279");
    sky.addColorStop(1, "#f8d7a8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, bw, horizon + 4);

    // Mare Tirreno scintillante in lontananza a destra
    const sunX = bw * 0.67;
    const sunY = horizon - h * 0.055;
    const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.36);
    halo.addColorStop(0, "rgba(255,229,168,0.95)");
    halo.addColorStop(0.22, "rgba(255,196,127,0.55)");
    halo.addColorStop(0.6, "rgba(246,158,102,0.18)");
    halo.addColorStop(1, "rgba(246,158,102,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, bw, horizon + 4);
    ctx.beginPath();
    ctx.arc(sunX, sunY, h * 0.062, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe9bb";
    ctx.fill();

    for (let i = 0; i < 9; i++) {
      const cx = rnd() * bw;
      const cy = horizon * (0.18 + rnd() * 0.52);
      const cw = h * (0.12 + rnd() * 0.24);
      const ch = h * (0.008 + rnd() * 0.014);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,226,196,${0.06 + rnd() * 0.1})`;
      ctx.fill();
    }

    const layers = [
      { base: horizon + 2, amp: h * 0.075, color: "#5f6557", offset: 0.3, freq: 1.4 },
      { base: horizon + 3, amp: h * 0.115, color: "#4b5748", offset: 2.1, freq: 2.1 },
      { base: horizon + 4, amp: h * 0.155, color: "#3a4738", offset: 4.7, freq: 3.1 },
    ];
    layers.forEach((layer, li) => {
      ctx.beginPath();
      ctx.moveTo(0, layer.base + 8);
      for (let x = 0; x <= bw; x += 8) {
        const t = x / bw;
        const y =
          layer.base -
          layer.amp *
            (0.5 + 0.5 * Math.sin(t * Math.PI * layer.freq + layer.offset)) *
            (0.7 + 0.3 * Math.sin(t * 9 + li));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(bw, layer.base + 8);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();

      if (li === 2) {
        for (let i = 0; i < 34; i++) {
          const x = rnd() * bw;
          const y =
            layer.base -
            layer.amp *
              (0.5 + 0.5 * Math.sin((x / bw) * Math.PI * layer.freq + layer.offset)) *
              (0.7 + 0.3 * Math.sin((x / bw) * 9 + li));
          const hh = h * (0.014 + rnd() * 0.022);
          ctx.beginPath();
          ctx.ellipse(x, y - hh / 2, hh * 0.14, hh * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(35,50,38,0.8)";
          ctx.fill();
        }
      }
      if (li === 1) {
        const vx = bw * 0.2;
        const vy =
          layer.base -
          layer.amp * (0.5 + 0.5 * Math.sin((vx / bw) * Math.PI * layer.freq + layer.offset));
        ctx.fillStyle = "#47513f";
        for (let i = 0; i < 8; i++) {
          const bwid = h * (0.012 + rnd() * 0.02);
          const bh = h * (0.012 + rnd() * 0.03);
          ctx.fillRect(vx + i * h * 0.026, vy - bh, bwid, bh);
        }
        ctx.fillRect(vx + h * 0.05, vy - h * 0.072, h * 0.014, h * 0.072);
        ctx.beginPath();
        ctx.moveTo(vx + h * 0.042, vy - h * 0.072);
        ctx.lineTo(vx + h * 0.057, vy - h * 0.072);
        ctx.lineTo(vx + h * 0.05, vy - h * 0.09);
        ctx.closePath();
        ctx.fill();
      }
    });

    const haze = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon + h * 0.02);
    haze.addColorStop(0, "rgba(250,206,158,0)");
    haze.addColorStop(1, "rgba(250,206,158,0.8)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - h * 0.12, bw, h * 0.14);

    this.background = canvas;
    this.bgWidth = bw;
  }

  private render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0 || this.segments.length === 0) return;

    if (!Number.isFinite(this.position) || this.position < 0) this.position = 0;
    if (!Number.isFinite(this.playerX)) this.playerX = 0;
    if (!Number.isFinite(this.bgDrift)) this.bgDrift = 0;

    // Ripristina sempre trasformazione e opacità per evitare stati sporchi del canvas
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#1a1c1a";
    ctx.fillRect(0, 0, w, h);

    // Coordinate cicliche sul circuito (evita la scomparsa della strada su tutti i giri)
    const trackPos = ((this.position % this.trackLength) + this.trackLength) % this.trackLength;
    const playerTrackPos =
      (((this.position + PLAYER_Z) % this.trackLength) + this.trackLength) % this.trackLength;

    const base = this.findSegment(trackPos);
    const basePercent = (trackPos % SEG_LEN) / SEG_LEN;
    const playerSeg = this.findSegment(playerTrackPos);
    const playerPercent = (playerTrackPos % SEG_LEN) / SEG_LEN;
    const playerY = lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPercent);
    const camX = this.playerX * ROAD_WIDTH;

    if (this.background) {
      const drift = -this.bgDrift * w * 0.03 - (base.curve / 5) * w * 0.006;
      const bleed = (this.bgWidth - w) / 2;
      const bob = Math.sin(trackPos / 900) * 2;
      ctx.drawImage(this.background, -bleed + drift, bob, this.bgWidth, h);
    }

    let maxy = h;
    let x = 0;
    let dx = -(base.curve * basePercent);
    const baseIdx = base.index;

    const shakeAmt = this.shake;
    const sx = (Math.random() - 0.5) * shakeAmt;
    const sy = (Math.random() - 0.5) * shakeAmt;
    ctx.save();
    ctx.translate(sx, sy);

    /* --- prato di base --- */
    const ground = ctx.createLinearGradient(0, h * 0.5, 0, h);
    ground.addColorStop(0, "#7a8251");
    ground.addColorStop(0.45, "#6b7549");
    ground.addColorStop(1, "#5d6740");
    ctx.fillStyle = ground;
    ctx.fillRect(-60, h * 0.48, w + 120, h * 0.55);

    /* --- strada --- */
    const numSegs = this.segments.length;
    for (let n = 0; n < this.drawDist; n++) {
      const rawIdx = baseIdx + n;
      const seg = this.segments[rawIdx % numSegs];
      seg.looped = rawIdx >= numSegs;
      seg.rendered = false;
      const wrapCount = Math.floor(rawIdx / numSegs);
      const camZ = trackPos - wrapCount * this.trackLength;
      const inFront = this.projectSegment(
        seg,
        camX - x,
        camX - x - dx,
        playerY + CAM_HEIGHT,
        camZ
      );
      seg.clip = maxy;
      x += dx;
      dx += seg.curve;
      if (
        !inFront ||
        seg.p2.screen.y >= seg.p1.screen.y ||
        seg.p2.screen.y >= maxy
      ) {
        continue;
      }
      seg.rendered = true;
      this.renderSegment(seg);
      maxy = seg.p2.screen.y;
    }

    // Foschia calda sull'orizzonte
    const fog = ctx.createLinearGradient(0, h * 0.5 - 2, 0, h * 0.62);
    fog.addColorStop(0, "rgba(247,206,164,0.6)");
    fog.addColorStop(0.4, "rgba(243,196,153,0.2)");
    fog.addColorStop(1, "rgba(243,196,153,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(-40, h * 0.5 - 2, w + 80, h * 0.14);

    /* --- raggruppa traffico e oggetti per segmento --- */
    const carsBySeg = new Map<number, TrafficCar[]>();
    for (const car of this.traffic) {
      const rel = car.z - this.position;
      if (rel <= 0 || rel >= this.drawDist * SEG_LEN) continue;
      const n = Math.floor(rel / SEG_LEN + basePercent);
      if (n < 0 || n >= this.drawDist - 1) continue;
      const arr = carsBySeg.get(n) ?? [];
      arr.push(car);
      carsBySeg.set(n, arr);
    }

    const itemsBySeg = new Map<number, TrackItem[]>();
    for (const item of this.items) {
      const rel = item.z - this.position;
      if (rel <= 0 || rel >= this.drawDist * SEG_LEN) continue;
      const n = Math.floor(rel / SEG_LEN + basePercent);
      if (n < 0 || n >= this.drawDist - 1) continue;
      const arr = itemsBySeg.get(n) ?? [];
      arr.push(item);
      itemsBySeg.set(n, arr);
    }

    /* --- scenografia + oggetti + auto, dal fondo verso la telecamera --- */
    for (let n = this.drawDist - 1; n >= 0; n--) {
      const seg = this.segments[(baseIdx + n) % this.segments.length];
      if (!seg.rendered) continue;
      const fade = clamp((this.drawDist - n) / 22, 0, 1);

      if (n > 2) {
        for (const item of seg.sprites) {
          this.renderSpriteAt(item.asset, item.offset, seg, seg.clip, fade);
        }
      }

      const itemList = itemsBySeg.get(n);
      if (itemList) {
        for (const item of itemList) {
          this.renderTrackItem(item, seg, seg.clip, fade, basePercent);
        }
      }

      const carList = carsBySeg.get(n);
      if (carList) {
        for (const car of carList) {
          this.renderCar(car, seg, seg.clip, fade, basePercent);
        }
      }
    }

    // Onda d'urto EMP visibile lungo la carreggiata
    if (this.shockwaveAnim > 0) {
      const progress = 1 - this.shockwaveAnim;
      const ringY = lerp(this.height * 0.82, this.height * 0.51, progress);
      const ringW = lerp(this.width * 0.36, this.width * 0.88, progress);
      const ringH = lerp(42, 14, progress);
      ctx.save();
      ctx.globalAlpha = clamp(this.shockwaveAnim * 1.2, 0, 1);
      ctx.strokeStyle = "#7ce8ff";
      ctx.lineWidth = 6 * this.shockwaveAnim + 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, ringY, ringW / 2, ringH, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.drawParticles("back");
    this.drawPlayerCar();
    this.drawParticles("front");

    // Linee di velocità
    const speedRatio = this.speed / MAX_SPEED;
    if (speedRatio > 0.82 || this.turboActive || this.overboostTimer > 0) {
      const count = this.overboostTimer > 0 ? 34 : this.turboActive ? 26 : 14;
      const flameSpec = getFlameSpec(this.carConfig.flame);
      ctx.save();
      ctx.translate(w / 2, h * 0.5);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r1 = Math.min(w, h) * (0.22 + Math.random() * 0.3);
        const len = 30 + Math.random() * 130 * (this.turboActive ? 1.5 : 1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.6);
        ctx.lineTo(Math.cos(a) * (r1 + len), Math.sin(a) * (r1 + len) * 0.6);
        ctx.strokeStyle = this.turboActive
          ? `rgba(${flameSpec.glowRgba},0.32)`
          : "rgba(255,240,214,0.16)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // Tinta Crono-Guida 2x
    if (this.cronoTimer > 0) {
      ctx.fillStyle = "rgba(130,88,235,0.11)";
      ctx.fillRect(0, 0, w, h);
    }

    // Vignettatura cinematografica
    const vignette = ctx.createRadialGradient(
      w / 2,
      h * 0.55,
      Math.min(w, h) * 0.32,
      w / 2,
      h * 0.55,
      Math.max(w, h) * 0.82
    );
    vignette.addColorStop(0, "rgba(8,10,9,0)");
    vignette.addColorStop(0.72, "rgba(8,10,9,0.16)");
    vignette.addColorStop(1, "rgba(8,10,9,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.3})`;
      ctx.fillRect(0, 0, w, h);
    }

    this.drawPopups();

    if (this.startFlash > 0) {
      const t = 1.15 - this.startFlash;
      const alpha = clamp(this.startFlash * 3, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, h * 0.4);
      const scale = 0.8 + t * 0.55;
      ctx.scale(scale, scale);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(11,13,12,0.45)";
      ctx.font = `900 ${Math.min(w * 0.17, 150)}px Anton, Impact, sans-serif`;
      ctx.fillText("VIA!", 4, 8);
      ctx.fillStyle = "#f3ecdd";
      ctx.fillText("VIA!", 0, 0);
      const bw = Math.min(w * 0.26, 230);
      ctx.fillStyle = "#1f7a52";
      ctx.fillRect(-bw / 2, 18, bw / 3, 9);
      ctx.fillStyle = "#f3ecdd";
      ctx.fillRect(-bw / 2 + bw / 3, 18, bw / 3, 9);
      ctx.fillStyle = "#e23e31";
      ctx.fillRect(-bw / 2 + (bw * 2) / 3, 18, bw / 3, 9);
      ctx.restore();
    }
  }

  private renderSegment(seg: Segment) {
    const ctx = this.ctx;
    const w = this.width;
    const x1 = seg.p1.screen.x;
    const y1 = seg.p1.screen.y;
    const w1 = seg.p1.screen.w;
    const x2 = seg.p2.screen.x;
    const y2 = seg.p2.screen.y;
    const w2 = seg.p2.screen.w;
    const clipY = seg.clip;
    const needsHillClip = y1 > clipY && clipY < this.height;

    if (needsHillClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-60, -40, w + 120, clipY + 40);
      ctx.clip();
    }

    const rumblePhase = Math.floor(seg.index / RUMBLE_LEN) % 3;
    const rumbleColor =
      rumblePhase === 0 ? "#1f7a52" : rumblePhase === 1 ? "#f0e7d6" : "#d2382b";
    const grass = seg.light ? "#707b4c" : "#677245";
    const road = seg.light ? "#3b3d3c" : "#363837";
    const r1 = w1 * 0.17;
    const r2 = w2 * 0.17;
    const laneW1 = w1 * 0.014;
    const laneW2 = w2 * 0.014;

    const grassBottom = Math.min(y1, clipY);
    if (grassBottom - y2 > 0.5) {
      ctx.fillStyle = grass;
      ctx.fillRect(-60, y2, w + 120, grassBottom - y2 + 1.5);
    }

    if (w1 > 1.2) {
      this.poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rumbleColor);
      this.poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rumbleColor);
    }

    this.poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, road);

    // Linea di partenza / traguardo a scacchi sul segmento 2-3
    if ((seg.index === 2 || seg.index === 3) && w1 > 4) {
      const checks = 10;
      for (let c = 0; c < checks; c++) {
        const tA = c / checks;
        const tB = (c + 1) / checks;
        const cx1a = lerp(x1 - w1, x1 + w1, tA);
        const cx1b = lerp(x1 - w1, x1 + w1, tB);
        const cx2a = lerp(x2 - w2, x2 + w2, tA);
        const cx2b = lerp(x2 - w2, x2 + w2, tB);
        const col = (c + seg.index) % 2 === 0 ? "#f3ecdd" : "#151818";
        this.poly(cx1a, y1, cx1b, y1, cx2b, y2, cx2a, y2, col);
      }
      if (needsHillClip) ctx.restore();
      return;
    }

    const detail = w1 > 2.2;
    if (detail) {
      const edge1 = w1 * 0.035;
      const edge2 = w2 * 0.035;
      this.poly(x1 - w1, y1, x1 - w1 + edge1, y1, x2 - w2 + edge2, y2, x2 - w2, y2, "rgba(243,236,221,0.62)");
      this.poly(x1 + w1, y1, x1 + w1 - edge1, y1, x2 + w2 - edge2, y2, x2 + w2, y2, "rgba(243,236,221,0.62)");
    }

    if (detail && seg.index % 8 < 4) {
      for (const lane of [-1, 1]) {
        const lx1 = x1 + (w1 * lane) / 3;
        const lx2 = x2 + (w2 * lane) / 3;
        this.poly(
          lx1 - laneW1,
          y1,
          lx1 + laneW1,
          y1,
          lx2 + laneW2,
          y2,
          lx2 - laneW2,
          y2,
          "rgba(243,236,221,0.72)"
        );
      }
    }

    if (needsHillClip) ctx.restore();
  }

  private poly(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    color: string
  ) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  private renderSpriteAt(asset: SpriteAsset, offset: number, seg: Segment, clip: number, fade: number) {
    const ctx = this.ctx;
    const scale = seg.p1.screen.scale;
    if (!scale || !isFinite(scale) || scale <= 0 || scale > 0.0042) return;
    const spriteScale = scale * (this.width / 2);
    let destW = asset.worldWidth * spriteScale;
    if (destW < 1.5) return;
    destW = Math.min(destW, this.width * 2.2);
    const destH = Math.min(destW * (asset.img.height / asset.img.width), this.height * 1.6);
    const destX = seg.p1.screen.x + offset * ROAD_WIDTH * spriteScale - destW / 2;
    const destY = seg.p1.screen.y - destH + 2;
    if (destX > this.width || destX + destW < 0) return;

    ctx.save();
    ctx.globalAlpha = fade;
    if (destY + destH > clip) {
      ctx.beginPath();
      ctx.rect(-60, -this.height, this.width + 120, clip + this.height);
      ctx.clip();
    }
    ctx.drawImage(asset.img, destX, destY, destW, destH);
    ctx.restore();
  }

  private renderTrackItem(
    item: TrackItem,
    seg: Segment,
    clip: number,
    fade: number,
    basePercent: number
  ) {
    const ctx = this.ctx;
    const p1 = seg.p1.screen;
    const p2 = seg.p2.screen;
    const rel = item.z - this.position;
    const raw = rel / SEG_LEN + basePercent;
    const t = clamp(raw - Math.floor(raw), 0, 1);
    const scale = lerp(p1.scale, p2.scale, t);
    if (!scale || !isFinite(scale) || scale <= 0) return;

    const centerX = lerp(p1.x, p2.x, t);
    const roadY = lerp(p1.y, p2.y, t);
    const spriteScale = scale * (this.width / 2);
    const asset = this.sprites.items[item.kind];
    const destW = asset.worldWidth * spriteScale;
    if (destW < 2) return;
    const destH = destW * (asset.img.height / asset.img.width);
    const floatOffset = item.kind === "oil" ? 0 : (Math.sin(item.bob) * 0.5 + 0.5) * destH * 0.16;
    const destX = centerX + item.x * ROAD_WIDTH * spriteScale - destW / 2;
    const destY = roadY - destH - floatOffset + 2;

    ctx.save();
    if (roadY > clip) {
      ctx.beginPath();
      ctx.rect(-60, -this.height, this.width + 120, clip + this.height);
      ctx.clip();
    }

    if (item.kind !== "oil") {
      ctx.globalAlpha = fade * 0.28;
      ctx.fillStyle = "#111210";
      ctx.beginPath();
      ctx.ellipse(destX + destW / 2, roadY, destW * 0.34, Math.max(1.5, destW * 0.06), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = fade;
    ctx.drawImage(asset.img, destX, destY, destW, destH);
    ctx.restore();
  }

  private renderCar(
    car: TrafficCar,
    seg: Segment,
    clip: number,
    fade: number,
    basePercent: number
  ) {
    const ctx = this.ctx;
    const p1 = seg.p1.screen;
    const p2 = seg.p2.screen;
    const rel = car.z - this.position;
    const raw = rel / SEG_LEN + basePercent;
    const t = clamp(raw - Math.floor(raw), 0, 1);
    const scale = lerp(p1.scale, p2.scale, t);
    if (!scale || !isFinite(scale) || scale <= 0) return;

    const centerX = lerp(p1.x, p2.x, t);
    const roadY = lerp(p1.y, p2.y, t);
    const spriteScale = scale * (this.width / 2);
    const destW = car.sprite.worldWidth * spriteScale;
    if (destW < 2) return;
    const destH = destW * (car.sprite.img.height / car.sprite.img.width);
    const destX = centerX + car.x * ROAD_WIDTH * spriteScale - destW / 2;
    const destY = roadY - destH + 2;

    ctx.save();
    if (destY + destH > clip) {
      ctx.beginPath();
      ctx.rect(-60, -this.height, this.width + 120, clip + this.height);
      ctx.clip();
    }

    ctx.globalAlpha = fade * 0.3;
    ctx.fillStyle = "#141311";
    ctx.beginPath();
    ctx.ellipse(destX + destW / 2, roadY, destW * 0.46, Math.max(1.5, destW * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade;
    const bump = Math.sin((this.position % this.trackLength) / 700 + car.wobble) * destH * 0.008;
    ctx.drawImage(car.sprite.img, destX, destY + bump, destW, destH);
    ctx.restore();
  }

  private drawPlayerCar() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const img = this.sprites.player.img;
    const destW = Math.min(Math.max(w * 0.24, 162), 320);
    const destH = destW * (img.height / img.width);
    const bottomPad = w < 760 ? 114 : Math.max(6, h * 0.014);
    const targetY = h - destH - bottomPad;
    const bounce = Math.sin(this.position / 240) * (this.speed / MAX_SPEED) * 1.8;
    const jitterX = this.offroad ? (Math.random() - 0.5) * 4 : 0;
    const x = w / 2 + this.steerSmooth * (this.turboActive ? 15 : 11) + jitterX;
    const y = targetY + bounce;
    this.playerScreen = { x, y: y + destH * 0.34, w: destW * 0.6, h: destH };
    const tilt = this.steerSmooth * (this.slipTimer > 0 ? 0.095 : 0.05);
    const invulnBlink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    const flameSpec = getFlameSpec(this.carConfig.flame);

    ctx.save();
    ctx.globalAlpha = invulnBlink ? 0.45 : 1;

    // Ombra auto
    ctx.fillStyle = "rgba(10,12,10,0.38)";
    ctx.beginPath();
    ctx.ellipse(x, y + destH * 0.9, destW * 0.52, destH * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Onde magnetiche dorate
    if (this.magnetTimer > 0) {
      const pulse = (this.elapsed * 2.2) % 1;
      ctx.save();
      ctx.strokeStyle = `rgba(233,180,92,${0.55 * (1 - pulse)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y + destH * 0.72,
        destW * (0.48 + pulse * 0.45),
        destH * (0.18 + pulse * 0.2),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Alone Turbo / Furia personalizzato
    if (this.turboActive || this.overboostTimer > 0) {
      const glow = ctx.createRadialGradient(
        x,
        y + destH * 0.62,
        2,
        x,
        y + destH * 0.62,
        destW * (this.overboostTimer > 0 ? 0.85 : 0.7)
      );
      glow.addColorStop(0, `rgba(${flameSpec.glowRgba},${this.overboostTimer > 0 ? 0.58 : 0.42})`);
      glow.addColorStop(1, `rgba(${flameSpec.glowRgba},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - destW, y - 20, destW * 2, destH * 1.3);
    }

    ctx.save();
    ctx.translate(x, y + destH * 0.55);
    ctx.rotate(tilt);
    ctx.drawImage(img, -destW / 2, -destH * 0.55, destW, destH);
    ctx.restore();

    // Cupola energetica Scudo Corse
    if (this.shieldTimer > 0) {
      const blink = this.shieldTimer < 2.2 ? 0.45 + 0.45 * Math.sin(this.elapsed * 18) : 0.85;
      ctx.save();
      ctx.globalAlpha = blink;
      const dome = ctx.createRadialGradient(
        x,
        y + destH * 0.54,
        destW * 0.22,
        x,
        y + destH * 0.54,
        destW * 0.62
      );
      dome.addColorStop(0, "rgba(104,242,204,0.03)");
      dome.addColorStop(0.78, "rgba(104,242,204,0.22)");
      dome.addColorStop(1, "rgba(104,242,204,0.52)");
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.ellipse(x, y + destH * 0.56, destW * 0.58, destH * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(165,255,230,0.75)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawParticles(layer: "back" | "front") {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.particles) {
      if (p.layer !== layer) continue;
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      } else if (p.kind === "confetti") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.62);
        ctx.restore();
      } else if (p.kind === "flame") {
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
        grad.addColorStop(0, "rgba(255,248,225,0.95)");
        grad.addColorStop(0.45, p.color);
        grad.addColorStop(1, "rgba(255,80,30,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawPopups() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.save();
    ctx.textAlign = "center";
    const ordered = [...this.popups].sort((a, b) => b.life - a.life);
    ordered.forEach((p, index) => {
      const t = 1 - p.life / p.maxLife;
      const alpha =
        p.life > p.maxLife * 0.75
          ? (p.maxLife - p.life) / (p.maxLife * 0.25)
          : clamp(p.life / (p.maxLife * 0.55), 0, 1);
      const scale = (0.72 + Math.min(1, t * 4) * 0.32 + Math.sin(t * Math.PI) * 0.05) * p.scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y + index * Math.min(Math.max(this.height * 0.072, 42), 66));
      ctx.scale(scale, scale);
      ctx.rotate(-0.035);
      ctx.font = `900 ${Math.min(Math.max(w * 0.044, 21), 38)}px Anton, Impact, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(11,13,12,0.6)";
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.font = `700 ${Math.min(Math.max(w * 0.022, 11), 16)}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(243,236,221,0.88)";
      ctx.fillText(p.sub.toUpperCase(), 0, Math.min(Math.max(h * 0.033, 18), 26));
      ctx.restore();
    });
    ctx.restore();
  }

  getSnapshot(): HudState {
    return {
      score: Math.floor(this.score),
      speedKmh: Math.round(this.speed / 40),
      gear: clamp(Math.ceil((this.speed / MAX_SPEED) * 6), 1, 7),
      combo: this.combo,
      comboProgress: clamp(this.comboTimer / 5.5, 0, 1),
      lives: Math.max(0, this.lives),
      maxLives: this.maxLives,
      turbo: this.turbo,
      distanceKm: Number((this.position / 140000).toFixed(2)),
      lap: this.lap,
      boost: this.turboActive || this.overboostTimer > 0,
      offroad: this.offroad,
      elapsed: this.elapsed,
      coins: this.coins,
      heldGadget: this.heldGadget,
      effects: {
        shield: clamp(this.shieldTimer / SHIELD_DURATION, 0, 1),
        magnet: clamp(this.magnetTimer / MAGNET_DURATION, 0, 1),
        crono: clamp(this.cronoTimer / CRONO_DURATION, 0, 1),
        overboost: clamp(this.overboostTimer / OVERBOOST_DURATION, 0, 1),
        slip: this.slipTimer > 0,
      },
    };
  }
}

export { MilleCurveGame as VeloceGame };
