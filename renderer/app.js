'use strict';
/**
 * app.js — entry point.
 * Wires together: UI controls → audio capture → FFT analysis → Three.js visualizer.
 */

import { captureSystemAudio, captureMicrophone } from './audio-capture.js';
import { AudioAnalyzer }                          from './audio-analyzer.js';
import { Visualizer }                             from './visualizer.js';

// ── Initialise core objects ──────────────────────────────────────────────────
const canvas    = document.getElementById('canvas');
const analyzer  = new AudioAnalyzer();
const visualizer = new Visualizer(canvas);

// ── Status helpers ────────────────────────────────────────────────────────────
const statusEl  = document.getElementById('status');
const dotEl     = document.getElementById('status-dot');

function setStatus(msg, state = '') {
  statusEl.textContent = msg;
  dotEl.className = 'dot' + (state ? ' ' + state : '');
}

// ── Audio source controls ─────────────────────────────────────────────────────
document.getElementById('btn-system-audio').addEventListener('click', async () => {
  setStatus('Requesting system audio…');
  try {
    const stream = await captureSystemAudio();
    analyzer.connect(stream);
    setStatus('System audio', 'active');
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
    console.error('[app] captureSystemAudio failed:', err);
  }
});

document.getElementById('btn-mic').addEventListener('click', async () => {
  setStatus('Requesting microphone…');
  try {
    const stream = await captureMicrophone();
    analyzer.connect(stream);
    setStatus('Microphone', 'active');
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
    console.error('[app] captureMicrophone failed:', err);
  }
});

// ── Visualization and theme selectors ─────────────────────────────────────────
document.getElementById('viz-select').addEventListener('change', event => {
  visualizer.setViz(event.target.value);
});

document.getElementById('theme-select').addEventListener('change', event => {
  visualizer.setTheme(event.target.value);
});

// ── Sensitivity slider ────────────────────────────────────────────────────────
const sensitivityEl = document.getElementById('sensitivity');

// ── Electron window controls ──────────────────────────────────────────────────
if (window.electronAPI) {
  document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.windowMinimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.windowMaximize());
  document.getElementById('btn-close').addEventListener('click',    () => window.electronAPI.windowClose());
} else {
  // Running in a plain browser — hide the custom title bar
  document.getElementById('titlebar').style.display = 'none';
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'F11') {
    e.preventDefault();
    window.electronAPI?.windowFullscreenToggle();
  }
});

// ── Animation loop ─────────────────────────────────────────────────────────────
const EMPTY_BINS = new Float32Array(256);

function loop() {
  requestAnimationFrame(loop);

  const sensitivity = parseFloat(sensitivityEl.value);
  analyzer.update(sensitivity);

  const bins   = analyzer.isConnected ? analyzer.bins   : EMPTY_BINS;
  const energy = analyzer.isConnected ? analyzer.energy : 0;
  const beat   = analyzer.isConnected ? analyzer.beat   : false;

  visualizer.render(bins, energy, beat);
}

loop();
