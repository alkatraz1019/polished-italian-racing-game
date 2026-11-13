import { useEffect, useMemo, useRef } from "react";
import {
  CHASSIS_OPTIONS,
  computeCarPhysics,
  FLAME_OPTIONS,
  getChassisSpec,
  getFlameSpec,
  getPaintSpec,
  PAINT_OPTIONS,
  RIMS_OPTIONS,
  SPOILER_OPTIONS,
  STRIPE_OPTIONS,
} from "../game/garage";
import { drawPlayerCarCanvas } from "../game/sprites";
import type { CarConfig } from "../game/types";
import { cn } from "../utils/cn";
import { Eyebrow, PrimaryButton, SecondaryButton, Tricolore } from "./ui";

export function CarPreviewCanvas({
  config,
  className,
  showFlame = false,
}: {
  config: CarConfig;
  className?: string;
  showFlame?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const sprite = drawPlayerCarCanvas(config);
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ombra da salone espositivo
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(
      canvas.width * 0.5,
      canvas.height * 0.89,
      canvas.width * 0.42,
      canvas.height * 0.075,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (showFlame) {
      const flame = getFlameSpec(config.flame);
      const glow = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.82,
        8,
        canvas.width * 0.5,
        canvas.height * 0.82,
        canvas.width * 0.36
      );
      glow.addColorStop(0, `rgba(${flame.glowRgba},0.52)`);
      glow.addColorStop(1, `rgba(${flame.glowRgba},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.55);
    }

    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  }, [config, showFlame]);

  return <canvas ref={ref} className={cn("h-auto w-full select-none", className)} />;
}

function StatBar({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.18em]">
        <span className="text-paper/55">{label}</span>
        <span className={cn("tabular", accent ? "text-oro" : "text-paper/80")}>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            accent ? "bg-oro" : "bg-gradient-to-r from-verde via-paper to-rosso"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function GarageOverlay({
  config,
  walletCoins,
  onChange,
  onClose,
  onStartRace,
}: {
  config: CarConfig;
  walletCoins: number;
  onChange: (next: CarConfig) => void;
  onClose: () => void;
  onStartRace?: () => void;
}) {
  const phys = useMemo(() => computeCarPhysics(config), [config]);
  const activeChassis = useMemo(() => getChassisSpec(config.chassis), [config.chassis]);
  const activePaint = useMemo(() => getPaintSpec(config.paint), [config.paint]);

  const randomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const num = String(Math.floor(1 + Math.random() * 98)).padStart(2, "0");
    const cities = ["BO", "MO", "MI", "FI", "TO", "NA", "PA", "RM"];
    onChange({
      chassis: pick(CHASSIS_OPTIONS).id,
      paint: pick(PAINT_OPTIONS).id,
      stripe: pick(STRIPE_OPTIONS).id,
      spoiler: pick(SPOILER_OPTIONS).id,
      rims: pick(RIMS_OPTIONS).id,
      flame: pick(FLAME_OPTIONS).id,
      number: num,
      plate: `${pick(cities)} ${num}`,
    });
  };

  return (
    <div className="no-scrollbar absolute inset-0 z-50 overflow-y-auto bg-ink/82 p-3 backdrop-blur-md sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-[980px] items-center">
        <div className="anim-pop w-full overflow-hidden rounded-2xl border border-paper/15 bg-[#111615] text-paper shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]">
          <Tricolore className="h-1.5 rounded-none" />

          {/* Header Officina */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 px-5 py-4 sm:px-6">
            <div>
              <Eyebrow className="text-oro/85">
                <span className="h-1.5 w-1.5 rounded-full bg-oro" />
                Reparto Corse · Elaborazioni su misura
              </Eyebrow>
              <div className="mt-1 flex items-baseline gap-3">
                <h2 className="font-display text-[30px] leading-none text-paper sm:text-[36px]">
                  OFFICINA SCUDERIA
                </h2>
                <span className="hidden font-editorial text-[20px] text-paper/50 sm:inline">
                  cuci la tua macchina.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-oro/30 bg-oro/10 px-3 py-1.5">
                <span className="text-[11px] text-oro">★</span>
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-oro/75">Gettoni Coppa</p>
                  <p className="font-display text-[14px] leading-none tabular text-oro">
                    {walletCoins.toLocaleString("it-IT")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={randomize}
                className="rounded-lg border border-paper/15 bg-paper/[0.05] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-paper/75 transition-colors hover:border-paper/35 hover:text-paper"
              >
                Casuale
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Chiudi officina"
                className="rounded-lg border border-paper/15 p-2 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
            {/* Colonna sinistra: Anteprima live + telemetria */}
            <div className="flex flex-col justify-between border-b border-paper/10 bg-gradient-to-b from-[#171e1c] to-[#0e1211] p-5 lg:border-b-0 lg:border-r sm:p-6">
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-paper/12 bg-[radial-gradient(circle_at_50%_38%,rgba(243,236,221,0.09),rgba(11,13,12,0.92))] px-4 pb-3 pt-5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded bg-paper/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-paper/70">
                      {activeChassis.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-paper/45">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/30"
                        style={{ backgroundColor: activePaint.mid }}
                      />
                      {activePaint.name}
                    </span>
                  </div>

                  <div className="mx-auto max-w-[300px] py-1">
                    <CarPreviewCanvas config={config} showFlame />
                  </div>

                  <p className="mt-1 text-center text-[10px] font-medium text-oro/85">
                    {activeChassis.perk}
                  </p>
                </div>

                {/* Numero e Targa */}
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <label className="block rounded-xl border border-paper/12 bg-ink/50 px-3 py-2 focus-within:border-oro/60">
                    <span className="block text-[7px] font-bold uppercase tracking-[0.22em] text-paper/40">
                      Numero Gara
                    </span>
                    <input
                      value={config.number}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          number: e.target.value.replace(/[^0-9A-Z]/gi, "").slice(0, 2).toUpperCase(),
                        })
                      }
                      maxLength={2}
                      placeholder="27"
                      className="mt-0.5 w-full bg-transparent font-display text-[20px] leading-none tracking-wider text-paper focus:outline-none"
                    />
                  </label>
                  <label className="block rounded-xl border border-paper/12 bg-ink/50 px-3 py-2 focus-within:border-oro/60">
                    <span className="block text-[7px] font-bold uppercase tracking-[0.22em] text-paper/40">
                      Targa Italiana
                    </span>
                    <input
                      value={config.plate}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          plate: e.target.value.replace(/[^0-9A-Z ·-]/gi, "").slice(0, 7).toUpperCase(),
                        })
                      }
                      maxLength={7}
                      placeholder="BO 27"
                      className="mt-0.5 w-full bg-transparent font-display text-[20px] leading-none tracking-wider text-paper focus:outline-none"
                    />
                  </label>
                </div>

                {/* Barre Telemetria */}
                <div className="mt-4 space-y-2.5 rounded-xl border border-paper/10 bg-ink/45 p-3.5">
                  <StatBar label="Velocità di punta" value={phys.ratings.velocita} />
                  <StatBar label="Accelerazione" value={phys.ratings.accelerazione} />
                  <StatBar label="Tenuta nei tornanti" value={phys.ratings.tenuta} />
                  <StatBar label="Rendimento Turbo" value={phys.ratings.turbo} accent />
                  <StatBar label="Robustezza & Fuoripista" value={phys.ratings.robustezza} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {onStartRace && (
                  <PrimaryButton onClick={onStartRace} className="flex-1 py-3">
                    Scendi in pista
                  </PrimaryButton>
                )}
                <SecondaryButton onClick={onClose} className={cn(!onStartRace && "w-full", "py-3")}>
                  Salva e chiudi
                </SecondaryButton>
              </div>
            </div>

            {/* Colonna destra: Selettori di personalizzazione */}
            <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5 sm:p-6">
              {/* 1. Telaio */}
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                  1 · Telaio & Motorizzazione
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CHASSIS_OPTIONS.map((ch) => {
                    const active = config.chassis === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => onChange({ ...config, chassis: ch.id })}
                        className={cn(
                          "rounded-xl border p-2.5 text-left transition-all",
                          active
                            ? "border-oro bg-oro/12 shadow-[0_0_20px_-8px_rgba(233,180,92,0.6)]"
                            : "border-paper/12 bg-paper/[0.03] hover:border-paper/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-paper">
                            {ch.name}
                          </span>
                          {ch.maxLives > 3 && (
                            <span className="rounded bg-verde/30 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#7bf5be]">
                              4 Vite
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-oro/80">
                          {ch.tagline}
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-paper/55">{ch.perk}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Vernice */}
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                  2 · Vernice Carrozzeria
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {PAINT_OPTIONS.map((p) => {
                    const active = config.paint === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onChange({ ...config, paint: p.id })}
                        title={p.name}
                        aria-label={p.name}
                        className={cn(
                          "group flex flex-col items-center gap-1 rounded-xl border p-2 transition-all",
                          active
                            ? "border-paper bg-paper/12 scale-[1.03]"
                            : "border-paper/12 bg-paper/[0.02] hover:border-paper/30"
                        )}
                      >
                        <span
                          className="h-6 w-6 rounded-full shadow-inner ring-1 ring-white/25"
                          style={{
                            background: `linear-gradient(135deg, ${p.top}, ${p.mid} 55%, ${p.deep})`,
                          }}
                        />
                        <span className="max-w-full truncate text-[7px] font-bold uppercase tracking-[0.08em] text-paper/65">
                          {p.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Striscia da gara */}
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                  3 · Livrea & Strisce
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STRIPE_OPTIONS.map((s) => {
                    const active = config.stripe === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onChange({ ...config, stripe: s.id })}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                          active
                            ? "border-oro bg-oro text-ink"
                            : "border-paper/15 bg-paper/[0.03] text-paper/70 hover:border-paper/35 hover:text-paper"
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Alettone */}
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                  4 · Aerodinamica Posteriore
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SPOILER_OPTIONS.map((sp) => {
                    const active = config.spoiler === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => onChange({ ...config, spoiler: sp.id })}
                        className={cn(
                          "rounded-xl border p-2.5 text-left transition-all",
                          active
                            ? "border-oro bg-oro/12"
                            : "border-paper/12 bg-paper/[0.03] hover:border-paper/30"
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-paper">
                          {sp.name}
                        </p>
                        <p className="mt-0.5 text-[9px] text-paper/50">{sp.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Cerchi e Fiamma Turbo */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                    5 · Cerchioni
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {RIMS_OPTIONS.map((r) => {
                      const active = config.rims === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onChange({ ...config, rims: r.id })}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all",
                            active
                              ? "border-oro bg-oro/15 text-paper"
                              : "border-paper/12 bg-paper/[0.03] text-paper/65 hover:border-paper/30"
                          )}
                        >
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/30"
                            style={{ backgroundColor: r.rim }}
                          />
                          <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em]">
                            {r.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-paper/45">
                    6 · Fiamma Turbo
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FLAME_OPTIONS.map((f) => {
                      const active = config.flame === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onChange({ ...config, flame: f.id })}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all",
                            active
                              ? "border-oro bg-oro/15 text-paper"
                              : "border-paper/12 bg-paper/[0.03] text-paper/65 hover:border-paper/30"
                          )}
                        >
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/30"
                            style={{
                              background: `radial-gradient(circle, ${f.core}, ${f.outer})`,
                            }}
                          />
                          <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em]">
                            {f.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
