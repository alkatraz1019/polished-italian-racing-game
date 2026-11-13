import { AudioEngine } from "./audio";
import { buildSprites, type SpriteAsset, type SpriteCatalog } from "./sprites";
import type { GameSummary, HudState, Phase } from "./types";

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
  z: number;
  speed: number;
  sprite: SpriteAsset;
  halfWidth: number;
  passed: boolean;
  nearMissed: boolean;
  prevZ: number;
  wobble: number;
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
  return a + (b - a) * -Math.cos(p * Math.PI) / 2 + (b - a) / 2;
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

export class VeloceGame {
  readonly audio = new AudioEngine();

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
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
  private speed = 4200;
  private steerSmooth = 0;
  private offroad = false;
  private brakeActive = false;
  private turboActive = false;
  private turboLocked = false;
  private turbo = 55;
  private level = 0;
  private lives = 3;
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private elapsed = 0;
  private overtakes = 0;
  private nearMisses = 0;
  private topSpeed = 0;
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
  private maxComboReached = 1;

  private keys = new Set<string>();
  private touchSteer = 0;
  private touchBrake = false;
  private touchTurbo = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.cb = cb;
    this.sprites = buildSprites();
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
    const addRoad = (enter: number, hold: number, leave: number, curve: number, y: number) => {
      const startY = lastY();
      const endY = startY + y;
      const total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++)
        addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    };

    // Un nastro costiero: rettilinei, curve morbide, tornanti e saliscendi.
    addRoad(30, 70, 30, 0, 0);
    addRoad(30, 40, 30, 2.2, 0);
    addRoad(24, 50, 24, -2.6, 260);
    addRoad(24, 30, 24, 0, -160);
    addRoad(30, 50, 30, 3.2, 0);
    addRoad(22, 40, 22, -1.6, -260);
    addRoad(18, 60, 18, 0.9, 200);
    addRoad(30, 30, 30, -3.4, 0);
    addRoad(24, 46, 24, 2.4, 320);
    addRoad(30, 90, 30, 0, -140);
    addRoad(20, 30, 20, 3.8, -200);
    addRoad(26, 44, 26, -2.2, 180);
    addRoad(30, 50, 30, 1.4, 0);
    addRoad(22, 36, 22, -3.6, -300);
    addRoad(30, 80, 30, 0, 240);
    addRoad(20, 30, 20, 2.8, 0);
    while (segs.length < TRACK_SEGMENTS) {
      addRoad(26, 60, 26, 0, 240);
      addRoad(22, 44, 22, -2.8, -220);
      addRoad(28, 50, 28, 2.2, 180);
      addRoad(20, 40, 20, 0, -160);
      addRoad(24, 46, 24, 3.4, 0);
      addRoad(24, 40, 24, -1.8, 200);
    }
    while (segs.length > TRACK_SEGMENTS) segs.pop();
    this.segments = segs;
    this.trackLength = segs.length * SEG_LEN;

    // Scenografia costiera
    const rnd = mulberry32(1932);
    for (let i = 24; i < segs.length; i++) {
      const seg = segs[i];
      const add = (asset: SpriteAsset, offset: number) => seg.sprites.push({ asset, offset });
      if (i % 11 === 0) add(this.sprites.cypress, -(1.28 + rnd() * 0.55));
      if (i % 13 === 0) add(this.sprites.cypress, 1.32 + rnd() * 0.5);
      if (i % 8 === 0) add(this.sprites.bush, (i % 16 === 0 ? -1 : 1) * (1.12 + rnd() * 0.22));
      if (i % 37 === 0) add(this.sprites.pine, (i % 74 === 0 ? -1 : 1) * (1.72 + rnd() * 0.5));
      if (i % 23 === 0) add(this.sprites.flag, (i % 46 === 0 ? -1 : 1) * (1.22 + rnd() * 0.18));
      if (i % 73 === 0)
        add(this.sprites.boards[Math.floor(rnd() * this.sprites.boards.length)], (i % 146 === 0 ? -1 : 1) * (1.62 + rnd() * 0.2));
      if (i % 389 === 0) add(this.sprites.grandstand, 2.15);
    }
    // Tabellone d'ingresso
    segs[10]?.sprites.push({ asset: this.sprites.boards[3], offset: -1.5 });
    segs[11]?.sprites.push({ asset: this.sprites.flag, offset: -1.2 });
    segs[11]?.sprites.push({ asset: this.sprites.flag, offset: 1.2 });
  }

  private findSegment(z: number): Segment {
    const idx = ((Math.floor(z / SEG_LEN) % this.segments.length) + this.segments.length) % this.segments.length;
    return this.segments[idx];
  }

  /* --------------------------------------------------------- proiezione */

  private project(p: Point3D, camX: number, camY: number, camZ: number) {
    const w = this.width;
    const h = this.height;
    p.camera.x = (p.world.x || 0) - camX;
    p.camera.y = (p.world.y || 0) - camY;
    p.camera.z = (p.world.z || 0) - camZ;
    if (p.camera.z < 0.8) p.camera.z = 0.8;
    p.screen.scale = CAM_DEPTH / p.camera.z;
    p.screen.x = Math.round(w / 2 + p.screen.scale * p.camera.x * (w / 2));
    p.screen.y = Math.round(h / 2 - p.screen.scale * p.camera.y * (h / 2));
    p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * (w / 2));
  }

  /* ----------------------------------------------------------- ingresso */

  setInput(input: { steer?: number; brake?: boolean; turbo?: boolean }) {
    if (input.steer !== undefined) this.touchSteer = clamp(input.steer, -1, 1);
    if (input.brake !== undefined) this.touchBrake = input.brake;
    if (input.turbo !== undefined) this.touchTurbo = input.turbo;
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    if (this.mode === "playing") {
      if (["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "shift"].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === " ") this.touchTurbo = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
    if (e.key === " ") this.touchTurbo = false;
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

  /* ------------------------------------------------------------- partita */

  start() {
    this.audio.unlock();
    this.audio.startEngine();
    this.mode = "playing";
    this.position = 0;
    this.playerX = 0;
    this.steerSmooth = 0;
    this.speed = 4200;
    this.level = 0;
    this.lives = 3;
    this.score = 0;
    this.combo = 1;
    this.maxComboReached = 1;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.overtakes = 0;
    this.nearMisses = 0;
    this.topSpeed = 0;
    this.turbo = 55;
    this.turboActive = false;
    this.turboLocked = false;
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
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchTurbo = false;
    for (let i = 0; i < 4; i++) this.spawnCar(i === 0 ? 9000 : undefined);
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
    this.particles = [];
    this.popups = [];
    this.startFlash = 0;
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

  private spawnCar(atZ?: number) {
    const rnd = Math.random();
    const isTruck = rnd > 0.82;
    const sprite = isTruck ? this.sprites.truck : this.sprites.cars[Math.floor(Math.random() * this.sprites.cars.length)];
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    let z = atZ ?? this.position + PLAYER_Z + 14000 + Math.random() * 26000;
    if (this.mode === "attract") z = this.position + PLAYER_Z + 9000 + Math.random() * 20000;
    for (let attempt = 0; attempt < 7; attempt++) {
      const clash = this.traffic.some((c) => Math.abs(c.z - z) < 3000 && Math.abs(c.x - lane) < 0.3);
      if (!clash) break;
      z += 4200;
    }
    this.traffic.push({
      x: lane,
      z,
      prevZ: z,
      speed: isTruck ? 2700 + Math.random() * 1200 : 3400 + Math.random() * 2600,
      sprite,
      halfWidth: sprite.worldWidth / 2 / ROAD_WIDTH,
      passed: false,
      nearMissed: false,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private recycleCar(car: TrafficCar) {
    const spriteRnd = Math.random();
    const isTruck = spriteRnd > 0.82;
    car.sprite = isTruck ? this.sprites.truck : this.sprites.cars[Math.floor(Math.random() * this.sprites.cars.length)];
    car.halfWidth = car.sprite.worldWidth / 2 / ROAD_WIDTH;
    car.x = LANES[Math.floor(Math.random() * LANES.length)];
    car.z = this.position + PLAYER_Z + 18000 + Math.random() * 30000;
    car.prevZ = car.z;
    car.speed = isTruck ? 2700 + Math.random() * 1200 : 3400 + Math.random() * 2600;
    car.passed = false;
    car.nearMissed = false;
  }

  /* ------------------------------------------------------------ aggiorna */

  private loop = (time: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.lastTime ? Math.min(0.045, (time - this.lastTime) / 1000) : 0.016;
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
      this.speed = 4400 + Math.sin(this.elapsed * 0.35) * 900;
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
    this.level = clamp(Math.max(this.position / 620000, this.elapsed / 165), 0, 1);

    const input = this.inputs;
    const speedRatio = this.speed / MAX_SPEED;
    const playerSeg = this.findSegment(this.position + PLAYER_Z);
    const offroad = Math.abs(this.playerX) > 1.02;
    this.offroad = offroad;

    // sterzo con inerzia
    const steerRate = (1.55 + speedRatio * 1.25) * (this.brakeActive ? 1.15 : 1);
    const dx = dt * steerRate * (0.35 + 0.65 * speedRatio);
    this.playerX += input.steer * dx;
    this.playerX -= dx * speedRatio * playerSeg.curve * 0.17;
    this.playerX = clamp(this.playerX, -1.62, 1.62);
    this.steerSmooth = lerp(this.steerSmooth, input.steer, 1 - Math.pow(0.001, dt));

    // turbo
    const wantTurbo = input.turbo && !this.turboLocked && this.turbo > 3;
    if (wantTurbo && !this.turboActive) {
      this.audio.play("turbo");
      this.shake = Math.max(this.shake, 7);
      this.flash = 0.18;
      this.flashColor = "255,196,120";
      this.addPopup("TURBO!", "spinta massima", "#e9b45c", 0.7);
    }
    this.turboActive = wantTurbo;
    this.brakeActive = input.brake;
    if (this.turboActive) {
      this.turbo = Math.max(0, this.turbo - dt * 22);
      if (this.turbo <= 0.5) {
        this.turboActive = false;
        this.turboLocked = true;
      }
    } else {
      this.turbo = Math.min(TURBO_MAX, this.turbo + dt * 4.2);
      if (this.turboLocked && this.turbo > 18) this.turboLocked = false;
    }

    // velocità
    let target = MAX_SPEED * (0.72 + 0.28 * this.level);
    if (this.turboActive) target *= 1.24;
    if (this.brakeActive) target = MAX_SPEED * 0.24;
    if (offroad) target = Math.min(target, MAX_SPEED * 0.45);
    const rate = this.brakeActive ? 4.2 : this.turboActive ? 1.9 : 0.95;
    this.speed += (target - this.speed) * clamp(rate * dt, 0, 1);
    this.speed = clamp(this.speed, 700, MAX_SPEED * 1.28);
    this.topSpeed = Math.max(this.topSpeed, this.speed);
    this.position += this.speed * dt;

    // punteggio continuo
    const gain = (this.speed / MAX_SPEED) * 66 * dt * (this.turboActive ? 1.4 : 1);
    this.score += gain;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (offroad) {
      this.shake = Math.max(this.shake, 2.2);
      if (!this.offroadWarned) {
        this.offroadWarned = true;
        this.addPopup("FUORI PISTA", "torna sull'asfalto", "#e9b45c", 0.9);
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

    this.updateTraffic(dt, offroad);
    this.updateParticles(dt);
    this.updatePopups(dt);

    this.exhaustTimer -= dt;
    const exhaustEvery = this.turboActive ? 0.028 : 0.07;
    if (this.exhaustTimer <= 0) {
      this.exhaustTimer = exhaustEvery;
      this.emitExhaust(this.turboActive ? 1.35 : 0.6);
    }

    this.bgDrift = lerp(this.bgDrift, this.playerX, 0.06);

    this.hudTimer += dt;
    if (this.hudTimer >= 0.07) {
      this.hudTimer = 0;
      this.emitHud();
    }
    this.audio.updateEngine(this.speed / MAX_SPEED, this.turboActive, offroad);
  }

  private updateTraffic(dt: number, offroad: boolean) {
    const targetCount = 4 + Math.round(this.level * 6);
    while (this.traffic.length < targetCount) this.spawnCar();
    const pcz = this.position + PLAYER_Z;
    for (const car of this.traffic) {
      car.prevZ = car.z;
      car.z += car.speed * dt;
      car.wobble += dt * 2;
      const lateral = Math.abs(car.x - this.playerX);
      const hitWidth = PLAYER_HALF + car.halfWidth;
      const close = Math.abs(car.z - pcz);

      if (this.invuln <= 0 && !offroad && lateral < hitWidth && close < 460) {
        this.crash(car);
      } else if (car.z < pcz - 380 && !car.passed) {
        car.passed = true;
        if (lateral < hitWidth + 0.24) {
          car.nearMissed = true;
          this.nearMisses += 1;
          this.combo = Math.min(10, this.combo + 2);
          this.maxComboReached = Math.max(this.maxComboReached, this.combo);
          this.comboTimer = 6;
          this.turbo = Math.min(TURBO_MAX, this.turbo + 21);
          this.score += 150 * this.combo;
          this.shake = Math.max(this.shake, 5);
          this.flash = 0.1;
          this.flashColor = "255,226,180";
          this.audio.play("nearmiss");
          this.addPopup("MISSILE!", `+${150 * this.combo} · vicinissimo`, "#e9b45c", 1.05);
        } else {
          this.overtakes += 1;
          this.combo = Math.min(10, this.combo + 1);
          this.maxComboReached = Math.max(this.maxComboReached, this.combo);
          this.comboTimer = 5.5;
          this.turbo = Math.min(TURBO_MAX, this.turbo + 15);
          this.score += 100 * this.combo;
          this.audio.play("overtake");
          this.addPopup(
            this.combo > 2 ? `SORPASSO ×${this.combo}` : "SORPASSO!",
            `+${100 * this.combo}`,
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
    this.invuln = 1.8;
    this.combo = 1;
    this.comboTimer = 0;
    this.turbo = Math.max(0, this.turbo - 18);
    this.speed *= 0.42;
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
      };
      this.audio.stopEngine();
      this.audio.play("lost");
    }
  }

  private emitExhaust(strength: number) {
    const baseX = this.playerScreen.x;
    const baseY = this.playerScreen.y + this.playerScreen.h * 0.48;
    for (const side of [-0.32, 0.32]) {
      if (Math.random() > strength) continue;
      const isFlame = this.turboActive && Math.random() < 0.8;
      this.particles.push({
        x: baseX + side * this.playerScreen.w,
        y: baseY,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 90,
        size: isFlame ? 7 + Math.random() * 10 : 6 + Math.random() * 8,
        life: isFlame ? 0.22 + Math.random() * 0.16 : 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: isFlame ? (Math.random() > 0.5 ? "#ffb347" : "#ff6136") : "rgba(146,142,132,0.32)",
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
      x: this.width * 0.5 + (Math.random() - 0.5) * this.width * 0.16,
      y: this.height * 0.3 + Math.random() * this.height * 0.03,
      life: 1.05,
      maxLife: 1.05,
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
      if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
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
    const hud: HudState = {
      score: Math.floor(this.score),
      speedKmh: Math.round(this.speed / 40),
      gear: clamp(Math.ceil((this.speed / MAX_SPEED) * 6), 1, 7),
      combo: this.combo,
      comboProgress: clamp(this.comboTimer / 5.5, 0, 1),
      lives: Math.max(0, this.lives),
      turbo: this.turbo,
      distanceKm: Number((this.position / 140000).toFixed(2)),
      boost: this.turboActive,
      offroad: this.offroad,
      elapsed: this.elapsed,
    };
    this.cb.onHud(hud);
  }

  /* -------------------------------------------------------------- disegno */

  private resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width));
    const h = Math.max(320, Math.round(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 1.8);
    this.drawDist = w < 700 ? 132 : 160;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.playerScreen = { x: w / 2, y: h * 0.86, w: Math.min(w * 0.235, 300), h: Math.min(w * 0.235, 300) * 0.7 };
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

    // sole basso
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

    // nuvole filanti
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

    // colline a tre strati
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
          layer.amp * (0.5 + 0.5 * Math.sin(t * Math.PI * layer.freq + layer.offset)) *
            (0.7 + 0.3 * Math.sin(t * 9 + li));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(bw, layer.base + 8);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();

      // cipressi sul crinale
      if (li === 2) {
        for (let i = 0; i < 34; i++) {
          const x = rnd() * bw;
          const y =
            layer.base -
            layer.amp * (0.5 + 0.5 * Math.sin((x / bw) * Math.PI * layer.freq + layer.offset)) *
              (0.7 + 0.3 * Math.sin((x / bw) * 9 + li));
          const hh = h * (0.014 + rnd() * 0.022);
          ctx.beginPath();
          ctx.ellipse(x, y - hh / 2, hh * 0.14, hh * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(35,50,38,0.8)";
          ctx.fill();
        }
      }
      if (li === 1) {
        // borgo sul mare
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

    // foschia calda sull'orizzonte
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

    ctx.fillStyle = "#1a1c1a";
    ctx.fillRect(0, 0, w, h);

    // sfondo con parallasse
    if (this.background) {
      const drift = -this.bgDrift * w * 0.03 - (this.findSegment(this.position).curve / 5) * w * 0.006;
      const bleed = (this.bgWidth - w) / 2;
      const bob = Math.sin(this.position / 900) * 2;
      ctx.drawImage(this.background, -bleed + drift, bob, this.bgWidth, h);
    }

    const base = this.findSegment(this.position);
    const basePercent = (this.position % SEG_LEN) / SEG_LEN;
    const playerSeg = this.findSegment(this.position + PLAYER_Z);
    const playerPercent = ((this.position + PLAYER_Z) % SEG_LEN) / SEG_LEN;
    const playerY = lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPercent);
    const camX = this.playerX * ROAD_WIDTH;

    let maxy = h;
    let x = 0;
    let dx = -(base.curve * basePercent);
    const baseIdx = base.index;

    const shakeAmt = this.shake;
    const sx = (Math.random() - 0.5) * shakeAmt;
    const sy = (Math.random() - 0.5) * shakeAmt;
    ctx.save();
    ctx.translate(sx, sy);

    /* --- prato di base: un solo riempimento, la strada ci va sopra --- */
    const ground = ctx.createLinearGradient(0, h * 0.5, 0, h);
    ground.addColorStop(0, "#7a8251");
    ground.addColorStop(0.45, "#6b7549");
    ground.addColorStop(1, "#5d6740");
    ctx.fillStyle = ground;
    ctx.fillRect(-40, h * 0.5 - 1, w + 80, h * 0.5 + 2);

    /* --- strada --- */
    for (let n = 0; n < this.drawDist; n++) {
      const seg = this.segments[(baseIdx + n) % this.segments.length];
      seg.looped = baseIdx + n >= this.segments.length;
      seg.rendered = false;
      const camZ = this.position - (seg.looped ? this.trackLength : 0);
      this.project(seg.p1, camX - x, playerY + CAM_HEIGHT, camZ);
      this.project(seg.p2, camX - x - dx, playerY + CAM_HEIGHT, camZ);
      seg.clip = maxy;
      x += dx;
      dx += seg.curve;
      if (
        seg.p1.camera.z <= CAM_DEPTH ||
        seg.p2.screen.y >= seg.p1.screen.y ||
        seg.p2.screen.y >= maxy
      ) {
        continue;
      }
      seg.rendered = true;
      this.renderSegment(seg);
      maxy = seg.p2.screen.y;
    }

    // foschia sopra la strada
    const fog = ctx.createLinearGradient(0, h * 0.5 - 2, 0, h * 0.62);
    fog.addColorStop(0, "rgba(247,206,164,0.6)");
    fog.addColorStop(0.4, "rgba(243,196,153,0.2)");
    fog.addColorStop(1, "rgba(243,196,153,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(-40, h * 0.5 - 2, w + 80, h * 0.14);

    /* --- auto del traffico raggruppate per segmento --- */
    const carsBySeg = new Map<number, { car: TrafficCar; t: number }[]>();
    for (const car of this.traffic) {
      const rel = car.z - this.position;
      if (rel <= 0 || rel >= this.drawDist * SEG_LEN) continue;
      const raw = rel / SEG_LEN + basePercent;
      const n = Math.floor(raw);
      if (n < 0 || n >= this.drawDist - 1) continue;
      const arr = carsBySeg.get(n) ?? [];
      arr.push({ car, t: raw - n });
      carsBySeg.set(n, arr);
    }

    /* --- scenografia + auto, da lontano a vicino --- */
    for (let n = this.drawDist - 1; n >= 0; n--) {
      const seg = this.segments[(baseIdx + n) % this.segments.length];
      if (!seg.rendered) continue;
      const fade = clamp((this.drawDist - n) / 22, 0, 1);
      if (n > 7) {
        for (const item of seg.sprites) {
          this.renderSpriteAt(item.asset, item.offset, seg, seg.clip, fade);
        }
      }
      const list = carsBySeg.get(n);
      if (list) {
        for (const { car } of list) {
          this.renderCar(car, seg, seg.clip, fade);
        }
      }
    }

    /* --- particelle dietro l'auto --- */
    this.drawParticles("back");

    /* --- auto del giocatore --- */
    this.drawPlayerCar();

    /* --- particelle davanti --- */
    this.drawParticles("front");

    // linee di velocità
    const speedRatio = this.speed / MAX_SPEED;
    if (speedRatio > 0.82 || this.turboActive) {
      const count = this.turboActive ? 26 : 14;
      ctx.save();
      ctx.translate(w / 2, h * 0.5);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r1 = Math.min(w, h) * (0.22 + Math.random() * 0.3);
        const len = 30 + Math.random() * 130 * (this.turboActive ? 1.5 : 1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.6);
        ctx.lineTo(Math.cos(a) * (r1 + len), Math.sin(a) * (r1 + len) * 0.6);
        ctx.strokeStyle = this.turboActive ? "rgba(255,214,150,0.28)" : "rgba(255,240,214,0.16)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // vignettatura
    const vignette = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.32, w / 2, h * 0.55, Math.max(w, h) * 0.82);
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
    const rumblePhase = Math.floor(seg.index / RUMBLE_LEN) % 3;
    const rumbleColor =
      rumblePhase === 0 ? "#1f7a52" : rumblePhase === 1 ? "#f0e7d6" : "#d2382b";
    const grass = seg.light ? "#707b4c" : "#677245";
    const road = seg.light ? "#3b3d3c" : "#363837";
    const r1 = w1 * 0.17;
    const r2 = w2 * 0.17;
    const laneW1 = w1 * 0.014;
    const laneW2 = w2 * 0.014;

    if (y1 - y2 > 0.9) {
      ctx.fillStyle = grass;
      ctx.fillRect(0, y2, w, y1 - y2 + 1);
    }

    // cordoli tricolore
    if (w1 > 1.2) {
      this.poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rumbleColor);
      this.poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rumbleColor);
    }

    // asfalto
    this.poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, road);

    // linee di margine
    const detail = w1 > 2.2;
    if (detail) {
      const edge1 = w1 * 0.035;
      const edge2 = w2 * 0.035;
      this.poly(x1 - w1, y1, x1 - w1 + edge1, y1, x2 - w2 + edge2, y2, x2 - w2, y2, "rgba(243,236,221,0.62)");
      this.poly(x1 + w1, y1, x1 + w1 - edge1, y1, x2 + w2 - edge2, y2, x2 + w2, y2, "rgba(243,236,221,0.62)");
    }

    // corsie tratteggiate
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
    destW = Math.min(destW, this.width * 1.9);
    const destH = Math.min(destW * (asset.img.height / asset.img.width), this.height * 1.6);
    const destX = seg.p1.screen.x + offset * ROAD_WIDTH * spriteScale - destW / 2;
    const destY = seg.p1.screen.y - destH + 2;
    if (destX > this.width || destX + destW < 0) return;
    ctx.globalAlpha = fade;
    if (destY + destH > clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -this.height, this.width, clip + this.height);
      ctx.clip();
      ctx.drawImage(asset.img, destX, destY, destW, destH);
      ctx.restore();
    } else {
      ctx.drawImage(asset.img, destX, destY, destW, destH);
    }
    ctx.globalAlpha = 1;
  }

  private renderCar(car: TrafficCar, seg: Segment, clip: number, fade: number) {
    const ctx = this.ctx;
    const p1 = seg.p1.screen;
    const p2 = seg.p2.screen;
    const rel = car.z - this.position;
    const basePercent = (this.position % SEG_LEN) / SEG_LEN;
    const raw = rel / SEG_LEN + basePercent;
    let t = raw - Math.floor(raw);
    t = clamp(t, 0, 1);
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

    const needsClip = destY + destH > clip;
    if (needsClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -this.height, this.width, clip + this.height);
      ctx.clip();
    }

    // ombra
    ctx.globalAlpha = fade * 0.3;
    ctx.fillStyle = "#141311";
    ctx.beginPath();
    ctx.ellipse(destX + destW / 2, roadY, destW * 0.46, Math.max(1.5, destW * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade;
    // sbandamento sugli avvallamenti
    const bump = Math.sin(this.position / 700 + car.wobble) * destH * 0.008;
    ctx.drawImage(car.sprite.img, destX, destY + bump, destW, destH);
    if (needsClip) ctx.restore();
  }

  private drawPlayerCar() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const img = this.sprites.player.img;
    const destW = Math.min(Math.max(w * 0.24, 162), 320);
    const destH = destW * (img.height / img.width);
    const bottomPad = w < 760 ? 112 : Math.max(6, h * 0.014);
    const targetY = h - destH - bottomPad;
    const bounce = Math.sin(this.position / 240) * (this.speed / MAX_SPEED) * 1.8;
    const jitterX = this.offroad ? (Math.random() - 0.5) * 4 : 0;
    const x = w / 2 + this.steerSmooth * (this.turboActive ? 15 : 11) + jitterX;
    const y = targetY + bounce;
    this.playerScreen = { x, y: y + destH * 0.34, w: destW * 0.6, h: destH };
    const tilt = this.steerSmooth * 0.05;
    const invulnBlink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;

    ctx.save();
    ctx.globalAlpha = invulnBlink ? 0.45 : 1;

    // ombra
    ctx.fillStyle = "rgba(10,12,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + destH * 0.9, destW * 0.52, destH * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    // alone turbo
    if (this.turboActive) {
      const glow = ctx.createRadialGradient(x, y + destH * 0.6, 2, x, y + destH * 0.6, destW * 0.7);
      glow.addColorStop(0, "rgba(255,186,96,0.42)");
      glow.addColorStop(1, "rgba(255,120,50,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - destW, y, destW * 2, destH * 1.2);
    }

    ctx.translate(x, y + destH * 0.55);
    ctx.rotate(tilt);
    ctx.drawImage(this.sprites.player.img, -destW / 2, -destH * 0.55, destW, destH);
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
        grad.addColorStop(0, "rgba(255,238,190,0.95)");
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
      const alpha = p.life > p.maxLife * 0.75 ? (p.maxLife - p.life) / (p.maxLife * 0.25) : clamp(p.life / (p.maxLife * 0.55), 0, 1);
      const scale = 0.72 + Math.min(1, t * 4) * 0.32 + Math.sin(t * Math.PI) * 0.05;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y + index * Math.min(Math.max(this.height * 0.072, 42), 66));
      ctx.scale(scale, scale);
      ctx.rotate(-0.035);
      ctx.font = `900 ${Math.min(Math.max(w * 0.045, 22), 40)}px Anton, Impact, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(11,13,12,0.55)";
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.font = `700 ${Math.min(Math.max(w * 0.023, 12), 17)}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(243,236,221,0.85)";
      ctx.fillText(p.sub.toUpperCase(), 0, Math.min(Math.max(h * 0.033, 18), 28));
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
      turbo: this.turbo,
      distanceKm: Number((this.position / 140000).toFixed(2)),
      boost: this.turboActive,
      offroad: this.offroad,
      elapsed: this.elapsed,
    };
  }
}
