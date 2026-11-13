/**
 * Motore audio sintetizzato: nessun file esterno, nessun ritardo di caricamento.
 * Il rombo segue la velocità; gli effetti aggiungono il "juice" alle azioni.
 */
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

  /** Deve essere chiamato da un gesto dell'utente. */
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

      // rotolamento / vento
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

  updateEngine(speedPct: number, boost: boolean, offroad: boolean) {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    const p = Math.max(0, Math.min(1.3, speedPct));
    try {
      this.oscA?.frequency.setTargetAtTime(52 + p * 132 + (boost ? 26 : 0), t, 0.07);
      this.oscB?.frequency.setTargetAtTime(74 + p * 188 + (boost ? 40 : 0), t, 0.07);
      this.engineFilter?.frequency.setTargetAtTime(
        360 + p * 1150 + (boost ? 420 : 0),
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

  private tone(freq: number, duration: number, gainVal = 0.12, type: OscillatorType = "sine", slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
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

  play(name: "overtake" | "nearmiss" | "crash" | "turbo" | "ui" | "start" | "record" | "lost") {
    if (!this.ctx || this.muted) return;
    try {
      switch (name) {
        case "overtake":
          this.noiseBurst({ duration: 0.32, gain: 0.16, from: 700, to: 2600 });
          this.tone(520, 0.16, 0.05, "triangle", 880);
          break;
        case "nearmiss":
          this.noiseBurst({ duration: 0.4, gain: 0.24, from: 1600, to: 320, q: 2.2 });
          this.tone(880, 0.22, 0.06, "triangle", 1320);
          this.tone(1320, 0.3, 0.045, "sine", 660);
          break;
        case "crash":
          this.noiseBurst({ duration: 0.55, gain: 0.34, from: 1400, to: 90, type: "lowpass", q: 0.8 });
          this.tone(120, 0.5, 0.3, "sine", 38);
          this.tone(64, 0.7, 0.22, "triangle", 30);
          break;
        case "turbo":
          this.noiseBurst({ duration: 0.65, gain: 0.2, from: 400, to: 3400 });
          this.tone(180, 0.5, 0.07, "sawtooth", 620);
          break;
        case "ui":
          this.tone(660, 0.07, 0.05, "triangle", 780);
          break;
        case "start":
          this.tone(392, 0.14, 0.09, "square");
          this.tone(523, 0.14, 0.09, "square");
          this.tone(784, 0.34, 0.1, "square");
          break;
        case "record":
          [523, 659, 784, 1046].forEach((f, i) => {
            window.setTimeout(() => this.tone(f, 0.26, 0.08, "triangle"), i * 110);
          });
          break;
        case "lost":
          this.tone(392, 0.22, 0.09, "square", 330);
          window.setTimeout(() => this.tone(262, 0.4, 0.09, "square", 196), 180);
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
