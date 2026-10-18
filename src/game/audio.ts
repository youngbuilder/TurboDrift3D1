/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private driftNoiseNode: AudioNode | null = null;
  private driftGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private isInitialized: boolean = false;
  private musicInterval: any = null;
  private musicStep: number = 0;

  constructor() {}

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.setupEngineSound();
      this.setupDriftSound();
      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngineSound() {
    if (!this.ctx) return;
    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
    } catch (e) {
      console.warn('Engine sound setup failed', e);
    }
  }

  private setupDriftSound() {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);

      whiteNoise.connect(bandpass);
      bandpass.connect(this.driftGain);
      this.driftGain.connect(this.ctx.destination);

      whiteNoise.start();
      this.driftNoiseNode = whiteNoise;
    } catch (e) {
      console.warn('Drift sound setup failed', e);
    }
  }

  public updateEngine(speedKmh: number, isAccelerating: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || this.isMuted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      return;
    }

    const normSpeed = Math.min(1, Math.max(0, speedKmh / 220));
    const targetFreq = 40 + normSpeed * 110 + (isAccelerating ? 25 : 0);
    const filterFreq = 180 + normSpeed * 750 + (isAccelerating ? 200 : 0);
    const targetVolume = this.isMuted ? 0 : 0.08 + normSpeed * 0.12;

    const t = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 0.5, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);
    this.engineGain.gain.setTargetAtTime(targetVolume, t, 0.05);
  }

  public updateDrift(isDrifting: boolean, intensity: number = 1.0) {
    if (!this.ctx || !this.driftGain || this.isMuted) return;
    const targetVol = isDrifting ? Math.min(0.2, 0.05 + intensity * 0.15) : 0;
    this.driftGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.04);
  }

  public playBoost() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.4);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (_) {}
  }

  public playCountdown(isFinal: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.7 : 0.3));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.7 : 0.3));
    } catch (_) {}
  }

  public playItemBoxCollect() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (_) {}
  }

  public playRocketLaunch() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.35);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) {}
  }

  public playSpinout() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (_) {}
  }

  public playLapChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [587.33, 880, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } catch (_) {}
  }

  public playVictoryFanfare() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, d: 0.15 },
        { f: 659.25, d: 0.15 },
        { f: 783.99, d: 0.15 },
        { f: 1046.5, d: 0.4 },
      ];
      let offset = 0;
      notes.forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + offset);
        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + note.d);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + offset);
        osc.stop(now + offset + note.d);
        offset += note.d * 0.8;
      });
    } catch (_) {}
  }

  public startMusic() {
    if (this.musicInterval) return;
    this.musicStep = 0;
    const bassline = [130.81, 130.81, 155.56, 174.61, 130.81, 130.81, 196.0, 174.61];
    const leadNotes = [523.25, 0, 622.25, 523.25, 698.46, 0, 783.99, 622.25, 932.33, 783.99, 698.46, 0, 622.25, 523.25, 0, 392.0];

    this.musicInterval = setInterval(() => {
      if (!this.ctx || this.isMusicMuted || this.isMuted) return;
      try {
        const now = this.ctx.currentTime;
        const bFreq = bassline[this.musicStep % bassline.length];
        const lFreq = leadNotes[this.musicStep % leadNotes.length];

        if (this.musicStep % 2 === 0) {
          const bOsc = this.ctx.createOscillator();
          const bGain = this.ctx.createGain();
          bOsc.type = 'sawtooth';
          bOsc.frequency.setValueAtTime(bFreq, now);
          bOsc.frequency.exponentialRampToValueAtTime(bFreq * 0.6, now + 0.15);
          bGain.gain.setValueAtTime(0.06, now);
          bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          bOsc.connect(bGain);
          bGain.connect(this.ctx.destination);
          bOsc.start(now);
          bOsc.stop(now + 0.15);
        }

        if (lFreq > 0) {
          const lOsc = this.ctx.createOscillator();
          const lGain = this.ctx.createGain();
          lOsc.type = 'sine';
          lOsc.frequency.setValueAtTime(lFreq, now);
          lGain.gain.setValueAtTime(0.04, now);
          lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          lOsc.connect(lGain);
          lGain.connect(this.ctx.destination);
          lOsc.start(now);
          lOsc.stop(now + 0.14);
        }

        this.musicStep++;
      } catch (_) {}
    }, 140);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.engineGain) {
      this.engineGain.gain.value = 0;
    }
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    return this.isMusicMuted;
  }

  public isSoundMuted() {
    return this.isMuted;
  }

  public isMusicDisabled() {
    return this.isMusicMuted;
  }
}

export const sound = new SoundEngine();
