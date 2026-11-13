import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VeloceGame } from "./game/engine";
import type { GameSummary, HudState, Phase, ScoreEntry } from "./game/types";
import {
  clearScores,
  loadMuted,
  loadPilotName,
  loadScores,
  personalBest,
  personalBestEntry,
  saveMuted,
  savePilotName,
  saveRun,
} from "./game/storage";
import { Hud } from "./components/Hud";
import { TouchControls } from "./components/TouchControls";
import {
  GameOverOverlay,
  HelpOverlay,
  PauseOverlay,
  ScoresOverlay,
  StartOverlay,
} from "./components/Overlays";
import { CarGlyph, KeyCap, ScoreTable, Trophy, Tricolore } from "./components/ui";
import { cn } from "./utils/cn";

const INITIAL_HUD: HudState = {
  score: 0,
  speedKmh: 0,
  gear: 1,
  combo: 1,
  comboProgress: 0,
  lives: 3,
  turbo: 55,
  distanceKm: 0,
  boost: false,
  offroad: false,
  elapsed: 0,
};

const fmt = (n: number) => Math.round(n).toLocaleString("it-IT");

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VeloceGame | null>(null);
  const [phase, setPhase] = useState<Phase>("attract");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [pilot, setPilot] = useState<string>(() => loadPilotName());
  const [muted, setMuted] = useState<boolean>(() => loadMuted());
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [result, setResult] = useState<{ entryId?: string; rank: number; isRecord: boolean }>({
    rank: 0,
    isRecord: false,
  });
  const [overlay, setOverlay] = useState<"help" | "scores" | null>(null);

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const pilotRef = useRef(pilot);
  pilotRef.current = pilot;

  const best = useMemo(() => personalBest(scores), [scores]);
  const bestRun = useMemo(() => personalBestEntry(scores), [scores]);

  /* -------------------------------------------------------------- motore */

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new VeloceGame(canvasRef.current, {
      onHud: (next) => setHud(next),
      onGameOver: (summaryNext) => {
        const saved = saveRun(summaryNext);
        setScores(saved.scores);
        setResult({
          entryId: saved.entry?.id,
          rank: saved.rank,
          isRecord: saved.isRecord,
        });
        setSummary(summaryNext);
        setPhase("over");
        if (saved.isRecord) {
          game.burstConfetti();
          game.audio.play("record");
        }
      },
    });
    engineRef.current = game;
    game.setMuted(loadMuted());
    return () => {
      game.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
    saveMuted(muted);
  }, [muted]);

  useEffect(() => {
    savePilotName(pilot);
  }, [pilot]);

  /* -------------------------------------------------------------- azioni */

  const startGame = useCallback(() => {
    savePilotName(pilotRef.current);
    setSummary(null);
    setResult({ rank: 0, isRecord: false });
    setHud(INITIAL_HUD);
    setOverlay(null);
    engineRef.current?.start();
    setPhase("playing");
  }, []);

  const resumeGame = useCallback(() => {
    engineRef.current?.resume();
    setPhase("playing");
    setOverlay(null);
  }, []);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") {
      if (phaseRef.current === "paused") resumeGame();
      return;
    }
    engineRef.current?.pause();
    setPhase("paused");
  }, [resumeGame]);

  const goMenu = useCallback(() => {
    engineRef.current?.toMenu();
    setPhase("attract");
    setSummary(null);
    setOverlay(null);
  }, []);

  const toggleMute = useCallback(() => setMuted((v) => !v), []);

  const openOverlay = useCallback((which: "help" | "scores") => {
    if (phaseRef.current === "playing") {
      engineRef.current?.pause();
      setPhase("paused");
    }
    setOverlay(which);
  }, []);

  /* ------------------------------------------------------------- tastiera */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "m") {
        setMuted((v) => !v);
        return;
      }
      if (overlay) {
        if (k === "escape") setOverlay(null);
        return;
      }
      if (phase === "paused" && k === "enter") {
        e.preventDefault();
        resumeGame();
        return;
      }
      if ((phase === "attract" || phase === "over") && (k === "enter" || k === " ")) {
        e.preventDefault();
        startGame();
        return;
      }
      if (k === "escape" || k === "p") {
        e.preventDefault();
        pauseGame();
        return;
      }
      if (k === "r") {
        e.preventDefault();
        if (phase !== "attract") startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, overlay, pauseGame, resumeGame, startGame]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") {
        engineRef.current?.pause();
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const touchSteer = useCallback((steer: number) => engineRef.current?.setInput({ steer }), []);
  const touchBrake = useCallback((brake: boolean) => engineRef.current?.setInput({ brake }), []);
  const touchTurbo = useCallback((turbo: boolean) => engineRef.current?.setInput({ turbo }), []);

  const stats = useMemo(
    () => ({
      runs: scores.filter((s) => !s.legend).length,
      best,
    }),
    [scores, best]
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-ink text-paper">
      {/* atmosfera */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-verde/10 blur-[130px]" />
        <div className="absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-rosso/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[620px] rounded-full bg-oro/[0.05] blur-[120px]" />
        <div className="grain absolute inset-0 opacity-[0.035]" />
      </div>

      {/* intestazione */}
      <header className="relative z-10 border-b border-paper/10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-[3px]">
              <span className="h-[7px] w-[7px] rounded-[1px] bg-verde" />
              <span className="h-[7px] w-[7px] rounded-[1px] bg-paper" />
              <span className="h-[7px] w-[7px] rounded-[1px] bg-rosso" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[24px] leading-none tracking-[0.03em] text-paper sm:text-[28px]">
                  VELOCE
                </span>
                <span className="hidden font-editorial text-[15px] leading-none text-oro/80 sm:block">e furioso</span>
              </div>
              <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.3em] text-paper/40 sm:text-[8px]">
                Gran Premio Italiano · Costiera
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: "Gara", action: () => (phase === "attract" ? startGame() : pauseGame()), active: phase === "playing" },
              { label: "Classifica", action: () => openOverlay("scores"), active: overlay === "scores" },
              { label: "Comandi", action: () => openOverlay("help"), active: overlay === "help" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={cn(
                  "rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-colors",
                  item.active ? "bg-paper/10 text-paper" : "text-paper/45 hover:bg-paper/[0.06] hover:text-paper/80"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-paper/12 bg-ink/50 px-3 py-1.5 sm:flex">
              <Trophy className="h-3.5 w-3.5 text-oro/80" />
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-paper/40">Record</p>
                <p className="font-display text-[15px] leading-none tabular text-paper">
                  {best > 0 ? fmt(best) : "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Attiva audio" : "Silenzia audio"}
              title={muted ? "Attiva audio (M)" : "Silenzia audio (M)"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-paper/15 bg-ink/50 text-paper/65 transition-colors hover:border-paper/30 hover:text-paper active:scale-95"
            >
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
            </button>
            <div className="hidden items-center gap-1.5 rounded-lg border border-paper/12 px-2.5 py-1.5 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-oro" />
              <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-paper/45">Circolo dal 1924</span>
            </div>
          </div>
        </div>
        <div className="checker h-[3px] w-full opacity-[0.12]" />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-3 pb-10 pt-3 sm:px-5 sm:pt-4 lg:px-8">
        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_318px] xl:gap-5">
          {/* ---------------------------------------------------------- scena */}
          <section className="min-w-0">
            <div className="relative h-[calc(100svh-188px)] min-h-[430px] overflow-hidden rounded-[22px] border border-paper/12 bg-coal shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] lg:h-[calc(100svh-138px)] lg:max-h-[900px] lg:min-h-[580px]">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-label="Pista da corsa Veloce — gran premio italiano"
              />
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[22px] ring-1 ring-inset ring-paper/10" />
              {phase === "playing" && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-ink/45 to-transparent" />
              )}

              {phase !== "attract" && (
                <Hud
                  hud={hud}
                  best={best}
                  paused={phase === "paused"}
                  muted={muted}
                  onPause={pauseGame}
                  onToggleMute={toggleMute}
                  showHints
                />
              )}

              {phase === "attract" && overlay === null && (
                <StartOverlay
                  best={best}
                  pilot={pilot}
                  onPilotChange={setPilot}
                  onStart={startGame}
                  onHelp={() => openOverlay("help")}
                  onScores={() => openOverlay("scores")}
                />
              )}

              {phase === "playing" && (
                <TouchControls
                  onSteer={touchSteer}
                  onBrake={touchBrake}
                  onTurbo={touchTurbo}
                  boost={hud.boost}
                />
              )}

              {phase === "paused" && (
                <PauseOverlay
                  hud={hud}
                  muted={muted}
                  onResume={resumeGame}
                  onRestart={startGame}
                  onMenu={goMenu}
                  onToggleMute={toggleMute}
                />
              )}

              {phase === "over" && summary && (
                <GameOverOverlay
                  summary={summary}
                  scores={scores}
                  entryId={result.entryId}
                  rank={result.rank}
                  isRecord={result.isRecord}
                  best={best}
                  onRestart={startGame}
                  onMenu={goMenu}
                  onScores={() => setOverlay("scores")}
                />
              )}

              {overlay === "help" && <HelpOverlay onClose={() => setOverlay(null)} />}
              {overlay === "scores" && (
                <ScoresOverlay
                  scores={scores}
                  onClose={() => setOverlay(null)}
                  onClear={() => {
                    setScores(clearScores());
                    setResult({ rank: 0, isRecord: false });
                  }}
                />
              )}
            </div>

            {/* barra di servizio sotto la pista */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-paper/35">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-verde" /> Sorpassa pulito
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-paper/60" /> Sfiora per il missile
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rosso" /> Tre vite, zero freni
                </span>
              </div>
              <div className="hidden items-center gap-2 text-[8px] uppercase tracking-[0.16em] text-paper/30 sm:flex">
                <KeyCap>Invio</KeyCap> via <span className="opacity-40">·</span>
                <KeyCap>P</KeyCap> pausa
                <span className="opacity-40">·</span>
                <KeyCap>R</KeyCap> riprova
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- rail */}
          <aside className="flex min-w-0 flex-col gap-3.5">
            {/* record */}
            <div className="overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
              <div className="tricolore h-[3px] w-full" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/40">
                      Il tuo record
                    </p>
                    <p className="font-display mt-1 text-[38px] leading-none tabular text-ink">
                      {best > 0 ? fmt(best) : "—"}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink/60">
                    <Trophy className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-ink/10 pt-2.5">
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-ink/40">Pilota</p>
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                      {bestRun?.name ?? pilot}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-ink/40">Distanza</p>
                    <p className="text-[11px] font-bold tabular text-ink">
                      {bestRun ? `${bestRun.distanceKm.toFixed(1)} km` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-ink/40">Vel. max</p>
                    <p className="text-[11px] font-bold tabular text-ink">
                      {bestRun ? `${bestRun.topSpeedKmh} km/h` : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-ink/35">
                  <CarGlyph className="h-3 w-3" /> {stats.runs} giri registrati su questo dispositivo
                </p>
              </div>
            </div>

            {/* classifica */}
            <div className="overflow-hidden rounded-2xl border border-paper/12 bg-coal/80 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between border-b border-paper/10 px-4 py-2.5">
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.24em] text-paper/35">Circolo veloce</p>
                  <h2 className="font-display mt-0.5 text-[17px] leading-none text-paper">CLASSIFICA</h2>
                </div>
                <span className="rounded-sm border border-paper/15 px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.16em] text-paper/40">
                  locale
                </span>
              </div>
              <div className="px-1.5 py-1.5">
                <ScoreTable scores={scores} limit={5} />
              </div>
              <button
                type="button"
                onClick={() => openOverlay("scores")}
                className="flex w-full items-center justify-between border-t border-paper/10 px-4 py-2.5 text-[8px] font-bold uppercase tracking-[0.18em] text-paper/40 transition-colors hover:bg-paper/[0.04] hover:text-paper/80"
              >
                Tutta la classifica
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* comandi */}
            <div className="rounded-2xl border border-paper/12 bg-coal/80 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.24em] text-paper/35">Manuale</p>
                  <h2 className="font-display mt-0.5 text-[17px] leading-none text-paper">COMANDI</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openOverlay("help")}
                  aria-label="Apri il manuale dei comandi"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-paper/15 text-[11px] font-bold text-paper/50 transition-colors hover:border-paper/30 hover:text-paper"
                >
                  ?
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { keys: ["←", "→"], label: "Sterzo" },
                  { keys: ["↓"], label: "Freno" },
                  { keys: ["SPAZIO"], label: "Turbo" },
                  { keys: ["P"], label: "Pausa" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-md bg-paper/[0.035] px-2.5 py-1.5">
                    <div className="flex gap-1">
                      {row.keys.map((k) => (
                        <KeyCap key={k} wide={k.length > 1}>{k}</KeyCap>
                      ))}
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-paper/45">
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-oro/20 bg-oro/[0.06] px-2.5 py-2">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-oro/80" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                  <path d="M11 18.5h2" strokeLinecap="round" />
                </svg>
                <p className="text-[9px] leading-relaxed text-paper/50">
                  Su telefono: tieni premuto a sinistra per sterzare, a destra freno e turbo.
                </p>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-paper/10 px-4 py-3 xl:block">
              <div className="flex items-center justify-between">
                <p className="font-editorial text-[15px] text-paper/50">«Chi frena, perde.»</p>
                <Tricolore className="h-[2px] w-10" />
              </div>
              <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-paper/25">
                Detto popolare del circolo veloce
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-paper/10 pt-4 text-[8px] uppercase tracking-[0.18em] text-paper/25 sm:flex-row">
          <p>VELOCE · un gioco di corsa italiano</p>
          <div className="flex items-center gap-3">
            <span>60 fps</span>
            <span className="h-1 w-1 rounded-full bg-paper/20" />
            <span>Nessun pilota è stato maltrattato</span>
            <span className="tricolore h-2 w-5 rounded-[1px]" />
          </div>
        </footer>
      </main>
    </div>
  );
}
