import { useState } from "react";
import type { GameSummary, HudState, ScoreEntry } from "../game/types";
import { cn } from "../utils/cn";
import {
  CarGlyph,
  DarkButton,
  Eyebrow,
  KeyCap,
  PrimaryButton,
  ScoreTable,
  SecondaryButton,
  Stat,
  Tricolore,
  Trophy,
} from "./ui";

const fmt = (n: number) => Math.round(n).toLocaleString("it-IT");

/* ----------------------------------------------------------------- inizio */

export function StartOverlay({
  best,
  pilot,
  onPilotChange,
  onStart,
  onHelp,
  onScores,
}: {
  best: number;
  pilot: string;
  onPilotChange: (v: string) => void;
  onStart: () => void;
  onHelp: () => void;
  onScores: () => void;
}) {
  return (
    <div className="no-scrollbar absolute inset-0 z-30 overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />

      {/* poster decorativo */}
      <div className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none flex-col items-center gap-2 lg:flex">
        <span className="font-display text-[220px] leading-none text-paper/[0.045]">27</span>
        <span className="font-editorial -mt-6 text-[36px] text-paper/15">velocità</span>
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col justify-end px-5 pb-6 pt-14 sm:justify-center sm:px-8 sm:pb-8 lg:px-12">
        <div className="anim-float-up max-w-[560px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="tricolore h-[3px] w-8 rounded-full" />
            <Eyebrow className="text-paper/60">
              Gran Premio Italiano
              <span className="h-1 w-1 rounded-full bg-oro" />
              Costiera
            </Eyebrow>
          </div>

          <h1 className="font-display text-[clamp(64px,14vw,124px)] leading-[0.8] tracking-[0.005em] text-paper text-shadow-hard">
            VELOCE
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-editorial text-[clamp(28px,5.5vw,46px)] leading-none text-oro">e furioso.</p>
            <span className="h-px max-w-[90px] flex-1 bg-paper/25" />
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.26em] text-paper/40 sm:block">
              dal 1924
            </span>
          </div>

          <p className="mt-4 max-w-[430px] text-[13px] leading-relaxed text-paper/65 sm:text-[14px]">
            Il sole cala sulla costa, il traffico non frena. Infilati nei sorpassi,
            sfiora i missili e brucia il turbo. Tre vite, nessuna scusa.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <PrimaryButton onClick={onStart} className="anim-glow px-7 py-4 text-[15px]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Via!
            </PrimaryButton>
            <SecondaryButton onClick={onHelp}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
                <path d="M7 11h2M15 11h2M10 14h4" strokeLinecap="round" />
              </svg>
              Comandi
            </SecondaryButton>
            <button
              type="button"
              onClick={onScores}
              className="inline-flex items-center gap-1.5 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/50 transition-colors hover:text-paper"
            >
              <Trophy className="h-3.5 w-3.5" /> Classifica
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-paper/35">
            <KeyCap>Invio</KeyCap> per partire
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <label className="group block">
              <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.24em] text-paper/40">
                Nome pilota
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-paper/20 bg-ink/45 px-3 py-2 transition-colors focus-within:border-oro/60">
                <CarGlyph className="h-3.5 w-3.5 text-paper/40" />
                <input
                  value={pilot}
                  onChange={(e) => onPilotChange(e.target.value.toUpperCase().slice(0, 10))}
                  maxLength={10}
                  aria-label="Nome pilota"
                  className="w-[124px] bg-transparent text-[12px] font-bold uppercase tracking-[0.16em] text-paper placeholder:text-paper/30 focus:outline-none"
                  placeholder="TU"
                />
              </div>
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-paper/10 bg-ink/35 px-3 py-2">
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-paper/40">Record</p>
                <p className="font-display text-[17px] leading-none tabular text-paper">
                  {best > 0 ? fmt(best) : "—"}
                </p>
              </div>
              <span className="h-7 w-px bg-paper/15" />
              <div className="flex items-center gap-2 text-paper/50">
                <span className="flex flex-col">
                  <span className="text-[7px] font-bold uppercase tracking-[0.2em]">Vite</span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <CarGlyph key={i} className="h-3 w-3 text-paper/70" />
                    ))}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 border-t border-paper/10 pt-3 text-[8px] uppercase tracking-[0.18em] text-paper/35">
            <span>Sorpasso +100</span>
            <span className="text-oro/70">Missile +150</span>
            <span>Combo ×10</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 hidden items-center gap-2 rounded-full border border-paper/15 bg-ink/40 px-3 py-1.5 backdrop-blur-md sm:flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-oro opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-oro" />
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-paper/55">Anteprima in pista</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pausa */

