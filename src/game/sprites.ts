/**
 * Tutte le "fotografie" della pista sono disegnate una sola volta su canvas
 * fuori schermo e poi blittate: nessun asset esterno, nessun calo di fps.
 */

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

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/* ------------------------------------------------------------------ auto */

function drawTrafficCar(
  body: string,
  dark: string,
  light: string,
  accent: string
): HTMLCanvasElement {
  const [canvas, ctx] = make(240, 176);

  // ombra a terra
  ctx.fillStyle = "rgba(20,17,12,0.28)";
  ctx.beginPath();
  ctx.ellipse(120, 164, 96, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // ruote
  rect(ctx, 22, 122, 26, 40, "#191b1b");
  rect(ctx, 192, 122, 26, 40, "#191b1b");
  rect(ctx, 22, 122, 26, 8, "#2c3030");

  // carrozzeria inferiore
  rr(ctx, 26, 100, 188, 58, 16);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(26, 142, 188, 16);
  ctx.globalAlpha = 1;

  // abitacolo
  ctx.beginPath();
  ctx.moveTo(58, 104);
  ctx.lineTo(74, 62);
  ctx.lineTo(166, 62);
  ctx.lineTo(182, 104);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  // lunotto
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

  // tetto e bagliore
  const roof = ctx.createLinearGradient(0, 58, 0, 76);
  roof.addColorStop(0, light);
  roof.addColorStop(1, body);
  ctx.fillStyle = roof;
  ctx.fillRect(78, 58, 84, 10);

  // luci posteriori
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

  // striscia + targa
  rect(ctx, 104, 100, 32, 28, accent);
  rr(ctx, 94, 132, 52, 20, 3);
  ctx.fillStyle = "#efe6d2";
  ctx.fill();
  ctx.fillStyle = "#23282a";
  ctx.font = "900 12px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("IT", 120, 146);

  // paraurti
  rect(ctx, 30, 150, 180, 7, "#242727");
  rect(ctx, 112, 152, 16, 10, "#111414");

  // riflesso crema sul tetto
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

  // ruote
  rect(ctx, 34, 190, 30, 48, "#191b1b");
  rect(ctx, 236, 190, 30, 48, "#191b1b");

  // cassone
  rr(ctx, 32, 24, 236, 168, 10);
  const box = ctx.createLinearGradient(0, 24, 0, 192);
  box.addColorStop(0, "#e8ddc6");
  box.addColorStop(1, "#cfc0a2");
  ctx.fillStyle = box;
  ctx.fill();
  // tricolore laterale
  rect(ctx, 32, 42, 236, 10, "#1f7a52");
  rect(ctx, 32, 52, 236, 10, "#f3ecdd");
  rect(ctx, 32, 62, 236, 10, "#e23e31");
  ctx.fillStyle = "#2a2f2c";
  ctx.font = "900 40px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TRASPORTI", 150, 118);
  ctx.font = "700 22px 'DM Sans', Arial, sans-serif";
  ctx.fillText("MERCI · ITALIA", 150, 148);

  // portellone inferiore
  rect(ctx, 32, 170, 236, 26, "#6f6a5c");
  rect(ctx, 56, 178, 188, 8, "#8d8877");
  // luci
  ctx.save();
  ctx.shadowColor = "rgba(255,72,48,0.8)";
  ctx.shadowBlur = 10;
  rect(ctx, 46, 156, 34, 14, "#ff5c3d");
  rect(ctx, 220, 156, 34, 14, "#ff5c3d");
  ctx.restore();
  // targa
  rr(ctx, 132, 192, 52, 20, 3);
  ctx.fillStyle = "#efe6d2";
  ctx.fill();
  ctx.fillStyle = "#23282a";
  ctx.font = "900 12px 'DM Sans', Arial, sans-serif";
  ctx.fillText("IT", 158, 207);
  return canvas;
}

