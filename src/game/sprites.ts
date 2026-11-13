/**
 * Tutte le "fotografie" della pista, gli oggetti e l'auto personalizzata sono
 * disegnati su canvas fuori schermo e poi blittati a 60 fps costanti.
 */

import { DEFAULT_CAR_CONFIG, getChassisSpec, getPaintSpec, getRimsSpec } from "./garage";
import type { CarConfig, TrackItemKind } from "./types";

export interface SpriteAsset {
  img: HTMLCanvasElement;
  /** Larghezza nel mondo, dove la strada completa misura 4000 unità. */
  worldWidth: number;
}

export interface SpriteCatalog {
  player: SpriteAsset;
  cars: SpriteAsset[];
  truck: SpriteAsset;
  cypress: SpriteAsset;
  pine: SpriteAsset;
  flag: SpriteAsset;
  bush: SpriteAsset;
  boards: SpriteAsset[];
  grandstand: SpriteAsset;
  finishArch: SpriteAsset;
  items: Record<TrackItemKind, SpriteAsset>;
}

const RES = 2;

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.round(w * RES);
  c.height = Math.round(h * RES);
  const ctx = c.getContext("2d")!;
  ctx.scale(RES, RES);
  return [c, ctx];
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/* ------------------------------------------------------------------ traffico */

