'use strict';

/**
 * Wraps the Web Audio AnalyserNode.
 * Outputs a 256-bin normalised frequency array and a beat flag each frame
 * using the Frédéric Patin energy-variance adaptive threshold algorithm.
 */

const FFT_SIZE      = 4096;
const OUT_BINS      = 256;
const SMOOTH        = 0.82;
const BEAT_WIN      = 43;  // ~1 s history at 60 fps

export class AudioAnalyzer {
  constructor() {
    this._ctx      = null;
    this._analyser = null;
    this._raw      = null;

    /** Normalised frequency bins, length OUT_BINS. Updated by update(). */
    this.bins   = new Float32Array(OUT_BINS);
    /** True when a beat onset is detected. */
    this.beat   = false;
    /** Mean energy across all bins, 0–1. */
    this.energy = 0;

    this._history = new Float32Array(BEAT_WIN);
    this._histIdx = 0;
  }

  get isConnected() { return this._ctx !== null; }

  /** Connect to a MediaStream. Replaces any previous connection. */
  connect(stream) {
    this.disconnect();
    this._ctx      = new AudioContext();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = FFT_SIZE;
    this._analyser.smoothingTimeConstant = SMOOTH;
    this._raw      = new Uint8Array(this._analyser.frequencyBinCount);
    this._ctx.createMediaStreamSource(stream).connect(this._analyser);
  }

  disconnect() {
    if (this._ctx) {
      this._ctx.close();
      this._ctx      = null;
      this._analyser = null;
      this._raw      = null;
    }
    this.bins.fill(0);
    this.beat   = false;
    this.energy = 0;
  }

  /**
   * Read latest FFT data and run beat detection.
   * Call once per animation frame.
   * @param {number} sensitivity  Amplitude multiplier (0.1 – 4.0).
   */
  update(sensitivity = 1.0) {
    if (!this._analyser) return;

    this._analyser.getByteFrequencyData(this._raw);

    const binStep = this._analyser.frequencyBinCount / OUT_BINS;
    let total = 0;

    for (let i = 0; i < OUT_BINS; i++) {
      const start = Math.floor(i * binStep);
      const end   = Math.floor((i + 1) * binStep);
      let sum = 0;
      for (let j = start; j < end; j++) sum += this._raw[j];
      const v = Math.min((sum / (end - start)) / 255 * sensitivity, 1.0);
      this.bins[i] = v;
      total += v;
    }

    this.energy = total / OUT_BINS;
    this._detectBeat();
  }

  _detectBeat() {
    const e = this.energy;
    this._history[this._histIdx] = e;
    this._histIdx = (this._histIdx + 1) % BEAT_WIN;

    let mean = 0;
    for (let i = 0; i < BEAT_WIN; i++) mean += this._history[i];
    mean /= BEAT_WIN;

    let variance = 0;
    for (let i = 0; i < BEAT_WIN; i++) {
      const d = this._history[i] - mean;
      variance += d * d;
    }
    variance /= BEAT_WIN;

    // Adaptive threshold coefficient (Patin 2002)
    const C = Math.max(1.3, -0.0025714 * variance + 1.5142857);
    this.beat = e > C * mean;
  }
}
