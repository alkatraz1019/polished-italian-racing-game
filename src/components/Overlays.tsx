import { useState } from "react";
import { getChassisSpec, getPaintSpec } from "../game/garage";
import type { CarConfig, GameSummary, HudState, ScoreEntry } from "../game/types";
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
  WrenchGlyph,
} from "./ui";

const fmt = (n: number) => Math.round(n).toLocaleString("it-IT");

/* ----------------------------------------------------------------- inizio */

export function StartOverlay({
  best,
  pilot,
  carConfig,
  onlineReady,
  onPilotChange,
  onStart,
  onGarage,
  onHelp,
  onScores,
}: {
  best: number;
  pilot: string;
  carConfig: CarConfig;
  onlineReady: boolean;
  onPilotChange: (v: string) => void;
  onStart: () => void;
  onGarage: () => void;
  onHelp: () => void;
  onScores: () => void;
}) {
  const chassis = getChassisSpec(carConfig.chassis);
  const paint = getPaintSpec(carConfig.paint);

  return (
    <div className="no-scrollbar absolute inset-0 z-30 overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/82 to-ink/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />

      {/* Poster decorativo */}
      <div className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 select-none flex-col items-center gap-2 lg:flex">
        <span className="font-display text-[210px] leading-none text-paper/[0.045]">
          {carConfig.number || "27"}
        </span>
        <span className="font-editorial -mt-6 text-[34px] text-paper/15">coppa tirrena</span>
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col justify-end px-5 pb-6 pt-14 sm:justify-center sm:px-8 sm:pb-8 lg:px-12">
        <div className="anim-float-up max-w-[590px]">
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <span className="tricolore h-[3px] w-8 rounded-full" />
            <Eyebrow className="text-paper/65">
              Scuderia Italiana
              <span className="h-1 w-1 rounded-full bg-oro" />
              Coppa della Costiera
            </Eyebrow>
          </div>

          <h1 className="font-display text-[clamp(56px,12.5vw,116px)] leading-[0.82] tracking-[0.005em] text-paper text-shadow-hard">
            MILLE CURVE
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-editorial text-[clamp(26px,5vw,44px)] leading-none text-oro">
              la coppa infinita.
            </p>
            <span className="h-px max-w-[90px] flex-1 bg-paper/25" />
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.26em] text-paper/40 sm:block">
              dal 1924
            </span>
          </div>

          <p className="mt-3.5 max-w-[460px] text-[13px] leading-relaxed text-paper/70 sm:text-[14px]">
            Elabora il tuo bolide in Officina, raccogli bombole nitro, scudi e casse
            tattiche lungo i tornanti sul mare, schiva le chiazze d'olio e incidi il tuo
            tempo nella classifica mondiale.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <PrimaryButton onClick={onStart} className="anim-glow px-7 py-4 text-[15px]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Parti!
            </PrimaryButton>
            <SecondaryButton onClick={onGarage} className="border-oro/35 bg-oro/[0.08] text-paper hover:border-oro/65">
              <WrenchGlyph className="h-4 w-4 text-oro" />
              Officina
              <span
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black text-white"
                style={{ backgroundColor: paint.mid }}
              >
                {carConfig.number}
              </span>
            </SecondaryButton>
            <SecondaryButton onClick={onHelp} className="px-4">
              Guida & Oggetti
            </SecondaryButton>
            <button
              type="button"
              onClick={onScores}
              className="inline-flex items-center gap-1.5 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/55 transition-colors hover:text-paper"
            >
              <Trophy className="h-3.5 w-3.5 text-oro/85" /> Classifica
            </button>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-paper/35">
            <KeyCap>Invio</KeyCap> per partire <span className="opacity-40">·</span>{" "}
            <KeyCap>G</KeyCap> officina
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <label className="group block">
              <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.24em] text-paper/40">
                Nome pilota
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-paper/20 bg-ink/50 px-3 py-2 transition-colors focus-within:border-oro/60">
                <CarGlyph className="h-3.5 w-3.5 text-paper/40" />
                <input
                  value={pilot}
                  onChange={(e) => onPilotChange(e.target.value.toUpperCase().slice(0, 12))}
                  maxLength={12}
                  aria-label="Nome pilota"
                  className="w-[132px] bg-transparent text-[12px] font-bold uppercase tracking-[0.15em] text-paper placeholder:text-paper/30 focus:outline-none"
                  placeholder="PILOTA"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={onGarage}
              className="flex items-center gap-3 rounded-lg border border-paper/12 bg-ink/40 px-3 py-2 text-left transition-colors hover:border-oro/40"
            >
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-paper/40">
                  Vettura scelta
                </p>
                <p className="font-display text-[16px] leading-none text-paper">
                  {chassis.name}
                </p>
              </div>
              <span className="h-7 w-px bg-paper/15" />
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-paper/40">Record</p>
                <p className="font-display text-[16px] leading-none tabular text-oro">
                  {best > 0 ? fmt(best) : "—"}
                </p>
              </div>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-paper/10 pt-3 text-[8px] uppercase tracking-[0.18em] text-paper/40">
            <span>Sorpasso +100</span>
            <span className="text-oro/80">Pelo +150</span>
            <span className="text-[#68f2cc]/85">Scudo & Nitro</span>
            <span className="text-[#c69eff]/85">Casse Tattiche (E)</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 hidden items-center gap-2 rounded-full border border-paper/15 bg-ink/45 px-3 py-1.5 backdrop-blur-md sm:flex">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
              onlineReady ? "bg-verde" : "bg-oro"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              onlineReady ? "bg-[#4ade80]" : "bg-oro"
            )}
          />
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-paper/60">
          {onlineReady ? "Classifica Live Attiva" : "Anteprima in pista"}
        </span>
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
  onGarage,
  onMenu,
  onToggleMute,
}: {
  hud: HudState;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[3px]">
      <div className="anim-pop w-full max-w-[430px] overflow-hidden rounded-2xl border border-paper/15 bg-[#121716]/95 shadow-2xl">
        <Tricolore className="rounded-none" />
        <div className="p-5 sm:p-6">
          <Eyebrow>
            <span className="h-1 w-1 rounded-full bg-oro" />
            Gara sospesa · Giro {hud.lap}
          </Eyebrow>
          <div className="mt-2 flex items-end justify-between">
            <h2 className="font-display text-[48px] leading-none text-paper">PAUSA</h2>
            <p className="font-editorial pb-1 text-[22px] text-oro/80">riprendi il volante.</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2.5 rounded-xl border border-paper/10 bg-ink/50 p-3">
            <Stat label="Punti" value={fmt(hud.score)} />
            <Stat label="Km" value={hud.distanceKm.toFixed(1)} />
            <Stat label="Combo" value={`×${hud.combo}`} />
            <Stat label="Gettoni" value={`★${hud.coins}`} />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <PrimaryButton onClick={onResume} className="w-full">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Riprendi
            </PrimaryButton>
            <div className="grid grid-cols-3 gap-2">
              <SecondaryButton onClick={onRestart} className="px-3 text-[10px]">
                Riprova
              </SecondaryButton>
              <SecondaryButton onClick={onGarage} className="px-3 text-[10px]">
                Officina
              </SecondaryButton>
              <SecondaryButton onClick={onMenu} className="px-3 text-[10px]">
                Menu
              </SecondaryButton>
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
  globalScores,
  localScores,
  entryId,
  rank,
  isRecord,
  best,
  syncState,
  onRestart,
  onGarage,
  onMenu,
  onScores,
}: {
  summary: GameSummary;
  globalScores: ScoreEntry[];
  localScores: ScoreEntry[];
  entryId?: string;
  rank: number;
  isRecord: boolean;
  best: number;
  syncState: "syncing" | "synced" | "offline";
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
  onScores: () => void;
}) {
  const [tab, setTab] = useState<"global" | "local">("global");
  const shownScores = tab === "global" && globalScores.length > 0 ? globalScores : localScores;

  return (
    <div className="no-scrollbar absolute inset-0 z-40 overflow-y-auto bg-ink/75 p-3 backdrop-blur-[2px] sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-[920px] items-center">
        <div className="anim-pop w-full overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_40px_90px_-20px_rgba(0,0,0,0.75)]">
          <div className="tricolore h-[5px] w-full" />
          <div className="grid md:grid-cols-[1.03fr_0.97fr]">
            {/* Riepilogo gara */}
            <div className="relative p-5 pb-4 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <Eyebrow className="text-ink/45">
                    <span className="h-1.5 w-1.5 rounded-full bg-rosso" />
                    Bandiera a scacchi · Giro {summary.laps}
                  </Eyebrow>
                  <h2 className="mt-1.5 font-display text-[38px] leading-[0.9] tracking-tight text-ink sm:text-[44px]">
                    GRANDE CORSA.
                  </h2>
                  <p className="font-editorial mt-0.5 text-[21px] text-ink/55">
                    La costiera ricorderà il tuo passaggio.
                  </p>
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
                      {rank === 1 ? "Nuovo Primato Assoluto" : "Nuovo Record Personale"}
                    </p>
                    <p className="text-[10px] text-paper/55">
                      {rank === 1 ? "Davanti a tutti nella Coppa Costiera." : "Il tuo miglior giro di sempre."}
                    </p>
                  </div>
                  <span className="font-display rotate-[-4deg] rounded bg-rosso px-2 py-1 text-[11px] tracking-wide">
                    {rank === 1 ? "N°1" : "PB"}
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-ink/10 bg-ink/[0.035] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13px] text-ink/75">
                      POS. {rank > 0 ? String(rank).padStart(2, "0") : "—"}
                    </span>
                    <span className="text-[10px] text-ink/50">
                      · miglior giro {best > 0 ? fmt(best) : "—"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                      syncState === "synced"
                        ? "bg-verde/15 text-verde"
                        : syncState === "syncing"
                        ? "bg-oro/25 text-ink/70"
                        : "bg-ink/10 text-ink/50"
                    )}
                  >
                    {syncState === "synced"
                      ? "Salvato online"
                      : syncState === "syncing"
                      ? "Invio..."
                      : "Locale"}
                  </span>
                </div>
              )}

              <div className="mt-3.5 rounded-xl border border-ink/10 bg-white/45 p-3.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/40">
                  Punteggio finale
                </p>
                <div className="flex items-end gap-2">
                  <span className="font-display text-[clamp(46px,10vw,68px)] leading-[0.9] tabular text-ink">
                    {fmt(summary.score)}
                  </span>
                  <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rosso">
                    punti
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5 rounded-xl border border-ink/10 p-3.5">
                <Stat dark label="Distanza" value={summary.distanceKm.toFixed(2)} unit="km" />
                <Stat dark label="Vel. max" value={summary.topSpeedKmh} unit="km/h" />
                <Stat dark label="Sorpassi" value={summary.overtakes} />
                <Stat dark label="Peli" value={summary.nearMisses} />
                <Stat dark label="Gettoni ★" value={summary.coins} />
                <Stat dark label="Oggetti" value={summary.itemsUsed} />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <PrimaryButton onClick={onRestart} className="flex-1 py-3.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                  </svg>
                  Riprova
                </PrimaryButton>
                <DarkButton onClick={onGarage} className="py-3.5">
                  <WrenchGlyph className="h-3.5 w-3.5" /> Officina
                </DarkButton>
                <DarkButton onClick={onMenu} className="py-3.5">
                  Menu
                </DarkButton>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink/35">
                <KeyCap>R</KeyCap> oppure <KeyCap>Invio</KeyCap> per ripartire subito
              </p>
              <span className="checker pointer-events-none absolute bottom-0 left-0 h-2 w-full opacity-[0.05]" />
            </div>

            {/* Classifica post-gara */}
            <div className="border-t border-ink/10 bg-[#ebe2d0] p-5 md:border-l md:border-t-0 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/45">
                    Coppa Costiera
                  </p>
                  <h3 className="mt-0.5 font-display text-[24px] leading-none text-ink">
                    CLASSIFICA
                  </h3>
                </div>
                <div className="flex rounded-lg border border-ink/15 bg-ink/5 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTab("global")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors",
                      tab === "global" ? "bg-ink text-paper" : "text-ink/55 hover:text-ink"
                    )}
                  >
                    Mondiale
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("local")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors",
                      tab === "local" ? "bg-ink text-paper" : "text-ink/55 hover:text-ink"
                    )}
                  >
                    Locale
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <ScoreTable
                  scores={shownScores}
                  highlightId={entryId}
                  limit={6}
                  dark
                  loading={syncState === "syncing"}
                />
              </div>
              <button
                type="button"
                onClick={onScores}
                className="mt-3 flex w-full items-center justify-between border-t border-ink/10 pt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
              >
                Classifica completa
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
              <p className="mt-2 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-ink/40">
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    syncState === "synced" ? "bg-verde" : "bg-oro"
                  )}
                />
                {syncState === "synced"
                  ? "Sincronizzata in tempo reale con Supabase"
                  : syncState === "syncing"
                  ? "Sincronizzazione classifica in corso..."
                  : "Punteggi salvati sul dispositivo"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- guida & oggetti */

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="no-scrollbar absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-[4px]">
      <div className="anim-pop my-auto max-h-[92vh] w-full max-w-[600px] overflow-y-auto rounded-2xl border border-paper/15 bg-[#121716]/97 shadow-2xl">
        <Tricolore className="rounded-none" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Manuale Scuderia</Eyebrow>
              <h2 className="mt-1 font-display text-[32px] leading-none text-paper">
                COMANDI & OGGETTI
              </h2>
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { keys: ["←", "→"], label: "Sterzo rapido", note: "Anche A / D" },
              { keys: ["↓"], label: "Freno in staccata", note: "Anche S" },
              { keys: ["SPAZIO"], label: "Spinta Turbo", note: "Anche Shift" },
              { keys: ["E", "↑"], label: "Usa Oggetto Tattico", note: "Anche W o X" },
              { keys: ["G"], label: "Apri Officina Auto", note: "Nel menu" },
              { keys: ["P"], label: "Pausa · R riprova", note: "In gara" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 rounded-lg border border-paper/10 bg-ink/45 px-3 py-2"
              >
                <div className="flex shrink-0 gap-1">
                  {row.keys.map((k) => (
                    <KeyCap key={k} wide={k.length > 1}>
                      {k}
                    </KeyCap>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-paper/85">{row.label}</p>
                  {row.note && (
                    <p className="text-[8px] uppercase tracking-[0.12em] text-paper/35">
                      {row.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.24em] text-oro">
            Oggetti in pista & Casse Scuderia
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              {
                badge: "★",
                color: "#e9b45c",
                title: "Gettone Coppa",
                desc: "+75×Combo punti, carica il turbo e arricchisce il bottino Officina.",
              },
              {
                badge: "⚡",
                color: "#ff8c3b",
                title: "Bombola Nitro",
                desc: "+48% riserva Turbo immediata e spinta istantanea senza consumo.",
              },
              {
                badge: "✚",
                color: "#68f2cc",
                title: "Scudo Corse",
                desc: "Cupola protettiva per 12s: assorbe un incidente o neutralizza l'olio.",
              },
              {
                badge: "U",
                color: "#e23e31",
                title: "Calamita & Pit-Stop",
                desc: "La calamita attira i gettoni; la cassetta verde ripara +1 vita!",
              },
              {
                badge: "?",
                color: "#b78cff",
                title: "Cassa Tattica (Premi E)",
                desc: "Sblocca Onda d'Urto EMP, Crono-Guida 2× o Furia Tricolore!",
              },
              {
                badge: "▲",
                color: "#ff6d33",
                title: "Macchia d'Olio",
                desc: "Fai attenzione al birillo: se ci passi sopra sbandi! Sfiorala per punti bonus.",
              },
            ].map((it) => (
              <div
                key={it.title}
                className="flex items-start gap-2.5 rounded-xl border border-paper/10 bg-paper/[0.03] p-2.5"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black text-ink"
                  style={{ backgroundColor: it.color }}
                >
                  {it.badge}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-paper/90">{it.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-paper/55">{it.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <PrimaryButton onClick={onClose} className="mt-4 w-full">
            <CarGlyph className="h-4 w-4" /> Torna in pista
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- classifica */

export function ScoresOverlay({
  globalScores,
  localScores,
  online,
  loading,
  highlightId,
  onRefresh,
  onClose,
  onClearLocal,
}: {
  globalScores: ScoreEntry[];
  localScores: ScoreEntry[];
  online: boolean;
  loading: boolean;
  highlightId?: string;
  onRefresh: () => void;
  onClose: () => void;
  onClearLocal: () => void;
}) {
  const [tab, setTab] = useState<"global" | "local">("global");
  const [confirming, setConfirming] = useState(false);

  const activeScores =
    tab === "global" ? (globalScores.length ? globalScores : localScores) : localScores;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-[3px]">
      <div className="anim-pop w-full max-w-[500px] overflow-hidden rounded-2xl bg-paper text-ink shadow-2xl">
        <div className="tricolore h-1.5 w-full" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Eyebrow className="text-ink/45">
                Coppa Costiera · {tab === "global" ? "Albo d'Oro Mondiale" : "Archivio Locale"}
              </Eyebrow>
              <h2 className="mt-1 font-display text-[32px] leading-none text-ink">CLASSIFICA</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-ink/55">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    online ? "bg-verde" : "bg-oro"
                  )}
                />
                {tab === "global"
                  ? online
                    ? "Connessa in tempo reale a Supabase"
                    : "Modalità offline · mostrata classifica locale"
                  : "I tuoi migliori giri salvati su questo dispositivo"}
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

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex rounded-lg border border-ink/15 bg-ink/5 p-0.5">
              <button
                type="button"
                onClick={() => setTab("global")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors",
                  tab === "global" ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
                )}
              >
                Mondiale (Supabase)
              </button>
              <button
                type="button"
                onClick={() => setTab("local")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors",
                  tab === "local" ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
                )}
              >
                Locale
              </button>
            </div>
            {tab === "global" && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-ink/65 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40"
              >
                {loading ? "Aggiorno..." : "Aggiorna"}
              </button>
            )}
          </div>

          <div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl border border-ink/10 bg-[#ebe2d0]/70 p-1">
            <ScoreTable
              scores={activeScores}
              highlightId={highlightId}
              limit={12}
              dark
              loading={loading}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            {tab === "local" ? (
              <button
                type="button"
                onClick={() => {
                  if (confirming) {
                    onClearLocal();
                    setConfirming(false);
                  } else {
                    setConfirming(true);
                  }
                }}
                className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.16em] transition-colors",
                  confirming ? "text-rosso" : "text-ink/40 hover:text-ink/75"
                )}
              >
                {confirming ? "Confermi? Azzera locale" : "Azzera archivio locale"}
              </button>
            ) : (
              <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                Top piloti Coppa Costiera
              </span>
            )}
            <DarkButton onClick={onClose} className="py-2.5 text-[10px]">
              Chiudi
            </DarkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
