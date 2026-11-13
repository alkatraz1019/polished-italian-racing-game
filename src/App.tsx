import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarPreviewCanvas, GarageOverlay } from "./components/GarageOverlay";
import { Hud } from "./components/Hud";
import {
  GameOverOverlay,
  HelpOverlay,
  PauseOverlay,
  ScoresOverlay,
  StartOverlay,
} from "./components/Overlays";
import { TouchControls } from "./components/TouchControls";
import {
  CarGlyph,
  KeyCap,
  ScoreTable,
  Tricolore,
  Trophy,
  WrenchGlyph,
} from "./components/ui";
import { MilleCurveGame } from "./game/engine";
import {
  getChassisSpec,
  getPaintSpec,
  loadCarConfig,
  saveCarConfig,
} from "./game/garage";
import {
  clearScores,
  loadMuted,
  loadPilotName,
  loadScores,
  loadWalletCoins,
  personalBest,
  personalBestEntry,
  saveMuted,
  savePilotName,
  saveRun,
} from "./game/storage";
import { fetchGlobalLeaderboard, submitGlobalScore } from "./game/supabase";
import type { CarConfig, GameSummary, HudState, Phase, ScoreEntry } from "./game/types";
import { cn } from "./utils/cn";

const INITIAL_HUD: HudState = {
  score: 0,
  speedKmh: 0,
  gear: 1,
  combo: 1,
  comboProgress: 0,
  lives: 3,
  maxLives: 3,
  turbo: 60,
  distanceKm: 0,
  lap: 1,
  boost: false,
  offroad: false,
  elapsed: 0,
  coins: 0,
  heldGadget: null,
  effects: {
    shield: 0,
    magnet: 0,
    crono: 0,
    overboost: 0,
    slip: false,
  },
};

