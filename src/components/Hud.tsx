import { GADGET_META } from "../game/garage";
import type { HudState } from "../game/types";
import { cn } from "../utils/cn";
import { CarGlyph, IconButton, KeyCap } from "./ui";

function SteeringWheel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.5v6M4.2 15.4l6-3.2M19.8 15.4l-6-3.2" strokeLinecap="round" />
    </svg>
  );
}

function Lives({ lives, maxLives }: { lives: number; maxLives: number }) {
  const slots = Array.from({ length: Math.max(3, maxLives) });
  return (
    <div className="flex items-center gap-1" aria-label={`Vite rimaste: ${lives}`}>
      {slots.map((_, i) => (
        <span
          key={i}
          className={cn(
            "flex h-5 w-6 items-center justify-center rounded-[4px] border transition-all duration-300",
            i < lives
              ? "border-paper/30 bg-paper/15 text-paper"
              : "border-paper/10 bg-ink/30 text-paper/20"
          )}
        >
          <CarGlyph className={cn("h-3.5 w-3.5", i >= lives && "opacity-40")} />
        </span>
      ))}
    </div>
  );
}

function Speedometer({ speed, gear, boost }: { speed: number; gear: number; boost: boolean }) {
  const max = 410;
  const pct = Math.min(speed / max, 1);
  const angle = -118 + pct * 236;
  const ticks = Array.from({ length: 13 });
  return (
    <div
      className={cn(
        "relative flex h-[100px] w-[152px] flex-col items-center justify-end rounded-2xl border border-paper/15 bg-ink/55 px-2 pb-1.5 backdrop-blur-md md:h-[128px] md:w-[184px]",
        boost && "border-oro/45 shadow-[0_0_34px_-6px_rgba(233,180,92,0.6)]"
      )}
    >
      <svg viewBox="0 0 160 104" className="absolute inset-x-0 top-0 h-full w-full">
        <defs>
          <linearGradient id="gaugeArc" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f3ecdd" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#e9b45c" />
            <stop offset="100%" stopColor="#e23e31" />
          </linearGradient>
        </defs>
        <path
          d="M 24 84 A 56 56 0 1 1 136 84"
          fill="none"
          stroke="rgba(243,236,221,0.14)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M 24 84 A 56 56 0 1 1 136 84"
          fill="none"
          stroke="url(#gaugeArc)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="264"
          strokeDashoffset={264 - pct * 264}
          style={{ transition: "stroke-dashoffset 140ms linear" }}
        />
        {ticks.map((_, i) => {
          const a = (-118 + (i / 12) * 236) * (Math.PI / 180);
          const cx = 80 + Math.sin(a) * 47;
          const cy = 72 - Math.cos(a) * 47;
          const inner = i % 3 === 0;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={80 + Math.sin(a) * (inner ? 39 : 43)}
              y2={72 - Math.cos(a) * (inner ? 39 : 43)}
              stroke={i > 9 ? "#e9b45c" : "rgba(243,236,221,0.35)"}
              strokeWidth={inner ? 1.6 : 1}
            />
          );
        })}
        <g transform={`rotate(${angle} 80 72)`} style={{ transition: "transform 140ms linear" }}>
          <line x1="80" y1="72" x2="80" y2="32" stroke="#e9b45c" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="80" cy="72" r="3.4" fill="#e9b45c" />
        </g>
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="font-display text-[27px] leading-none tabular text-paper md:text-[32px]">
          {speed}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[7px] font-bold uppercase tracking-[0.22em] text-paper/50">
          km/h
          <span
            className={cn(
              "rounded-sm px-1 py-[1px] text-[7px]",
              boost ? "bg-oro text-ink" : "bg-paper/15 text-paper/80"
            )}
          >
            {boost ? "TURBO" : `${gear}ª`}
          </span>
        </span>
      </div>
    </div>
  );
}

