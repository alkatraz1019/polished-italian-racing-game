/**
 * Motore audio sintetizzato: nessun file esterno, nessun ritardo di caricamento.
 * Il rombo segue la velocità; gli effetti accompagnano sorpassi, oggetti e traguardi.
 */

export type SoundEffect =
  | "overtake"
  | "nearmiss"
  | "crash"
  | "turbo"
  | "ui"
  | "start"
  | "record"
  | "lost"
  | "coin"
  | "powerup"
  | "emp"
  | "crono"
  | "oil"
  | "shield_hit"
  | "lap";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private running = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  isMuted() {
    return this.muted;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* audio non disponibile */
    }
  }

  startEngine() {
    this.unlock();
    if (!this.ctx || !this.master || this.running) return;
    const ctx = this.ctx;
    try {
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 480;
      this.engineFilter.Q.value = 4.5;

      this.oscA = ctx.createOscillator();
      this.oscA.type = "sawtooth";
      this.oscA.frequency.value = 62;
      this.oscB = ctx.createOscillator();
      this.oscB.type = "square";
      this.oscB.frequency.value = 93;

      const subGain = ctx.createGain();
      subGain.gain.value = 0.35;
      this.oscA.connect(this.engineFilter);
      this.oscB.connect(subGain);
      subGain.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.oscA.start();
      this.oscB.start();
      this.engineGain.gain.setTargetAtTime(0.075, ctx.currentTime, 0.4);

      const buffer = this.createNoiseBuffer(2);
      this.noiseSource = ctx.createBufferSource();
      this.noiseSource.buffer = buffer;
      this.noiseSource.loop = true;
      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = "bandpass";
      this.noiseFilter.frequency.value = 900;
      this.noiseFilter.Q.value = 0.7;
      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.value = 0.008;
      this.noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.master);
      this.noiseSource.start();

      this.running = true;
    } catch {
      this.running = false;
    }
  }

  updateEngine(speedPct: number, boost: boolean, offroad: boolean, crono = false) {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    const p = Math.max(0, Math.min(1.4, speedPct)) * (crono ? 0.86 : 1);
    try {
      this.oscA?.frequency.setTargetAtTime(52 + p * 132 + (boost ? 28 : 0), t, 0.07);
      this.oscB?.frequency.setTargetAtTime(74 + p * 188 + (boost ? 42 : 0), t, 0.07);
      this.engineFilter?.frequency.setTargetAtTime(
        360 + p * 1150 + (boost ? 440 : 0),
        t,
        0.08
      );
      this.engineGain?.gain.setTargetAtTime(0.055 + p * 0.04, t, 0.12);
      this.noiseFilter?.frequency.setTargetAtTime(
        (offroad ? 520 : 820) + p * 1400,
        t,
        0.09
      );
      this.noiseGain?.gain.setTargetAtTime(
        (offroad ? 0.05 : 0.01) + p * (offroad ? 0.055 : 0.022),
        t,
        0.1
      );
    } catch {
      /* noop */
    }
  }

  stopEngine() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      this.engineGain?.gain.setTargetAtTime(0, t, 0.15);
      this.noiseGain?.gain.setTargetAtTime(0, t, 0.15);
      this.oscA?.stop(t + 0.5);
      this.oscB?.stop(t + 0.5);
      this.noiseSource?.stop(t + 0.5);
    } catch {
      /* noop */
    }
    this.running = false;
    this.oscA = null;
    this.oscB = null;
    this.noiseSource = null;
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.55 + last * 3.2;
    }
    return buffer;
  }

  private noiseBurst(opts: {
    duration: number;
    gain: number;
    from: number;
    to: number;
    type?: BiquadFilterType;
    q?: number;
    delay?: number;
  }) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer(Math.max(0.2, opts.duration + 0.1));
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? "bandpass";
    filter.Q.value = opts.q ?? 1.2;
    filter.frequency.setValueAtTime(opts.from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), t0 + opts.duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
    source.stop(t0 + opts.duration + 0.06);
  }

  private tone(
    freq: number,
    duration: number,
    gainVal = 0.12,
    type: OscillatorType = "sine",
    slideTo?: number,
    delay = 0
  ) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  play(name: SoundEffect) {
    if (!this.ctx || this.muted) return;
    try {
      switch (name) {
        case "overtake":
          this.noiseBurst({ duration: 0.3, gain: 0.15, from: 700, to: 2600 });
          this.tone(520, 0.16, 0.05, "triangle", 880);
          break;
        case "nearmiss":
          this.noiseBurst({ duration: 0.38, gain: 0.22, from: 1600, to: 320, q: 2.2 });
          this.tone(880, 0.22, 0.06, "triangle", 1320);
          this.tone(1320, 0.3, 0.045, "sine", 660);
          break;
        case "crash":
          this.noiseBurst({ duration: 0.55, gain: 0.34, from: 1400, to: 90, type: "lowpass", q: 0.8 });
          this.tone(120, 0.5, 0.3, "sine", 38);
          this.tone(64, 0.7, 0.22, "triangle", 30);
          break;
        case "turbo":
          this.noiseBurst({ duration: 0.62, gain: 0.19, from: 400, to: 3400 });
          this.tone(180, 0.48, 0.07, "sawtooth", 620);
          break;
        case "coin":
          this.tone(988, 0.09, 0.065, "triangle");
          this.tone(1319, 0.18, 0.07, "sine", undefined, 0.055);
          break;
        case "powerup":
          this.tone(523, 0.11, 0.07, "triangle", undefined, 0);
          this.tone(659, 0.11, 0.07, "triangle", undefined, 0.065);
          this.tone(784, 0.14, 0.075, "triangle", undefined, 0.13);
          this.tone(1046, 0.25, 0.08, "sine", undefined, 0.2);
          break;
        case "emp":
          this.noiseBurst({ duration: 0.55, gain: 0.28, from: 2600, to: 140, q: 1.6 });
          this.tone(240, 0.55, 0.18, "sawtooth", 48);
          this.tone(960, 0.28, 0.08, "sine", 1920);
          break;
        case "crono":
          this.tone(1046, 0.45, 0.08, "sine", 392);
          this.tone(784, 0.45, 0.06, "triangle", 294, 0.06);
          break;
        case "oil":
          this.noiseBurst({ duration: 0.52, gain: 0.2, from: 1950, to: 1180, q: 6.5 });
          this.tone(360, 0.32, 0.06, "sawtooth", 190);
          break;
        case "shield_hit":
          this.noiseBurst({ duration: 0.28, gain: 0.2, from: 2400, to: 800, q: 2.5 });
          this.tone(1320, 0.24, 0.09, "triangle", 660);
          this.tone(880, 0.3, 0.07, "sine", 1760);
          break;
        case "lap":
          [523, 659, 784, 1046].forEach((f, i) => {
            this.tone(f, 0.2, 0.085, "square", undefined, i * 0.09);
          });
          break;
        case "ui":
          this.tone(660, 0.07, 0.05, "triangle", 780);
          break;
        case "start":
          this.tone(392, 0.13, 0.085, "square", undefined, 0);
          this.tone(523, 0.13, 0.085, "square", undefined, 0.11);
          this.tone(784, 0.34, 0.1, "square", undefined, 0.22);
          break;
        case "record":
          [523, 659, 784, 1046, 1319].forEach((f, i) => {
            this.tone(f, 0.26, 0.08, "triangle", undefined, i * 0.1);
          });
          break;
        case "lost":
          this.tone(392, 0.22, 0.09, "square", 330, 0);
          this.tone(262, 0.42, 0.09, "square", 185, 0.18);
          break;
      }
    } catch {
      /* noop */
    }
  }

  dispose() {
    this.stopEngine();
    try {
      void this.ctx?.close();
    } catch {
      /* noop */
    }
    this.ctx = null;
    this.master = null;
  }
}
