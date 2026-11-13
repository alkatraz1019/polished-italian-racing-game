import { useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

function HoldButton({
  children,
  onDown,
  onUp,
  className,
  label,
  disabled,
}: {
  children: ReactNode;
  onDown: () => void;
  onUp: () => void;
  className?: string;
  label: string;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(false);
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    onDown();
  };
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setActive(false);
    onUp();
  };
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={() => {
        if (active) {
          setActive(false);
          onUp();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "pointer-events-auto flex touch-none select-none items-center justify-center rounded-2xl border text-paper transition-all duration-100",
        "border-paper/25 bg-ink/55 backdrop-blur-md",
        active && "scale-95 border-paper/50 bg-paper/25 text-white",
        disabled && "opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TouchControls({
  onSteer,
  onBrake,
  onTurbo,
  boost,
}: {
  onSteer: (steer: number) => void;
  onBrake: (pressed: boolean) => void;
  onTurbo: (pressed: boolean) => void;
  boost: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <HoldButton label="Sterza a sinistra" onDown={() => onSteer(-1)} onUp={() => onSteer(0)} className="h-[64px] w-[64px] rounded-full">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </HoldButton>
            <HoldButton label="Sterza a destra" onDown={() => onSteer(1)} onUp={() => onSteer(0)} className="h-[64px] w-[64px] rounded-full">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </HoldButton>
          </div>
          <span className="pl-1 text-[8px] font-bold uppercase tracking-[0.22em] text-paper/55">sterzo</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-end gap-2">
            <HoldButton label="Freno" onDown={() => onBrake(true)} onUp={() => onBrake(false)} className="h-[50px] w-[50px] rounded-full">
              <span className="flex flex-col items-center gap-0.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="5" width="14" height="14" rx="3" />
                  <path d="M9 12h6" />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-[0.1em]">freno</span>
              </span>
            </HoldButton>
            <HoldButton
              label="Turbo"
              onDown={() => onTurbo(true)}
              onUp={() => onTurbo(false)}
              className={cn(
                "h-[76px] w-[76px] rounded-full border-rosso/70 bg-rosso/90 text-paper",
                boost && "border-oro bg-oro text-ink shadow-[0_0_26px_rgba(233,180,92,0.75)]"
              )}
            >
              <span className="flex flex-col items-center gap-0.5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" />
                </svg>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em]">turbo</span>
              </span>
            </HoldButton>
          </div>
          <span className="pr-1 text-[8px] font-bold uppercase tracking-[0.22em] text-paper/55">freno · turbo</span>
        </div>
      </div>
    </div>
  );
}
