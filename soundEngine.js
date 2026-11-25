/**
 * soundEngine.js
 * Synthesizes realistic electrical laboratory audio using the Web Audio API:
 * - HV step-up transformer 50 Hz / 100 Hz hum proportional to applied voltage
 * - Pre-breakdown corona hiss above 75% stress ratio
 * - Capacitive electric arc spark discharge snap on oil breakdown
 * - Relay contactor click for Start / Stop / Reset actions
 */

(function (global) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.humActive = false;

      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humGain = null;
      this.coronaNode = null;
      this.coronaGain = null;
    }

    /**
     * Ensures AudioContext is initialized and resumed after a user gesture.
     */
    _ensureContext() {
      if (this.muted) return null;
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    isMuted() {
      return this.muted;
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.muted) {
        this.stopHum();
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    /**
     * Plays a crisp HV contactor / switch click.
     */
    playRelayClick(highPitch = true) {
      if (this.muted) return;
      const ctx = this._ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(highPitch ? 420 : 260, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.045);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    }

    /**
     * Plays a soft step tick when incrementing voltage manually.
     */
    playStepTick() {
      if (this.muted) return;
      const ctx = this._ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.025);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }

    /**
     * Starts continuous transformer hum + subtle corona noise layer.
     */
    startHum() {
      if (this.muted || this.humActive) return;
      const ctx = this._ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      this.humGain = ctx.createGain();
      this.humGain.gain.setValueAtTime(0.008, now);

      this.humOsc1 = ctx.createOscillator();
      this.humOsc1.type = 'sawtooth';
      this.humOsc1.frequency.setValueAtTime(50, now);

      this.humOsc2 = ctx.createOscillator();
      this.humOsc2.type = 'sine';
      this.humOsc2.frequency.setValueAtTime(100, now);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(240, now);

      this.humOsc1.connect(lowpass);
      this.humOsc2.connect(lowpass);
      lowpass.connect(this.humGain);
      this.humGain.connect(ctx.destination);

      // Subtle corona fizz buffer for high electric stress
      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * (Math.random() > 0.92 ? 1.0 : 0.15);
      }

      this.coronaNode = ctx.createBufferSource();
      this.coronaNode.buffer = noiseBuffer;
      this.coronaNode.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(3400, now);
      bandpass.Q.setValueAtTime(1.8, now);

      this.coronaGain = ctx.createGain();
      this.coronaGain.gain.setValueAtTime(0.0, now);

      this.coronaNode.connect(bandpass);
      bandpass.connect(this.coronaGain);
      this.coronaGain.connect(ctx.destination);

      this.humOsc1.start(now);
      this.humOsc2.start(now);
      this.coronaNode.start(now);
      this.humActive = true;
    }

    /**
     * Modulates transformer hum & corona crackle based on live voltage & stress ratio.
     * @param {number} voltageKv
     * @param {number} stressRatio
     */
    updateVoltage(voltageKv, stressRatio) {
      if (this.muted || !this.humActive || !this.ctx) return;

      const now = this.ctx.currentTime;
      const vNorm = Math.min(1, Math.max(0, voltageKv / 90));
      const targetHum = 0.012 + vNorm * 0.055;
      this.humGain.gain.setTargetAtTime(targetHum, now, 0.08);

      const coronaLevel = stressRatio > 0.72 ? Math.min(0.06, (stressRatio - 0.72) * 0.18) : 0;
      this.coronaGain.gain.setTargetAtTime(coronaLevel, now, 0.06);
    }

    /**
     * Stops transformer hum cleanly.
     */
    stopHum() {
      if (!this.humActive) return;
      try {
        if (this.ctx && this.humGain) {
          const now = this.ctx.currentTime;
          this.humGain.gain.setTargetAtTime(0.0001, now, 0.04);
          if (this.coronaGain) {
            this.coronaGain.gain.setTargetAtTime(0.0001, now, 0.03);
          }
        }
        const osc1 = this.humOsc1;
        const osc2 = this.humOsc2;
        const corona = this.coronaNode;
        setTimeout(() => {
          try { if (osc1) osc1.stop(); } catch (_) {}
          try { if (osc2) osc2.stop(); } catch (_) {}
          try { if (corona) corona.stop(); } catch (_) {}
        }, 120);
      } catch (_) {
        // Ignore cleanup errors
      }
      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humGain = null;
      this.coronaNode = null;
      this.coronaGain = null;
      this.humActive = false;
    }

    /**
     * Plays a high-voltage electric spark breakdown snap & brief resonant thump.
     */
    playBreakdownSpark() {
      if (this.muted) return;
      const ctx = this._ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Sharp capacitive discharge noise burst
      const duration = 0.28;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.exp(-i / (ctx.sampleRate * 0.045));
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(900, now);

      const sparkGain = ctx.createGain();
      sparkGain.gain.setValueAtTime(0.42, now);
      sparkGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(highpass);
      highpass.connect(sparkGain);
      sparkGain.connect(ctx.destination);
      noise.start(now);

      // 2. Low-frequency acoustic shock inside oil vessel
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(160, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(42, now + 0.16);

      thumpGain.gain.setValueAtTime(0.28, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.19);
    }
  }

  global.SoundEngine = SoundEngine;
})(window);
