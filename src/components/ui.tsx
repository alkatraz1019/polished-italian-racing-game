import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import type { ScoreEntry } from "../game/types";

export function Tricolore({ className }: { className?: string }) {
  return <span className={cn("tricolore inline-block h-[3px] w-full rounded-full", className)} />;
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-paper/55",
        className
      )}
    >
      {children}
    </p>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
};

export function PrimaryButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-rosso px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-paper",
        "shadow-[0_14px_30px_-12px_rgba(226,62,49,0.9)] ring-1 ring-rosso/60 transition-all duration-200",
        "hover:-translate-y-0.5 hover:bg-[#ef4a39] hover:shadow-[0_18px_38px_-12px_rgba(226,62,49,1)] active:translate-y-0 active:scale-[0.985]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center gap-2.5">{children}</span>
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className,
  disabled,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-paper/20 bg-paper/[0.04] px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-paper/85",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-paper/40 hover:bg-paper/[0.08] hover:text-paper active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/60 disabled:opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DarkButton({ children, onClick, className, ariaLabel }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-ink px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-paper",
        "transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1b211f] active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  active,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200",
        active
          ? "border-paper/40 bg-paper/15 text-paper"
          : "border-paper/15 bg-ink/45 text-paper/70 backdrop-blur-md hover:border-paper/30 hover:text-paper",
        "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/60",
        className
      )}
    >
      {children}
    </button>
  );
}

const CHASSIS_SHORT: Record<string, string> = {
  berlinetta: "GT",
  barchetta: "Sprint",
  prototipo: "V12",
  corazzata: "Rally",
};

export function ScoreTable({
  scores,
  highlightId,
  limit = 5,
  dark = false,
  showMeta = true,
  loading = false,
}: {
  scores: ScoreEntry[];
  highlightId?: string;
  limit?: number;
  dark?: boolean;
  showMeta?: boolean;
  loading?: boolean;
}) {
  if (loading && !scores.length) {
    return (
      <p className={cn("py-6 text-center text-[11px] uppercase tracking-[0.16em]", dark ? "text-ink/50" : "text-paper/50")}>
        Connessione al cronometraggio...
      </p>
    );
  }
  const rows = scores.slice(0, limit);
  if (!rows.length) {
    return (
      <p className={cn("py-6 text-center text-[12px]", dark ? "text-ink/50" : "text-paper/50")}>
        Nessun giro registrato. La pista è tua.
      </p>
    );
  }
  return (
    <ol className={cn("divide-y", dark ? "divide-ink/10" : "divide-paper/10")}>
      {rows.map((entry, i) => {
        const highlight = entry.id === highlightId;
        const badgeColor = entry.carColor || "#df3b2c";
        const carNum = entry.carNumber || "27";
        const chassisLabel = entry.carChassis ? CHASSIS_SHORT[entry.carChassis] ?? entry.carChassis : null;

        return (
          <li
            key={entry.id}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-[9px] transition-colors",
              highlight && (dark ? "bg-rosso/12" : "bg-rosso/15"),
              i === 0 && !highlight && (dark ? "bg-ink/[0.035]" : "bg-paper/[0.04]")
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 font-display text-[15px] leading-none tracking-wide",
                i === 0 ? "text-rosso" : dark ? "text-ink/35" : "text-paper/40"
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            {/* Bollo auto personalizzata */}
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black tracking-tight text-white shadow-sm ring-1 ring-black/20"
              style={{ backgroundColor: badgeColor }}
              title={chassisLabel ? `Auto #${carNum} · ${chassisLabel}` : `Auto #${carNum}`}
            >
              {carNum.slice(0, 2)}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "truncate text-[12px] font-bold uppercase tracking-[0.1em]",
                    dark ? "text-ink" : "text-paper/90"
                  )}
                >
                  {entry.name}
                </span>
                {entry.legend && (
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-1 py-[1px] text-[7px] font-bold uppercase tracking-[0.14em]",
                      dark ? "bg-ink/10 text-ink/50" : "bg-paper/10 text-paper/45"
                    )}
                  >
                    storico
                  </span>
                )}
                {highlight && (
                  <span className="shrink-0 rounded-sm bg-rosso px-1.5 py-[1px] text-[7px] font-bold uppercase tracking-[0.14em] text-paper">
                    tu
                  </span>
                )}
              </div>
              {showMeta && (
                <p
                  className={cn(
                    "mt-0.5 truncate text-[9px] uppercase tracking-[0.11em]",
                    dark ? "text-ink/45" : "text-paper/35"
                  )}
                >
                  {entry.date}
                  {chassisLabel ? ` · ${chassisLabel}` : ""} · {entry.distanceKm.toFixed(1)} km ·{" "}
                  {entry.topSpeedKmh} km/h
                </p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 font-display text-[17px] leading-none tabular tracking-wide",
                dark ? "text-ink" : "text-paper"
              )}
            >
              {entry.score.toLocaleString("it-IT")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Trophy({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M16 5h2a2 2 0 0 1 0 4h-1M8 5H6a2 2 0 0 0 0 4h1" />
      <path d="M12 13v4M8.5 21h7M10 21v-2h4v2" />
    </svg>
  );
}

export function WrenchGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  );
}

export function CarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="currentColor">
      <path d="M3.4 15.2 5 9.6a2.2 2.2 0 0 1 2.1-1.6h9.8A2.2 2.2 0 0 1 19 9.6l1.6 5.6v3.1a.9.9 0 0 1-.9.9h-1.6a.9.9 0 0 1-.9-.9v-1H6.8v1a.9.9 0 0 1-.9.9H4.3a.9.9 0 0 1-.9-.9v-3.1Zm2.5-1.1h12.2l-1-3.5a.8.8 0 0 0-.8-.6H7.7a.8.8 0 0 0-.8.6l-1 3.5Z" />
      <circle cx="7.4" cy="16.4" r="1.15" fill="var(--color-ink, #0b0d0c)" />
      <circle cx="16.6" cy="16.4" r="1.15" fill="var(--color-ink, #0b0d0c)" />
    </svg>
  );
}

export function KeyCap({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-paper/20 border-b-paper/30 bg-paper/[0.06] px-1.5 font-sans text-[10px] font-bold text-paper/80",
        wide && "px-2"
      )}
    >
      {children}
    </kbd>
  );
}

export function Stat({
  label,
  value,
  unit,
  className,
  dark = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.2em]",
          dark ? "text-ink/45" : "text-paper/45"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-xl leading-none tabular",
          dark ? "text-ink" : "text-paper"
        )}
      >
        {value}
        {unit && (
          <span
            className={cn(
              "ml-1 font-sans text-[9px] font-semibold",
              dark ? "text-ink/40" : "text-paper/40"
            )}
          >
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