export function PauseOverlay({
  hud,
  muted,
  onResume,
  onRestart,
  onMenu,
  onToggleMute,
}: {
  hud: HudState;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[3px]">
      <div className="anim-pop w-full max-w-[420px] overflow-hidden rounded-2xl border border-paper/15 bg-[#121716]/95 shadow-2xl">
        <Tricolore className="rounded-none" />
        <div className="p-5 sm:p-6">
          <Eyebrow>
            <span className="h-1 w-1 rounded-full bg-oro" />
            Gara sospesa
          </Eyebrow>
          <div className="mt-2 flex items-end justify-between">
            <h2 className="font-display text-[48px] leading-none text-paper">PAUSA</h2>
            <p className="font-editorial pb-1 text-[22px] text-oro/80">riprendi il volante.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-paper/10 bg-ink/50 p-3">
            <Stat label="Punti" value={fmt(hud.score)} />
            <Stat label="Distanza" value={hud.distanceKm.toFixed(1)} unit="km" />
            <Stat label="Combo" value={`×${hud.combo}`} />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <PrimaryButton onClick={onResume} className="w-full">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Riprendi
            </PrimaryButton>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={onRestart}>Ricomincia</SecondaryButton>
              <SecondaryButton onClick={onMenu}>Al menu</SecondaryButton>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-paper/10 pt-3">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-paper/40">
              <KeyCap>P</KeyCap> pausa <span className="mx-1 opacity-40">·</span>
              <KeyCap>R</KeyCap> ricomincia
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className="text-[9px] font-semibold uppercase tracking-[0.16em] text-paper/50 underline decoration-paper/20 underline-offset-4 hover:text-paper"
            >
              {muted ? "Audio off" : "Audio on"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- fine gara */

export function GameOverOverlay({
  summary,
  scores,
  entryId,
  rank,
  isRecord,
  best,
  onRestart,
  onMenu,
  onScores,
}: {
  summary: GameSummary;
  scores: ScoreEntry[];
  entryId?: string;
  rank: number;
  isRecord: boolean;
  best: number;
  onRestart: () => void;
  onMenu: () => void;
  onScores: () => void;
}) {
  return (
    <div className="no-scrollbar absolute inset-0 z-40 overflow-y-auto bg-ink/75 p-3 backdrop-blur-[2px] sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-[900px] items-center">
        <div className="anim-pop w-full overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_40px_90px_-20px_rgba(0,0,0,0.75)]">
          <div className="tricolore h-[5px] w-full" />
          <div className="grid md:grid-cols-[1.02fr_0.98fr]">
            {/* riepilogo */}
            <div className="relative p-5 pb-4 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <Eyebrow className="text-ink/45">
                    <span className="h-1.5 w-1.5 rounded-full bg-rosso" />
                    Gara finita
                  </Eyebrow>
                  <h2 className="mt-1.5 font-display text-[38px] leading-[0.9] tracking-tight text-ink sm:text-[44px]">
                    CHE GIRO.
                  </h2>
                  <p className="font-editorial mt-0.5 text-[21px] text-ink/55">La costa ricorderà il tuo nome.</p>
                </div>
                <button
                  type="button"
                  onClick={onMenu}
                  aria-label="Torna al menu"
                  className="rounded-lg border border-ink/15 p-2 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              {isRecord ? (
                <div className="anim-pop mt-4 flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-paper">
                  <Trophy className="h-4 w-4 text-oro" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-oro">
                      {rank === 1 ? "Nuovo record del circolo" : "Nuovo record personale"}
                    </p>
                    <p className="text-[10px] text-paper/55">
                      {rank === 1 ? "Hai superato tutti. Per ora." : "Il tuo miglior giro di sempre."}
                    </p>
                  </div>
                  <span className="font-display rotate-[-4deg] rounded bg-rosso px-2 py-1 text-[11px] tracking-wide">
                    {rank === 1 ? "N°1" : "PB"}
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.035] px-3 py-2">
                  <span className="font-display text-[13px] text-ink/70">POS. {rank > 0 ? String(rank).padStart(2, "0") : "—"}</span>
                  <span className="text-[10px] text-ink/45">in classifica · miglior giro {best > 0 ? fmt(best) : "—"}</span>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-ink/10 bg-white/40 p-3.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/40">Punteggio finale</p>
                <div className="flex items-end gap-2">
                  <span className="font-display text-[clamp(48px,10vw,70px)] leading-[0.9] tabular text-ink">
                    {fmt(summary.score)}
                  </span>
                  <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rosso">punti</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border border-ink/10 p-3.5 sm:grid-cols-4 md:grid-cols-2">
                <Stat dark label="Distanza" value={summary.distanceKm.toFixed(2)} unit="km" />
                <Stat dark label="Vel. max" value={summary.topSpeedKmh} unit="km/h" />
                <Stat dark label="Sorpassi" value={summary.overtakes} />
                <Stat dark label="Missili" value={summary.nearMisses} />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <PrimaryButton onClick={onRestart} className="flex-1 py-3.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                  </svg>
                  Riprova
                </PrimaryButton>
                <DarkButton onClick={onMenu} className="py-3.5">
                  Menu
                </DarkButton>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink/35">
                <KeyCap>R</KeyCap> oppure <KeyCap>Invio</KeyCap> per ripartire subito
              </p>
              <span className="checker pointer-events-none absolute bottom-0 left-0 h-2 w-full opacity-[0.05]" />
            </div>

            {/* classifica */}
            <div className="border-t border-ink/10 bg-[#ebe2d0] p-5 md:border-l md:border-t-0 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/40">Circolo veloce</p>
                  <h3 className="mt-0.5 font-display text-[24px] leading-none text-ink">CLASSIFICA</h3>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/60">
                  <Trophy className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3">
                <ScoreTable scores={scores} highlightId={entryId} limit={6} dark />
              </div>
              <button
                type="button"
                onClick={onScores}
                className="mt-3 flex w-full items-center justify-between border-t border-ink/10 pt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-ink/45 transition-colors hover:text-ink"
              >
                Vedi tutta la classifica
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
              <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-ink/30">
                Punteggi salvati su questo dispositivo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- comandi */

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-[3px]">
      <div className="anim-pop max-h-full w-full max-w-[520px] overflow-y-auto rounded-2xl border border-paper/15 bg-[#121716]/97 shadow-2xl">
        <Tricolore className="rounded-none" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Manuale del pilota</Eyebrow>
              <h2 className="mt-1 font-display text-[32px] leading-none text-paper">COMANDI</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="rounded-lg border border-paper/15 p-2 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { keys: ["←", "→"], label: "Sterza a sinistra e a destra", note: "Anche A / D" },
              { keys: ["↓"], label: "Freno — entra più stretto in curva", note: "Anche S" },
              { keys: ["SPAZIO"], label: "Turbo — spinta extra finché ne hai", note: "Anche Shift" },
              { keys: ["P", "ESC"], label: "Pausa e respiro", note: "" },
              { keys: ["R"], label: "Ricomincia all'istante", note: "" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 rounded-lg border border-paper/10 bg-ink/45 px-3 py-2.5">
                <div className="flex shrink-0 gap-1">
                  {row.keys.map((k) => (
                    <KeyCap key={k} wide={k.length > 1}>{k}</KeyCap>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-paper/85">{row.label}</p>
                  {row.note && <p className="text-[9px] uppercase tracking-[0.12em] text-paper/35">{row.note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-oro/25 bg-oro/[0.07] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-oro">Su telefono</p>
            <p className="mt-1 text-[11px] leading-relaxed text-paper/65">
              Tieni premuto il lato sinistro per sterzare. A destra trovi freno e turbo:
              puoi premerli insieme allo sterzo con due dita.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-paper/55">
            <div className="rounded-lg border border-paper/10 p-2.5">
              <p className="font-bold text-paper/85">+100</p>
              <p className="text-[9px] uppercase tracking-[0.12em]">per sorpasso</p>
            </div>
            <div className="rounded-lg border border-paper/10 p-2.5">
              <p className="font-bold text-oro">+150</p>
              <p className="text-[9px] uppercase tracking-[0.12em]">per missile</p>
            </div>
            <div className="rounded-lg border border-paper/10 p-2.5">
              <p className="font-bold text-paper/85">×2 — ×10</p>
              <p className="text-[9px] uppercase tracking-[0.12em]">combo in sequenza</p>
            </div>
            <div className="rounded-lg border border-paper/10 p-2.5">
              <p className="font-bold text-rosso">3 vite</p>
              <p className="text-[9px] uppercase tracking-[0.12em]">un urto, una in meno</p>
            </div>
          </div>

          <PrimaryButton onClick={onClose} className="mt-4 w-full">
            <CarGlyph className="h-4 w-4" /> In pista
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- classifica */

export function ScoresOverlay({
  scores,
  onClose,
  onClear,
}: {
  scores: ScoreEntry[];
  onClose: () => void;
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-[3px]">
      <div className="anim-pop w-full max-w-[460px] overflow-hidden rounded-2xl bg-paper text-ink shadow-2xl">
        <div className="tricolore h-1.5 w-full" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow className="text-ink/45">Circolo veloce · dal 1924</Eyebrow>
              <h2 className="mt-1 font-display text-[32px] leading-none text-ink">CLASSIFICA</h2>
              <p className="mt-1 text-[10px] text-ink/45">
                I migliori giri della costiera, salvati sul tuo dispositivo.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi classifica"
              className="rounded-lg border border-ink/15 p-2 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-ink/10 bg-[#ebe2d0]/70 p-1">
            <ScoreTable scores={scores} limit={8} dark />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirming) {
                  onClear();
                  setConfirming(false);
                } else {
                  setConfirming(true);
                }
              }}
              className={cn(
                "text-[9px] font-bold uppercase tracking-[0.16em] transition-colors",
                confirming ? "text-rosso" : "text-ink/35 hover:text-ink/70"
              )}
            >
              {confirming ? "Confermi? Azzera tutto" : "Azzera classifica"}
            </button>
            <DarkButton onClick={onClose} className="py-2.5 text-[10px]">
              Chiudi
            </DarkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