function TurboBar({ value, boost }: { value: number; boost: boolean }) {
  const segments = 12;
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="w-[132px] md:w-[194px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.22em] text-paper/60">
          <svg
            viewBox="0 0 24 24"
            className={cn("h-3 w-3", boost ? "text-oro" : "text-paper/50")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" strokeLinejoin="round" />
          </svg>
          Turbo
        </span>
        <span className={cn("font-display text-[11px] tabular", boost ? "text-oro" : "text-paper/55")}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-[5px] flex-1 rounded-[1px] transition-all duration-150",
              i < filled
                ? boost
                  ? "bg-oro shadow-[0_0_8px_rgba(233,180,92,0.85)]"
                  : "bg-paper/75"
                : "bg-paper/15"
            )}
            style={{ transform: boost && i < filled ? "scaleY(1.5)" : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

function EffectBadge({
  label,
  progress,
  color,
}: {
  label: string;
  progress: number;
  color: string;
}) {
  if (progress <= 0.01) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-paper/15 bg-ink/65 px-2.5 py-1 backdrop-blur-md">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <div className="w-20">
        <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-paper/85">{label}</p>
        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-paper/15">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

export function Hud({
  hud,
  best,
  paused,
  muted,
  onPause,
  onToggleMute,
  onUseGadget,
  showHints,
}: {
  hud: HudState;
  best: number;
  paused: boolean;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onUseGadget: () => void;
  showHints: boolean;
}) {
  const gadgetMeta = hud.heldGadget ? GADGET_META[hud.heldGadget] : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Punteggio, Vite, Gettoni e Turbo */}
      <div className="absolute left-3 top-3 flex flex-col items-start gap-2 md:left-4 md:top-4">
        <div className="rounded-xl border border-paper/15 bg-ink/58 px-2.5 py-2 backdrop-blur-md md:px-4 md:py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.26em] text-paper/50">Punti</span>
            <span className="h-1 w-1 rounded-full bg-rosso" />
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-paper/35 tabular">
              best {best.toLocaleString("it-IT")}
            </span>
            {hud.effects.crono > 0 && (
              <span className="rounded bg-[#b78cff]/25 px-1.5 py-[1px] text-[7px] font-black uppercase tracking-wider text-[#d5bdff]">
                2×
              </span>
            )}
          </div>
          <div className="font-display text-[23px] leading-none tabular text-paper md:text-[32px]">
            {hud.score.toLocaleString("it-IT")}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-paper/60 tabular">
              {hud.distanceKm.toFixed(2)} km · G{hud.lap}
            </span>
            <span className="h-[9px] w-px bg-paper/20" />
            <span className="font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-oro tabular">
              ★ {hud.coins}
            </span>
            <span className="h-[9px] w-px bg-paper/20" />
            <Lives lives={hud.lives} maxLives={hud.maxLives} />
          </div>
        </div>

        <div className="rounded-lg border border-paper/10 bg-ink/48 px-2.5 py-1.5 backdrop-blur-md">
          <TurboBar value={hud.turbo} boost={hud.boost} />
        </div>

        {/* Slot Oggetto Tattico */}
        {gadgetMeta ? (
          <button
            type="button"
            onClick={onUseGadget}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-oro/55 bg-ink/75 px-3 py-2 text-left shadow-[0_0_24px_-6px_rgba(233,180,92,0.55)] backdrop-blur-md transition-transform hover:scale-[1.02] active:scale-95"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black text-ink"
              style={{ backgroundColor: gadgetMeta.color }}
            >
              ✦
            </span>
            <div>
              <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-oro">
                Oggetto pronto
              </p>
              <p className="font-display text-[15px] leading-none tracking-wide text-paper">
                {gadgetMeta.name}
              </p>
            </div>
            <div className="hidden pl-1 md:block">
              <KeyCap>E</KeyCap>
            </div>
          </button>
        ) : (
          showHints && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-paper/10 bg-ink/40 px-2.5 py-1.5 backdrop-blur-md md:flex">
              <span className="text-[8px] uppercase tracking-[0.16em] text-paper/40">
                Cassa <span className="text-oro">?</span> = oggetto tattico
              </span>
              <KeyCap>E</KeyCap>
            </div>
          )
        )}

        {/* Effetti temporanei attivi */}
        <div className="flex flex-col gap-1">
          <EffectBadge label="Scudo Corse" progress={hud.effects.shield} color="#68f2cc" />
          <EffectBadge label="Calamita" progress={hud.effects.magnet} color="#ffd86b" />
          <EffectBadge label="Crono 2×" progress={hud.effects.crono} color="#b78cff" />
          <EffectBadge label="Furia" progress={hud.effects.overboost} color="#ff7a45" />
        </div>
      </div>

      {/* Utility in alto a destra */}
      <div className="absolute right-3 top-3 flex items-center gap-2 md:right-4 md:top-4">
        <IconButton label={muted ? "Attiva audio" : "Silenzia audio"} onClick={onToggleMute}>
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" strokeLinejoin="round" />
              <path d="m16 9 4 6M20 9l-4 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" strokeLinejoin="round" />
              <path d="M15 8.5a5 5 0 0 1 0 7M17.5 6a8 8 0 0 1 0 12" />
            </svg>
          )}
        </IconButton>
        <IconButton label={paused ? "Riprendi" : "Pausa"} onClick={onPause} active={paused}>
          {paused ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <rect x="6.5" y="5" width="3.6" height="14" rx="1" />
              <rect x="13.9" y="5" width="3.6" height="14" rx="1" />
            </svg>
          )}
        </IconButton>
      </div>

      {/* Combo centrale */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 md:top-4">
        <div
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border px-3 py-1.5 backdrop-blur-md transition-all duration-300",
            hud.combo > 1
              ? "border-oro/40 bg-ink/65 opacity-100"
              : "pointer-events-none -translate-y-1 border-transparent bg-transparent opacity-0"
          )}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-oro/80">combo</span>
            <span className="font-display text-[19px] leading-none text-oro">×{hud.combo}</span>
          </div>
          <div className="h-[3px] w-16 overflow-hidden rounded-full bg-paper/15">
            <div
              className="h-full rounded-full bg-oro transition-[width] duration-150"
              style={{ width: `${hud.comboProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Avviso fuori pista / sbandata olio */}
      <div
        className={cn(
          "absolute bottom-28 left-1/2 -translate-x-1/2 rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] backdrop-blur-md transition-opacity duration-200 md:bottom-6",
          hud.effects.slip
            ? "border-rosso/60 bg-ink/80 text-rosso opacity-100"
            : hud.offroad
            ? "border-oro/40 bg-ink/70 text-oro opacity-100"
            : "opacity-0"
        )}
      >
        {hud.effects.slip ? "Olio in pista · controsterza!" : "Fuori pista · rallenta"}
      </div>

      {/* Tachimetro desktop & mobile */}
      <div className="absolute bottom-4 right-4 hidden md:block">
        <Speedometer speed={hud.speedKmh} gear={hud.gear} boost={hud.boost} />
      </div>
      <div className="absolute right-2.5 top-[52px] origin-top-right scale-[0.78] md:hidden">
        <Speedometer speed={hud.speedKmh} gear={hud.gear} boost={hud.boost} />
      </div>

      {/* Suggerimento basso sinistra desktop */}
      <div className="absolute bottom-5 left-4 hidden items-center gap-2 rounded-lg border border-paper/10 bg-ink/40 px-2.5 py-1.5 backdrop-blur-md md:flex">
        <SteeringWheel className="h-4 w-4 text-paper/45" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-paper/45">
          {hud.offroad
            ? "Rientra in pista"
            : gadgetMeta
            ? `Premi E o ↑ per ${gadgetMeta.short}`
            : "Raccogli ★ e casse Scuderia"}
        </span>
      </div>
    </div>
  );
}