function drawPlayer(): HTMLCanvasElement {
  const [canvas, ctx] = make(380, 268);

  // ruote larghe
  ctx.fillStyle = "#151818";
  rr(ctx, 12, 172, 58, 68, 12);
  ctx.fill();
  rr(ctx, 310, 172, 58, 68, 12);
  ctx.fill();
  ctx.fillStyle = "#34393a";
  ctx.fillRect(20, 194, 42, 10);
  ctx.fillRect(318, 194, 42, 10);
  ctx.fillStyle = "#0c0e0e";
  ctx.fillRect(24, 218, 34, 8);
  ctx.fillRect(322, 218, 34, 8);

  // carrozzeria
  const bodyGrad = ctx.createLinearGradient(0, 96, 0, 236);
  bodyGrad.addColorStop(0, "#f0523c");
  bodyGrad.addColorStop(0.42, "#df3b2c");
  bodyGrad.addColorStop(1, "#a92218");
  rr(ctx, 22, 116, 336, 104, 26);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // passaruota
  ctx.strokeStyle = "rgba(60,16,12,0.5)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(56, 188, 42, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(324, 188, 42, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  // abitacolo
  ctx.beginPath();
  ctx.moveTo(64, 122);
  ctx.lineTo(88, 52);
  ctx.quadraticCurveTo(94, 40, 112, 40);
  ctx.lineTo(268, 40);
  ctx.quadraticCurveTo(286, 40, 292, 52);
  ctx.lineTo(316, 122);
  ctx.closePath();
  ctx.fillStyle = "#c92f22";
  ctx.fill();

  // lunotto
  ctx.beginPath();
  ctx.moveTo(98, 62);
  ctx.lineTo(110, 108);
  ctx.lineTo(270, 108);
  ctx.lineTo(282, 62);
  ctx.closePath();
  const glass = ctx.createLinearGradient(0, 62, 0, 112);
  glass.addColorStop(0, "#5b7076");
  glass.addColorStop(0.42, "#2b3f45");
  glass.addColorStop(1, "#17262a");
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,241,214,0.35)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // riflesso finestrino
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffe7bd";
  ctx.beginPath();
  ctx.moveTo(112, 64);
  ctx.lineTo(120, 104);
  ctx.lineTo(152, 104);
  ctx.lineTo(140, 64);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // alettone posteriore
  rr(ctx, 48, 44, 284, 15, 5);
  ctx.fillStyle = "#1b1f1f";
  ctx.fill();
  rect(ctx, 48, 42, 22, 26, "#111414");
  rect(ctx, 310, 42, 22, 26, "#111414");
  rect(ctx, 74, 50, 232, 5, "#3a4040");

  // striscia tricolore + numero
  rect(ctx, 182, 44, 18, 190, "#f3ecdd");
  rect(ctx, 174, 44, 7, 190, "#1f7a52");
  rect(ctx, 201, 44, 7, 190, "#e23e31");

  // targa / numero
  ctx.beginPath();
  ctx.arc(191, 172, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#f6efdf";
  ctx.fill();
  ctx.strokeStyle = "#1b1f1f";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#1b1f1f";
  ctx.font = "900 32px 'DM Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("27", 191, 174);

  // fari posteriori
  ctx.save();
  ctx.shadowColor = "rgba(255,82,48,0.95)";
  ctx.shadowBlur = 22;
  rr(ctx, 34, 140, 68, 26, 6);
  ctx.fillStyle = "#ff6242";
  ctx.fill();
  rr(ctx, 278, 140, 68, 26, 6);
  ctx.fillStyle = "#ff6242";
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffd9b0";
  rr(ctx, 46, 147, 20, 12, 3);
  ctx.fill();
  rr(ctx, 314, 147, 20, 12, 3);
  ctx.fill();

  // paraurti e scarichi
  rr(ctx, 30, 206, 320, 22, 8);
  ctx.fillStyle = "#202424";
  ctx.fill();
  rect(ctx, 116, 212, 26, 14, "#0e1010");
  rect(ctx, 156, 212, 26, 14, "#0e1010");
  rect(ctx, 216, 212, 26, 14, "#0e1010");
  rect(ctx, 256, 212, 26, 14, "#0e1010");

  // bagliore crema sui bordi
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#ffd9a4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 128);
  ctx.lineTo(60, 122);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(350, 128);
  ctx.lineTo(320, 122);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // diffusore
  rect(ctx, 60, 228, 260, 8, "#141717");
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
  // luce del tramonto sul lato destro
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
  ctx.fillStyle = "#8b8f88";
  rect(ctx, 92, 40, 9, 332, "#8b8f88");
  ctx.beginPath();
  ctx.arc(96, 34, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#c8c2ae";
  ctx.fill();
  // bandiera tricolore ondulata
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
  // pali
  rect(ctx, 84, 170, 12, 100, "#6d6656");
  rect(ctx, 244, 170, 12, 100, "#6d6656");
  // pannello
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  rr(ctx, 16, 14, 308, 168, 8);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();
  // intelaiatura
  ctx.strokeStyle = tone === "cream" ? "#b9ac92" : "rgba(255,255,255,0.22)";
  ctx.lineWidth = 5;
  ctx.stroke();
  // striscia tricolore
  rect(ctx, 16, 14, 308, 12, "#1f7a52");
  rect(ctx, 118, 14, 104, 12, "#f3ecdd");
  rect(ctx, 222, 14, 102, 12, "#e23e31");
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = "900 60px 'Arial Narrow', 'DM Sans', Arial, sans-serif";
  ctx.fillText(title, 170, 112);
  ctx.font = "700 19px 'DM Sans', Arial, sans-serif";
  ctx.globalAlpha = 0.72;
  ctx.fillText(subtitle, 170, 144);
  ctx.globalAlpha = 1;
  // vite/puntine
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
  // base
  rr(ctx, 10, 210, 600, 118, 6);
  ctx.fillStyle = "#c9b99e";
  ctx.fill();
  rect(ctx, 10, 300, 600, 28, "#a3957e");
  // spalti
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
  // tetto
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
  // tricolore sul tetto
  rect(ctx, 240, 60, 46, 12, "#1f7a52");
  rect(ctx, 286, 60, 46, 12, "#f3ecdd");
  rect(ctx, 332, 60, 46, 12, "#e23e31");
  ctx.fillStyle = "#354037";
  ctx.font = "900 26px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GRAN PREMIO", 310, 96);
  // bandierine
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

export function buildSprites(): SpriteCatalog {
  const carDefs: [string, string, string, string][] = [
    ["#efe3ca", "#efe3ca", "#fff6e2", "#b8342a"],
    ["#2d6a50", "#2d6a50", "#8fae9b", "#d8b25f"],
    ["#2f4a63", "#2f4a63", "#93a8b9", "#e0d6c1"],
    ["#c93b2c", "#c93b2c", "#f09a86", "#f3ecdd"],
    ["#d8b25f", "#d8b25f", "#f1dfb4", "#2d6a50"],
    ["#d9dcd6", "#d9dcd6", "#ffffff", "#2f4a63"],
  ];
  return {
    player: { img: drawPlayer(), worldWidth: 900 },
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
      { img: drawBoard("VELOCE", "COSTIERA ITALIANA", "cream"), worldWidth: 900 },
      { img: drawBoard("MARE", "2 KM · LIDO", "green"), worldWidth: 900 },
      { img: drawBoard("PIT STOP", "GOMME NUOVE", "red"), worldWidth: 900 },
      { img: drawBoard("GRAN PREMIO", "VELOCE · ITALIA", "cream"), worldWidth: 900 },
    ],
    grandstand: { img: drawGrandstand(), worldWidth: 2100 },
  };
}