const fmt = (n: number) => Math.round(n).toLocaleString("it-IT");

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MilleCurveGame | null>(null);

  const [phase, setPhase] = useState<Phase>("attract");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [localScores, setLocalScores] = useState<ScoreEntry[]>(() => loadScores());
  const [globalScores, setGlobalScores] = useState<ScoreEntry[]>([]);
  const [online, setOnline] = useState<boolean>(false);
  const [loadingGlobal, setLoadingGlobal] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "offline">("offline");

  const [pilot, setPilot] = useState<string>(() => loadPilotName());
  const [carConfig, setCarConfig] = useState<CarConfig>(() => loadCarConfig());
  const [walletCoins, setWalletCoins] = useState<number>(() => loadWalletCoins());
  const [muted, setMuted] = useState<boolean>(() => loadMuted());
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [result, setResult] = useState<{ entryId?: string; rank: number; isRecord: boolean }>({
    rank: 0,
    isRecord: false,
  });
  const [overlay, setOverlay] = useState<"help" | "scores" | "garage" | null>(null);

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const pilotRef = useRef(pilot);
  pilotRef.current = pilot;
  const carConfigRef = useRef(carConfig);
  carConfigRef.current = carConfig;

  const best = useMemo(() => personalBest(localScores), [localScores]);
  const bestRun = useMemo(() => personalBestEntry(localScores), [localScores]);

  /* ------------------------------------------------- classifica supabase */

  const refreshGlobal = useCallback(async () => {
    setLoadingGlobal(true);
    const res = await fetchGlobalLeaderboard(25);
    if (res.online && res.entries.length > 0) {
      setGlobalScores(res.entries);
      setOnline(true);
    } else if (res.online) {
      setOnline(true);
    } else {
      setOnline(false);
    }
    setLoadingGlobal(false);
  }, []);

  useEffect(() => {
    void refreshGlobal();
  }, [refreshGlobal]);

  /* -------------------------------------------------------------- motore */

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new MilleCurveGame(
      canvasRef.current,
      {
        onHud: (next) => setHud(next),
        onGameOver: (summaryNext) => {
          savePilotName(pilotRef.current);
          const currentCar = carConfigRef.current;
          const saved = saveRun(summaryNext, currentCar);
          setLocalScores(saved.scores);
          setWalletCoins(loadWalletCoins());
          setResult({
            entryId: saved.entry?.id,
            rank: saved.rank,
            isRecord: saved.isRecord,
          });
          setSummary(summaryNext);
          setPhase("over");
          setSyncState("syncing");

          if (saved.isRecord) {
            game.burstConfetti();
            game.audio.play("record");
          }

          // Invio punteggio a Supabase per la classifica globale
          void submitGlobalScore({
            pilotName: pilotRef.current,
            summary: summaryNext,
            car: currentCar,
          }).then((remote) => {
            if (remote.online && remote.entries.length > 0) {
              setGlobalScores(remote.entries);
              setOnline(true);
              setSyncState("synced");
              setResult((prev) => ({
                entryId: remote.entry?.id ?? prev.entryId,
                rank: remote.rank > 0 ? remote.rank : prev.rank,
                isRecord: prev.isRecord || remote.rank === 1,
              }));
            } else {
              setSyncState("offline");
            }
          });
        },
      },
      carConfigRef.current
    );
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

  const handleCarChange = useCallback((next: CarConfig) => {
    setCarConfig(next);
    saveCarConfig(next);
    engineRef.current?.setCarConfig(next);
    engineRef.current?.audio.unlock();
    engineRef.current?.audio.play("ui");
  }, []);

  /* -------------------------------------------------------------- azioni */

  const startGame = useCallback(() => {
    savePilotName(pilotRef.current);
    setSummary(null);
    setResult({ rank: 0, isRecord: false });
    setHud(INITIAL_HUD);
    setOverlay(null);
    engineRef.current?.setCarConfig(carConfigRef.current);
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

  const openOverlay = useCallback((which: "help" | "scores" | "garage") => {
    if (phaseRef.current === "playing") {
      engineRef.current?.pause();
      setPhase("paused");
    }
    if (which === "scores") {
      void refreshGlobal();
    }
    setOverlay(which);
  }, [refreshGlobal]);

  const useGadget = useCallback(() => {
    engineRef.current?.triggerGadget();
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
      if (k === "g" && phase !== "playing") {
        e.preventDefault();
        openOverlay("garage");
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
  }, [phase, overlay, openOverlay, pauseGame, resumeGame, startGame]);

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

  const activeChassis = useMemo(() => getChassisSpec(carConfig.chassis), [carConfig.chassis]);
  const activePaint = useMemo(() => getPaintSpec(carConfig.paint), [carConfig.paint]);
  const sidebarScores = globalScores.length > 0 ? globalScores : localScores;

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-ink text-paper">
      {/* Atmosfera */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-verde/10 blur-[130px]" />
        <div className="absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-rosso/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[620px] rounded-full bg-oro/[0.05] blur-[120px]" />
        <div className="grain absolute inset-0 opacity-[0.035]" />
      </div>

      {/* Intestazione */}
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
                  MILLE CURVE
                </span>
                <span className="hidden font-editorial text-[15px] leading-none text-oro/85 sm:block">
                  coppa costiera
                </span>
              </div>
              <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.28em] text-paper/40 sm:text-[8px]">
                Scuderia Italiana · Dal 1924
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              {
                label: "Gara",
                action: () => (phase === "attract" ? startGame() : pauseGame()),
                active: phase === "playing" && overlay === null,
              },
              {
                label: "Officina",
                action: () => openOverlay("garage"),
                active: overlay === "garage",
              },
              {
                label: "Classifica",
                action: () => openOverlay("scores"),
                active: overlay === "scores",
              },
              {
                label: "Oggetti & Comandi",
                action: () => openOverlay("help"),
                active: overlay === "help",
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={cn(
                  "rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-colors",
                  item.active
                    ? "bg-paper/12 text-paper"
                    : "text-paper/50 hover:bg-paper/[0.06] hover:text-paper/85"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openOverlay("garage")}
              className="flex items-center gap-2 rounded-lg border border-oro/25 bg-oro/[0.07] px-2.5 py-1.5 text-left transition-colors hover:border-oro/55 md:hidden"
            >
              <WrenchGlyph className="h-3.5 w-3.5 text-oro" />
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-paper/85">
                Officina
              </span>
            </button>

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

            <button
              type="button"
              onClick={() => openOverlay("scores")}
              className="hidden items-center gap-1.5 rounded-lg border border-paper/12 px-2.5 py-1.5 transition-colors hover:border-paper/30 lg:flex"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  online ? "bg-[#4ade80]" : "bg-oro"
                )}
              />
              <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-paper/55">
                {online ? "Supabase Live" : "Classifica"}
              </span>
            </button>
          </div>
        </div>
        <div className="checker h-[3px] w-full opacity-[0.12]" />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-3 pb-10 pt-3 sm:px-5 sm:pt-4 lg:px-8">
        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_324px] xl:gap-5">
          {/* ---------------------------------------------------------- scena */}
          <section className="min-w-0">
            <div className="relative h-[calc(100svh-188px)] min-h-[450px] overflow-hidden rounded-[22px] border border-paper/12 bg-coal shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] lg:h-[calc(100svh-138px)] lg:max-h-[900px] lg:min-h-[590px]">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-label="Circuito Mille Curve — Coppa della Costiera"
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
                  onUseGadget={useGadget}
                  showHints
                />
              )}

              {phase === "attract" && overlay === null && (
                <StartOverlay
                  best={best}
                  pilot={pilot}
                  carConfig={carConfig}
                  onlineReady={online}
                  onPilotChange={setPilot}
                  onStart={startGame}
                  onGarage={() => openOverlay("garage")}
                  onHelp={() => openOverlay("help")}
                  onScores={() => openOverlay("scores")}
                />
              )}

              {phase === "playing" && (
                <TouchControls
                  onSteer={touchSteer}
                  onBrake={touchBrake}
                  onTurbo={touchTurbo}
                  onUseGadget={useGadget}
                  heldGadget={hud.heldGadget}
                  boost={hud.boost}
                />
              )}

              {phase === "paused" && overlay === null && (
                <PauseOverlay
                  hud={hud}
                  muted={muted}
                  onResume={resumeGame}
                  onRestart={startGame}
                  onGarage={() => openOverlay("garage")}
                  onMenu={goMenu}
                  onToggleMute={toggleMute}
                />
              )}

              {phase === "over" && summary && overlay === null && (
                <GameOverOverlay
                  summary={summary}
                  globalScores={globalScores}
                  localScores={localScores}
                  entryId={result.entryId}
                  rank={result.rank}
                  isRecord={result.isRecord}
                  best={best}
                  syncState={syncState}
                  onRestart={startGame}
                  onGarage={() => openOverlay("garage")}
                  onMenu={goMenu}
                  onScores={() => openOverlay("scores")}
                />
              )}

              {overlay === "garage" && (
                <GarageOverlay
                  config={carConfig}
                  walletCoins={walletCoins}
                  onChange={handleCarChange}
                  onClose={() => setOverlay(null)}
                  onStartRace={phase !== "playing" ? startGame : undefined}
                />
              )}

              {overlay === "help" && <HelpOverlay onClose={() => setOverlay(null)} />}

              {overlay === "scores" && (
                <ScoresOverlay
                  globalScores={globalScores}
                  localScores={localScores}
                  online={online}
                  loading={loadingGlobal}
                  highlightId={result.entryId}
                  onRefresh={() => void refreshGlobal()}
                  onClose={() => setOverlay(null)}
                  onClearLocal={() => {
                    setLocalScores(clearScores());
                    setResult({ rank: 0, isRecord: false });
                  }}
                />
              )}
            </div>

            {/* Barra di servizio sotto la pista */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-paper/40">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-verde" /> Sorpassa & sfiora
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-oro" /> Raccogli ★, Scudi e Casse
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rosso" /> Evita le chiazze d'olio
                </span>
              </div>
              <div className="hidden items-center gap-2 text-[8px] uppercase tracking-[0.16em] text-paper/35 sm:flex">
                <KeyCap>E</KeyCap> oggetto <span className="opacity-40">·</span>
                <KeyCap>G</KeyCap> officina <span className="opacity-40">·</span>
                <KeyCap>P</KeyCap> pausa
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- rail */}
          <aside className="flex min-w-0 flex-col gap-3.5">
            {/* Card Officina Auto Personalizzata */}
            <div className="overflow-hidden rounded-2xl border border-paper/12 bg-coal/85 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)]">
              <div className="tricolore h-[3px] w-full" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-[0.24em] text-oro/80">
                      La tua vettura · #{carConfig.number}
                    </p>
                    <h2 className="font-display mt-0.5 text-[20px] leading-none text-paper">
                      {activeChassis.name.toUpperCase()}
                    </h2>
                  </div>
                  <span className="rounded-md border border-oro/30 bg-oro/10 px-2 py-0.5 text-[9px] font-bold tabular text-oro">
                    ★ {walletCoins}
                  </span>
                </div>

                <div className="my-2 rounded-xl border border-paper/10 bg-ink/55 px-3 py-1.5">
                  <div className="mx-auto max-w-[196px]">
                    <CarPreviewCanvas config={carConfig} showFlame />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-paper/55">
                  <span className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/25"
                      style={{ backgroundColor: activePaint.mid }}
                    />
                    {activePaint.name}
                  </span>
                  <span className="font-bold uppercase tracking-[0.14em] text-paper/40">
                    {carConfig.plate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openOverlay("garage")}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-oro/35 bg-oro/[0.09] py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-oro transition-colors hover:border-oro/65 hover:bg-oro/15"
                >
                  <WrenchGlyph className="h-3.5 w-3.5" />
                  Personalizza in Officina
                </button>
              </div>
            </div>

            {/* Classifica Mondiale Supabase */}
            <div className="overflow-hidden rounded-2xl border border-paper/12 bg-coal/85 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between border-b border-paper/10 px-4 py-2.5">
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.24em] text-paper/35">
                    Coppa Costiera
                  </p>
                  <h2 className="font-display mt-0.5 text-[17px] leading-none text-paper">
                    CLASSIFICA MONDIALE
                  </h2>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-sm border px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.15em]",
                    online
                      ? "border-verde/45 bg-verde/15 text-[#6ee7b7]"
                      : "border-paper/15 text-paper/45"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      online ? "bg-[#4ade80]" : "bg-oro"
                    )}
                  />
                  {online ? "supabase" : "locale"}
                </span>
              </div>
              <div className="px-1.5 py-1.5">
                <ScoreTable
                  scores={sidebarScores}
                  highlightId={result.entryId}
                  limit={5}
                  loading={loadingGlobal}
                />
              </div>
              <button
                type="button"
                onClick={() => openOverlay("scores")}
                className="flex w-full items-center justify-between border-t border-paper/10 px-4 py-2.5 text-[8px] font-bold uppercase tracking-[0.18em] text-paper/45 transition-colors hover:bg-paper/[0.04] hover:text-paper/85"
              >
                Vedi classifica completa
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Il tuo record */}
            <div className="overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-ink/40">
                      Record personale
                    </p>
                    <p className="font-display mt-0.5 text-[34px] leading-none tabular text-ink">
                      {best > 0 ? fmt(best) : "—"}
                    </p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/60">
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
              </div>
            </div>

            <div className="hidden rounded-2xl border border-paper/10 px-4 py-3 xl:block">
              <div className="flex items-center justify-between">
                <p className="font-editorial text-[15px] text-paper/50">
                  «Chi frena prima del tornante, arriva secondo.»
                </p>
                <Tricolore className="h-[2px] w-10" />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] text-paper/30">
                <CarGlyph className="h-3 w-3" /> Motto della Coppa Mille Curve
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-paper/10 pt-4 text-[8px] uppercase tracking-[0.18em] text-paper/30 sm:flex-row">
          <p>MILLE CURVE · Coppa della Costiera Italiana</p>
          <div className="flex items-center gap-3">
            <span>60 fps</span>
            <span className="h-1 w-1 rounded-full bg-paper/20" />
            <span>Officina & Classifica Supabase</span>
            <span className="tricolore h-2 w-5 rounded-[1px]" />
          </div>
        </footer>
      </main>
    </div>
  );
}