function drawTrafficCar(
  body: string,
  dark: string,
  light: string,
  accent: string
): HTMLCanvasElement {
  const [canvas, ctx] = make(240, 176);

  ctx.fillStyle = "rgba(20,17,12,0.28)";
  ctx.beginPath();
  ctx.ellipse(120, 164, 96, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(ctx, 22, 122, 26, 40, "#191b1b");
  rect(ctx, 192, 122, 26, 40, "#191b1b");
  rect(ctx, 22, 122, 26, 8, "#2c3030");

  rr(ctx, 26, 100, 188, 58, 16);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(26, 142, 188, 16);
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(58, 104);
  ctx.lineTo(74, 62);
  ctx.lineTo(166, 62);
  ctx.lineTo(182, 104);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(72, 72);
  ctx.lineTo(80, 98);
  ctx.lineTo(160, 98);
  ctx.lineTo(168, 72);
  ctx.closePath();
  const glass = ctx.createLinearGradient(0, 70, 0, 100);
  glass.addColorStop(0, "#3c5359");
  glass.addColorStop(0.5, "#22343a");
  glass.addColorStop(1, "#162226");
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = "rgba(243,236,221,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const roof = ctx.createLinearGradient(0, 58, 0, 76);
  roof.addColorStop(0, light);
  roof.addColorStop(1, body);
  ctx.fillStyle = roof;
  ctx.fillRect(78, 58, 84, 10);

  ctx.save();
  ctx.shadowColor = "rgba(255,72,48,0.9)";
  ctx.shadowBlur = 12;
  rr(ctx, 34, 112, 42, 18, 4);
  ctx.fillStyle = "#ff5c3d";
  ctx.fill();
  rr(ctx, 164, 112, 42, 18, 4);
  ctx.fillStyle = "#ff5c3d";
  ctx.fill();
  ctx.restore();

  rect(ctx, 104, 100, 32, 28, accent);
  rr(ctx, 94, 132, 52, 20, 3);
  ctx.fillStyle = "#efe6d2";
  ctx.fill();
  ctx.fillStyle = "#23282a";
  ctx.font = "900 12px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("IT", 120, 146);

  rect(ctx, 30, 150, 180, 7, "#242727");
  rect(ctx, 112, 152, 16, 10, "#111414");

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#fff6e2";
  ctx.beginPath();
  ctx.moveTo(66, 100);
  ctx.lineTo(78, 64);
  ctx.lineTo(96, 64);
  ctx.lineTo(84, 100);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  return canvas;
}

function drawTruck(): HTMLCanvasElement {
  const [canvas, ctx] = make(300, 250);
  ctx.fillStyle = "rgba(20,17,12,0.28)";
  ctx.beginPath();
  ctx.ellipse(150, 234, 118, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(ctx, 34, 190, 30, 48, "#191b1b");
  rect(ctx, 236, 190, 30, 48, "#191b1b");

  rr(ctx, 32, 24, 236, 168, 10);
  const box = ctx.createLinearGradient(0, 24, 0, 192);
  box.addColorStop(0, "#e8ddc6");
  box.addColorStop(1, "#cfc0a2");
  ctx.fillStyle = box;
  ctx.fill();

  rect(ctx, 32, 42, 236, 10, "#1f7a52");
  rect(ctx, 32, 52, 236, 10, "#f3ecdd");
  rect(ctx, 32, 62, 236, 10, "#e23e31");
  ctx.fillStyle = "#2a2f2c";
  ctx.font = "900 38px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CORRIERE", 150, 116);
  ctx.font = "700 20px 'DM Sans', Arial, sans-serif";
  ctx.fillText("COSTIERA · ITALIA", 150, 146);

  rect(ctx, 32, 170, 236, 26, "#6f6a5c");
  rect(ctx, 56, 178, 188, 8, "#8d8877");

  ctx.save();
  ctx.shadowColor = "rgba(255,72,48,0.8)";
  ctx.shadowBlur = 10;
  rect(ctx, 46, 156, 34, 14, "#ff5c3d");
  rect(ctx, 220, 156, 34, 14, "#ff5c3d");
  ctx.restore();

  rr(ctx, 132, 192, 52, 20, 3);
  ctx.fillStyle = "#efe6d2";
  ctx.fill();
  ctx.fillStyle = "#23282a";
  ctx.font = "900 12px 'DM Sans', Arial, sans-serif";
  ctx.fillText("IT", 158, 207);
  return canvas;
}

/* ----------------------------------------------------- auto personalizzata */

export function drawPlayerCarCanvas(config: CarConfig = DEFAULT_CAR_CONFIG): HTMLCanvasElement {
  const [canvas, ctx] = make(390, 276);
  const paint = getPaintSpec(config.paint);
  const rims = getRimsSpec(config.rims);
  const chassis = config.chassis;

  const isWide = chassis === "prototipo";
  const isBarchetta = chassis === "barchetta";
  const isRally = chassis === "corazzata";

  const bodyX = isWide ? 14 : isBarchetta ? 30 : 22;
  const bodyW = 390 - bodyX * 2;
  const bodyY = isWide ? 124 : isRally ? 112 : 118;
  const bodyH = isWide ? 98 : isRally ? 108 : 104;

  // Pneumatici posteriori + dettagli cerchi
  const tireW = isWide ? 64 : isRally ? 62 : 56;
  const leftTireX = bodyX - 10;
  const rightTireX = 390 - bodyX + 10 - tireW;

  ctx.fillStyle = "#141717";
  rr(ctx, leftTireX, 172, tireW, 70, 12);
  ctx.fill();
  rr(ctx, rightTireX, 172, tireW, 70, 12);
  ctx.fill();

  // Battistrada e riflesso cerchio laterale
  ctx.fillStyle = "#2b3031";
  ctx.fillRect(leftTireX + 8, 186, tireW - 16, 9);
  ctx.fillRect(rightTireX + 8, 186, tireW - 16, 9);
  ctx.fillRect(leftTireX + 10, 218, tireW - 20, 8);
  ctx.fillRect(rightTireX + 10, 218, tireW - 20, 8);

  // Profilo cerchione visibile sul bordo esterno
  ctx.fillStyle = rims.rim;
  rr(ctx, leftTireX + 3, 194, 8, 30, 3);
  ctx.fill();
  rr(ctx, rightTireX + tireW - 11, 194, 8, 30, 3);
  ctx.fill();
  ctx.fillStyle = rims.spoke;
  ctx.fillRect(leftTireX + 5, 205, 4, 8);
  ctx.fillRect(rightTireX + tireW - 9, 205, 4, 8);

  // Paraspruzzi rally
  if (isRally) {
    rect(ctx, leftTireX + 4, 232, tireW - 8, 10, "#d2382b");
    rect(ctx, rightTireX + 4, 232, tireW - 8, 10, "#d2382b");
  }

  // Carrozzeria principale
  const bodyGrad = ctx.createLinearGradient(0, bodyY - 14, 0, bodyY + bodyH + 14);
  bodyGrad.addColorStop(0, paint.top);
  bodyGrad.addColorStop(0.45, paint.mid);
  bodyGrad.addColorStop(1, paint.deep);
  rr(ctx, bodyX, bodyY, bodyW, bodyH, isWide ? 20 : 26);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Passaruota scolpiti
  ctx.strokeStyle = "rgba(18,16,15,0.45)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(leftTireX + tireW * 0.72, 192, 42, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rightTireX + tireW * 0.28, 192, 42, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  // Abitacolo / Tetto in base al telaio
  if (isBarchetta) {
    // Barchetta scoperta con roll-bar e casco pilota!
    ctx.beginPath();
    ctx.moveTo(82, bodyY + 6);
    ctx.lineTo(104, 88);
    ctx.lineTo(286, 88);
    ctx.lineTo(308, bodyY + 6);
    ctx.closePath();
    ctx.fillStyle = paint.cabin;
    ctx.fill();

    // Pozzetto abitacolo scuro
    rr(ctx, 106, 86, 178, 28, 10);
    ctx.fillStyle = "#161a1b";
    ctx.fill();

    // Roll-bar cromato dietro il pilota
    ctx.strokeStyle = rims.rim;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(146, 88, 20, Math.PI, 0);
    ctx.stroke();

    // Casco pilota vintage bianco/tricolore
    ctx.beginPath();
    ctx.arc(146, 82, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#f6efdf";
    ctx.fill();
    rect(ctx, 141, 70, 3.5, 16, "#1f7a52");
    rect(ctx, 147.5, 70, 3.5, 16, "#e23e31");

    // Parabrezza basso fumé
    ctx.beginPath();
    ctx.moveTo(98, 90);
    ctx.lineTo(110, 74);
    ctx.lineTo(280, 74);
    ctx.lineTo(292, 90);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,165,180,0.42)";
    ctx.fill();
  } else {
    const roofTop = isWide ? 52 : isRally ? 40 : 44;
    const roofLeft = isWide ? 84 : 94;
    const roofRight = 390 - roofLeft;
    ctx.beginPath();
    ctx.moveTo(bodyX + 42, bodyY + 6);
    ctx.lineTo(roofLeft, roofTop + 10);
    ctx.quadraticCurveTo(roofLeft + 6, roofTop, roofLeft + 22, roofTop);
    ctx.lineTo(roofRight - 22, roofTop);
    ctx.quadraticCurveTo(roofRight - 6, roofTop, roofRight, roofTop + 10);
    ctx.lineTo(390 - bodyX - 42, bodyY + 6);
    ctx.closePath();
    ctx.fillStyle = paint.cabin;
    ctx.fill();

    // Lunotto posteriore
    ctx.beginPath();
    ctx.moveTo(roofLeft + 10, roofTop + 20);
    ctx.lineTo(roofLeft + 22, bodyY - 8);
    ctx.lineTo(roofRight - 22, bodyY - 8);
    ctx.lineTo(roofRight - 10, roofTop + 20);
    ctx.closePath();
    const glass = ctx.createLinearGradient(0, roofTop + 18, 0, bodyY - 6);
    glass.addColorStop(0, "#5b7076");
    glass.addColorStop(0.45, "#283c42");
    glass.addColorStop(1, "#152327");
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,241,214,0.34)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Feritoie motore per Prototipo V12
    if (isWide) {
      ctx.fillStyle = "rgba(15,18,18,0.55)";
      for (let i = 0; i < 4; i++) {
        rr(ctx, 146, roofTop + 26 + i * 11, 98, 5, 2);
        ctx.fill();
      }
    }

    // Riflesso cristallo
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffe7bd";
    ctx.beginPath();
    ctx.moveTo(roofLeft + 22, roofTop + 22);
    ctx.lineTo(roofLeft + 30, bodyY - 10);
    ctx.lineTo(roofLeft + 60, bodyY - 10);
    ctx.lineTo(roofLeft + 48, roofTop + 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Fari supplementari sul tetto per Stradale Rally
    if (isRally) {
      rr(ctx, 142, roofTop - 9, 106, 10, 4);
      ctx.fillStyle = "#1c2021";
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(156 + i * 26, roofTop - 4, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe29a";
        ctx.fill();
      }
    }
  }

  // Livrea / Strisce da gara
  const stripeTop = isBarchetta ? 88 : isWide ? 54 : 46;
  const stripeH = 236 - stripeTop;
  if (config.stripe === "tricolore") {
    rect(ctx, 186, stripeTop, 18, stripeH, "#f3ecdd");
    rect(ctx, 178, stripeTop, 8, stripeH, "#1f7a52");
    rect(ctx, 204, stripeTop, 8, stripeH, "#e23e31");
  } else if (config.stripe === "oro_doppio") {
    rect(ctx, 177, stripeTop, 13, stripeH, "#e9b45c");
    rect(ctx, 200, stripeTop, 13, stripeH, "#e9b45c");
  } else if (config.stripe === "crema") {
    rect(ctx, 175, stripeTop, 40, stripeH, "#f3ecdd");
    rect(ctx, 193, stripeTop, 4, stripeH, paint.mid);
  } else if (config.stripe === "nero_corse") {
    rect(ctx, 174, stripeTop, 16, stripeH, "#141718");
    rect(ctx, 200, stripeTop, 16, stripeH, "#141718");
  }

  // Alettone posteriore
  if (config.spoiler === "gt") {
    rr(ctx, bodyX + 18, bodyY - 8, bodyW - 36, 13, 5);
    ctx.fillStyle = "#1c2021";
    ctx.fill();
    rect(ctx, bodyX + 34, bodyY - 5, bodyW - 68, 4, "#3b4244");
  } else if (config.spoiler === "corsa_alta") {
    // Montanti + ala alta in carbonio con profili tricolore
    rect(ctx, 108, 48, 10, bodyY - 44, "#151819");
    rect(ctx, 272, 48, 10, bodyY - 44, "#151819");
    rr(ctx, 36, 36, 318, 17, 5);
    ctx.fillStyle = "#181c1d";
    ctx.fill();
    rect(ctx, 56, 41, 278, 5, "#363d3f");
    // Paratie laterali (endplates)
    rr(ctx, 32, 30, 14, 30, 3);
    ctx.fillStyle = "#1f7a52";
    ctx.fill();
    rr(ctx, 344, 30, 14, 30, 3);
    ctx.fillStyle = "#e23e31";
    ctx.fill();
  }

  // Bollo portanumero
  ctx.beginPath();
  ctx.arc(195, 168, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#f6efdf";
  ctx.fill();
  ctx.strokeStyle = "#1b1f1f";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#1b1f1f";
  ctx.font = "900 30px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((config.number || "27").slice(0, 2), 195, 170);
  ctx.textBaseline = "alphabetic";

  // Fari posteriori
  ctx.save();
  ctx.shadowColor = "rgba(255,82,48,0.95)";
  ctx.shadowBlur = 22;
  if (isWide) {
    // Doppio faro circolare stile Ferrari/Prototipo italiano!
    [bodyX + 30, bodyX + 64, 390 - bodyX - 64, 390 - bodyX - 30].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, 154, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5938";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, 154, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe0b5";
      ctx.fill();
    });
  } else {
    rr(ctx, bodyX + 12, 140, 68, 25, 6);
    ctx.fillStyle = "#ff6242";
    ctx.fill();
    rr(ctx, 390 - bodyX - 80, 140, 68, 25, 6);
    ctx.fillStyle = "#ff6242";
    ctx.fill();
    ctx.fillStyle = "#ffd9b0";
    rr(ctx, bodyX + 24, 147, 20, 11, 3);
    ctx.fill();
    rr(ctx, 390 - bodyX - 44, 147, 20, 11, 3);
    ctx.fill();
  }
  ctx.restore();

  // Paraurti inferiore, targa e scarichi
  rr(ctx, bodyX + 8, 208, bodyW - 16, 22, 8);
  ctx.fillStyle = "#1d2122";
  ctx.fill();

  // Targa italiana personalizzata
  rr(ctx, 158, 205, 74, 20, 3);
  ctx.fillStyle = "#16191a";
  ctx.fill();
  ctx.strokeStyle = "rgba(243,236,221,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#f3ecdd";
  ctx.font = "800 11px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((config.plate || "BO 27").slice(0, 7), 195, 219);

  // Terminali di scarico cromati/oro
  const tipRing = rims.rim;
  [108, 134, 256, 282].forEach((ex) => {
    ctx.beginPath();
    ctx.arc(ex, 220, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = tipRing;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, 220, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0d0d";
    ctx.fill();
  });

  // Riflesso caldo sugli spigoli
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "#ffe2b4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bodyX + 10, bodyY + 12);
  ctx.lineTo(bodyX + 42, bodyY + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(390 - bodyX - 10, bodyY + 12);
  ctx.lineTo(390 - bodyX - 42, bodyY + 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Diffusore sportivo
  rect(ctx, bodyX + 36, 230, bodyW - 72, 8, "#121515");
  return canvas;
}

export function buildPlayerSprite(config: CarConfig): SpriteAsset {
  const spec = getChassisSpec(config.chassis);
  return {
    img: drawPlayerCarCanvas(config),
    worldWidth: Math.round(900 * spec.widthScale),
  };
}

/* --------------------------------------------------------- oggetti in pista */

function drawCoinItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(150, 150);
  // bagliore
  const glow = ctx.createRadialGradient(75, 76, 8, 75, 76, 68);
  glow.addColorStop(0, "rgba(255,222,120,0.65)");
  glow.addColorStop(1, "rgba(255,190,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 150, 150);

  // medaglione d'oro
  ctx.beginPath();
  ctx.arc(75, 74, 44, 0, Math.PI * 2);
  const grad = ctx.createLinearGradient(35, 30, 115, 118);
  grad.addColorStop(0, "#fff0a6");
  grad.addColorStop(0.5, "#e9b45c");
  grad.addColorStop(1, "#a67019");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#fff4c2";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(75, 74, 32, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(110,68,10,0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#5c3906";
  ctx.font = "900 34px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", 75, 76);
  return canvas;
}

function drawNitroItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(170, 190);
  const glow = ctx.createRadialGradient(85, 100, 10, 85, 100, 78);
  glow.addColorStop(0, "rgba(255,160,64,0.65)");
  glow.addColorStop(1, "rgba(255,110,30,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 170, 190);

  // valvola superiore
  rr(ctx, 68, 22, 34, 18, 5);
  ctx.fillStyle = "#d5dad8";
  ctx.fill();
  rect(ctx, 78, 36, 14, 14, "#8a9190");

  // bombola
  rr(ctx, 46, 48, 78, 116, 26);
  const body = ctx.createLinearGradient(46, 48, 124, 164);
  body.addColorStop(0, "#ff9d3b");
  body.addColorStop(0.5, "#e24a2b");
  body.addColorStop(1, "#8f1d10");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffe3a8";
  ctx.stroke();

  // fascia gialla
  rect(ctx, 48, 86, 74, 38, "#f6efdf");
  // saetta
  ctx.fillStyle = "#d2382b";
  ctx.beginPath();
  ctx.moveTo(90, 68);
  ctx.lineTo(68, 106);
  ctx.lineTo(84, 106);
  ctx.lineTo(78, 142);
  ctx.lineTo(104, 98);
  ctx.lineTo(87, 98);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

function drawShieldItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(180, 180);
  const glow = ctx.createRadialGradient(90, 90, 12, 90, 90, 82);
  glow.addColorStop(0, "rgba(72,232,190,0.65)");
  glow.addColorStop(1, "rgba(32,160,130,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 180, 180);

  ctx.beginPath();
  ctx.moveTo(90, 26);
  ctx.lineTo(142, 46);
  ctx.lineTo(134, 104);
  ctx.quadraticCurveTo(122, 142, 90, 158);
  ctx.quadraticCurveTo(58, 142, 46, 104);
  ctx.lineTo(38, 46);
  ctx.closePath();

  const grad = ctx.createLinearGradient(40, 26, 140, 158);
  grad.addColorStop(0, "#7bf5d4");
  grad.addColorStop(0.5, "#1ca682");
  grad.addColorStop(1, "#0f5947");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#e8fff8";
  ctx.stroke();

  // croce bianca interna
  rect(ctx, 83, 52, 14, 72, "#f3ecdd");
  rect(ctx, 58, 79, 64, 14, "#f3ecdd");
  return canvas;
}

function drawMagnetItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(180, 180);
  const glow = ctx.createRadialGradient(90, 90, 12, 90, 90, 80);
  glow.addColorStop(0, "rgba(255,112,96,0.58)");
  glow.addColorStop(1, "rgba(233,180,92,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 180, 180);

  ctx.lineWidth = 26;
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#e23e31";
  ctx.beginPath();
  ctx.arc(90, 98, 42, Math.PI, 0, false);
  ctx.stroke();

  rect(ctx, 35, 96, 26, 42, "#e23e31");
  rect(ctx, 119, 96, 26, 42, "#e23e31");
  rect(ctx, 35, 124, 26, 18, "#f3ecdd");
  rect(ctx, 119, 124, 26, 18, "#f3ecdd");

  // scintille magnetiche oro
  ctx.strokeStyle = "#ffe082";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(72, 134);
  ctx.lineTo(84, 146);
  ctx.lineTo(96, 132);
  ctx.lineTo(108, 146);
  ctx.stroke();
  return canvas;
}

function drawRepairItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(180, 170);
  const glow = ctx.createRadialGradient(90, 92, 12, 90, 92, 78);
  glow.addColorStop(0, "rgba(64,214,132,0.58)");
  glow.addColorStop(1, "rgba(31,122,82,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 180, 170);

  // maniglia cassetta
  ctx.strokeStyle = "#d8d2c3";
  ctx.lineWidth = 7;
  rr(ctx, 66, 30, 48, 24, 6);
  ctx.stroke();

  // cassetta officina
  rr(ctx, 32, 48, 116, 92, 14);
  ctx.fillStyle = "#1f7a52";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#f3ecdd";
  ctx.stroke();

  // bollo bianco + croce verde/rossa
  ctx.beginPath();
  ctx.arc(90, 94, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#f6efdf";
  ctx.fill();
  rect(ctx, 83, 74, 14, 40, "#e23e31");
  rect(ctx, 70, 87, 40, 14, "#e23e31");
  return canvas;
}

function drawMysteryItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(190, 190);
  const glow = ctx.createRadialGradient(95, 95, 14, 95, 95, 88);
  glow.addColorStop(0, "rgba(196,138,255,0.72)");
  glow.addColorStop(0.55, "rgba(233,180,92,0.35)");
  glow.addColorStop(1, "rgba(233,180,92,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 190, 190);

  ctx.save();
  ctx.translate(95, 95);
  ctx.rotate(Math.PI / 16);
  rr(ctx, -50, -50, 100, 100, 18);
  const grad = ctx.createLinearGradient(-50, -50, 50, 50);
  grad.addColorStop(0, "#f5c563");
  grad.addColorStop(0.5, "#d94f3d");
  grad.addColorStop(1, "#6b38b8");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#fff4d6";
  ctx.stroke();

  // fascia tricolore angolare
  rect(ctx, -46, -42, 30, 8, "#1f7a52");
  rect(ctx, -16, -42, 32, 8, "#f3ecdd");
  rect(ctx, 16, -42, 30, 8, "#e23e31");

  ctx.fillStyle = "#fff8e8";
  ctx.font = "900 56px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, 8);
  ctx.restore();
  return canvas;
}

function drawOilItem(): HTMLCanvasElement {
  const [canvas, ctx] = make(260, 120);
  // chiazza d'olio sull'asfalto
  ctx.fillStyle = "#0e1012";
  ctx.beginPath();
  ctx.ellipse(126, 86, 108, 24, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(82, 92, 56, 16, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(178, 88, 52, 15, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // riflesso iridescente benzina
  const sheen = ctx.createLinearGradient(45, 72, 205, 98);
  sheen.addColorStop(0, "rgba(74,190,220,0.45)");
  sheen.addColorStop(0.5, "rgba(186,110,230,0.42)");
  sheen.addColorStop(1, "rgba(233,180,92,0.42)");
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(128, 84, 78, 12, -0.04, 0, Math.PI * 2);
  ctx.fill();

  // birillo stradale arancio/bianco di avviso
  rr(ctx, 182, 74, 48, 11, 3);
  ctx.fillStyle = "#d95626";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(206, 20);
  ctx.lineTo(222, 76);
  ctx.lineTo(190, 76);
  ctx.closePath();
  ctx.fillStyle = "#ff6d33";
  ctx.fill();
  ctx.fillStyle = "#f6efdf";
  ctx.beginPath();
  ctx.moveTo(199, 44);
  ctx.lineTo(213, 44);
  ctx.lineTo(216, 56);
  ctx.lineTo(196, 56);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/* -------------------------------------------------------------- scenario */

function drawCypress(): HTMLCanvasElement {
  const [canvas, ctx] = make(150, 430);
  ctx.fillStyle = "#4a3a28";
  rr(ctx, 66, 300, 18, 118, 5);
  ctx.fill();
  const layers = [
    { y: 30, w: 46, h: 130, c: "#1c3f30" },
    { y: 96, w: 68, h: 130, c: "#204a38" },
    { y: 168, w: 88, h: 132, c: "#245541" },
    { y: 246, w: 108, h: 120, c: "#1f4a39" },
  ];
  layers.forEach((l) => {
    ctx.beginPath();
    ctx.moveTo(75, l.y);
    ctx.quadraticCurveTo(75 + l.w, l.y + l.h * 0.45, 75, l.y + l.h);
    ctx.quadraticCurveTo(75 - l.w, l.y + l.h * 0.45, 75, l.y);
    ctx.fillStyle = l.c;
    ctx.fill();
  });
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#c9d49a";
  ctx.beginPath();
  ctx.moveTo(80, 110);
  ctx.quadraticCurveTo(128, 210, 96, 330);
  ctx.lineTo(84, 330);
  ctx.quadraticCurveTo(100, 210, 78, 110);
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas;
}

function drawPine(): HTMLCanvasElement {
  const [canvas, ctx] = make(360, 320);
  ctx.fillStyle = "#5a4630";
  ctx.beginPath();
  ctx.moveTo(168, 320);
  ctx.quadraticCurveTo(176, 200, 150, 130);
  ctx.lineTo(176, 126);
  ctx.quadraticCurveTo(208, 210, 196, 320);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#43341f";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(172, 190);
  ctx.lineTo(232, 128);
  ctx.stroke();
  const canopy = ctx.createLinearGradient(0, 40, 0, 160);
  canopy.addColorStop(0, "#3d6845");
  canopy.addColorStop(1, "#22422f");
  ctx.fillStyle = canopy;
  [
    [180, 100, 158, 54],
    [120, 118, 92, 42],
    [248, 118, 92, 42],
    [180, 74, 104, 40],
  ].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#d7dba4";
  ctx.beginPath();
  ctx.ellipse(214, 78, 78, 20, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas;
}

function drawFlag(): HTMLCanvasElement {
  const [canvas, ctx] = make(200, 380);
  rect(ctx, 92, 40, 9, 332, "#8b8f88");
  ctx.beginPath();
  ctx.arc(96, 34, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#c8c2ae";
  ctx.fill();
  const bands: [string, number][] = [
    ["#1f7a52", 0],
    ["#f3ecdd", 1],
    ["#e23e31", 2],
  ];
  bands.forEach(([color, i]) => {
    ctx.beginPath();
    const x0 = 100 + i * 32;
    ctx.moveTo(x0, 46);
    ctx.quadraticCurveTo(x0 + 24, 66, x0 + 18, 122);
    ctx.lineTo(x0 + 18 + 32, 118);
    ctx.quadraticCurveTo(x0 + 40, 62, x0 + 32, 44);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(11,13,12,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, 46);
  ctx.quadraticCurveTo(130, 70, 128, 122);
  ctx.stroke();
  return canvas;
}

function drawBush(): HTMLCanvasElement {
  const [canvas, ctx] = make(220, 140);
  ctx.fillStyle = "rgba(20,25,18,0.18)";
  ctx.beginPath();
  ctx.ellipse(110, 128, 92, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const blobs: [number, number, number, string][] = [
    [74, 92, 42, "#3a5533"],
    [116, 78, 52, "#456339"],
    [160, 96, 36, "#334d2d"],
    [104, 106, 42, "#2c4527"],
  ];
  blobs.forEach(([x, y, r, c]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#d8ddaa";
  ctx.beginPath();
  ctx.arc(126, 62, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas;
}

function drawBoard(
  title: string,
  subtitle: string,
  tone: "cream" | "red" | "green"
): HTMLCanvasElement {
  const [canvas, ctx] = make(340, 270);
  const bg = tone === "cream" ? "#f1e8d6" : tone === "red" ? "#d2382b" : "#1d6a4a";
  const ink = tone === "cream" ? "#20241f" : "#f3ecdd";
  rect(ctx, 84, 170, 12, 100, "#6d6656");
  rect(ctx, 244, 170, 12, 100, "#6d6656");
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  rr(ctx, 16, 14, 308, 168, 8);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = tone === "cream" ? "#b9ac92" : "rgba(255,255,255,0.22)";
  ctx.lineWidth = 5;
  ctx.stroke();
  rect(ctx, 16, 14, 308, 12, "#1f7a52");
  rect(ctx, 118, 14, 104, 12, "#f3ecdd");
  rect(ctx, 222, 14, 102, 12, "#e23e31");
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = "900 48px 'Arial Narrow', 'DM Sans', Arial, sans-serif";
  ctx.fillText(title, 170, 110);
  ctx.font = "700 18px 'DM Sans', Arial, sans-serif";
  ctx.globalAlpha = 0.72;
  ctx.fillText(subtitle, 170, 144);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  [
    [30, 30],
    [310, 30],
    [30, 166],
    [310, 166],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}

function drawGrandstand(): HTMLCanvasElement {
  const [canvas, ctx] = make(620, 340);
  rr(ctx, 10, 210, 600, 118, 6);
  ctx.fillStyle = "#c9b99e";
  ctx.fill();
  rect(ctx, 10, 300, 600, 28, "#a3957e");
  for (let row = 0; row < 5; row++) {
    const y = 118 + row * 22;
    rect(ctx, 40 + row * 6, y, 540 - row * 12, 20, row % 2 ? "#8e8270" : "#9d8f7a");
    for (let i = 0; i < 30; i++) {
      const colors = ["#e0d6c1", "#c94c37", "#2f6b53", "#d8b25f", "#4a5f78", "#f0e7d4"];
      ctx.fillStyle = colors[(i * 7 + row * 3) % colors.length];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(58 + i * 18 + (row % 2) * 5, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(6, 108);
  ctx.lineTo(58, 44);
  ctx.lineTo(564, 44);
  ctx.lineTo(614, 108);
  ctx.closePath();
  const roof = ctx.createLinearGradient(0, 44, 0, 108);
  roof.addColorStop(0, "#ece2cd");
  roof.addColorStop(1, "#d3c5ab");
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.strokeStyle = "#a99a80";
  ctx.lineWidth = 4;
  ctx.stroke();
  rect(ctx, 240, 60, 46, 12, "#1f7a52");
  rect(ctx, 286, 60, 46, 12, "#f3ecdd");
  rect(ctx, 332, 60, 46, 12, "#e23e31");
  ctx.fillStyle = "#354037";
  ctx.font = "900 25px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("COPPA COSTIERA", 310, 96);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 3 === 0 ? "#1f7a52" : i % 3 === 1 ? "#f3ecdd" : "#e23e31";
    ctx.beginPath();
    ctx.moveTo(70 + i * 92, 44);
    ctx.lineTo(112 + i * 92, 44);
    ctx.lineTo(92 + i * 92, 72);
    ctx.closePath();
    ctx.fill();
  }
  return canvas;
}

function drawFinishArch(): HTMLCanvasElement {
  const [canvas, ctx] = make(780, 380);
  // Piloni laterali
  rect(ctx, 26, 70, 34, 310, "#ece2cd");
  rect(ctx, 720, 70, 34, 310, "#ece2cd");
  rect(ctx, 26, 120, 34, 18, "#1f7a52");
  rect(ctx, 26, 138, 34, 18, "#e23e31");
  rect(ctx, 720, 120, 34, 18, "#1f7a52");
  rect(ctx, 720, 138, 34, 18, "#e23e31");

  // Striscione superiore
  rr(ctx, 18, 22, 744, 86, 10);
  ctx.fillStyle = "#171c1b";
  ctx.fill();
  ctx.strokeStyle = "#e9b45c";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Tricolore alto
  rect(ctx, 22, 24, 246, 10, "#1f7a52");
  rect(ctx, 268, 24, 244, 10, "#f3ecdd");
  rect(ctx, 512, 24, 246, 10, "#e23e31");

  // Scacchiera inferiore striscione
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#f3ecdd" : "#171c1b";
    ctx.fillRect(30 + i * 30, 92, 30, 12);
  }

  ctx.fillStyle = "#f3ecdd";
  ctx.font = "900 42px 'Arial Narrow', 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MILLE CURVE · TRAGUARDO", 390, 76);
  return canvas;
}

export function buildSprites(carConfig: CarConfig = DEFAULT_CAR_CONFIG): SpriteCatalog {
  const carDefs: [string, string, string, string][] = [
    ["#efe3ca", "#efe3ca", "#fff6e2", "#b8342a"],
    ["#2d6a50", "#2d6a50", "#8fae9b", "#d8b25f"],
    ["#2f4a63", "#2f4a63", "#93a8b9", "#e0d6c1"],
    ["#c93b2c", "#c93b2c", "#f09a86", "#f3ecdd"],
    ["#d8b25f", "#d8b25f", "#f1dfb4", "#2d6a50"],
    ["#d9dcd6", "#d9dcd6", "#ffffff", "#2f4a63"],
  ];
  return {
    player: buildPlayerSprite(carConfig),
    cars: carDefs.map(([body, dark, light, accent]) => ({
      img: drawTrafficCar(body, dark, light, accent),
      worldWidth: 490,
    })),
    truck: { img: drawTruck(), worldWidth: 720 },
    cypress: { img: drawCypress(), worldWidth: 520 },
    pine: { img: drawPine(), worldWidth: 900 },
    flag: { img: drawFlag(), worldWidth: 300 },
    bush: { img: drawBush(), worldWidth: 380 },
    boards: [
      { img: drawBoard("MILLE CURVE", "COPPA COSTIERA", "cream"), worldWidth: 900 },
      { img: drawBoard("MARE", "2 KM · LIDO", "green"), worldWidth: 900 },
      { img: drawBoard("OFFICINA", "ASSETTO CORSE", "red"), worldWidth: 900 },
      { img: drawBoard("SCUDERIA", "ITALIA · 1924", "cream"), worldWidth: 900 },
    ],
    grandstand: { img: drawGrandstand(), worldWidth: 2100 },
    finishArch: { img: drawFinishArch(), worldWidth: 4400 },
    items: {
      coin: { img: drawCoinItem(), worldWidth: 250 },
      nitro: { img: drawNitroItem(), worldWidth: 300 },
      shield: { img: drawShieldItem(), worldWidth: 320 },
      magnet: { img: drawMagnetItem(), worldWidth: 310 },
      repair: { img: drawRepairItem(), worldWidth: 320 },
      mystery: { img: drawMysteryItem(), worldWidth: 340 },
      oil: { img: drawOilItem(), worldWidth: 450 },
    },
  };
}
