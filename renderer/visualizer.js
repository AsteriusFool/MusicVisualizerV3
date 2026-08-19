'use strict';
import * as THREE from './lib/three.module.js';
import { BarsViz }      from './viz/bars.js';
import { OrbViz }       from './viz/orb.js';
import { ParticlesViz } from './viz/particles.js';
import { TunnelViz }    from './viz/tunnel.js';
import { AmbientEffects } from './effects.js';
import { RandomViz }     from './viz/random.js';
import { SpeakerViz }    from './viz/speaker.js';

/** Themes: [colorA, colorB] as normalised RGB triples. */
const THEMES = {
  neon:   { a: [0.45, 0.0, 1.0],  b: [0.0, 0.75, 1.0]  },
  fire:   { a: [1.0, 0.08, 0.0],  b: [1.0, 0.75, 0.0]  },
  ocean:  { a: [0.0, 0.12, 0.85], b: [0.0, 0.85, 0.65]  },
  aurora: { a: [0.0, 0.75, 0.25], b: [0.5, 0.0,  0.9]  },
  sunset: { a: [1.0, 0.08, 0.35], b: [1.0, 0.65, 0.05]  },
  ice:    { a: [0.15, 0.55, 1.0], b: [0.7, 0.95, 1.0]  },
  toxic:  { a: [0.55, 1.0, 0.0], b: [0.0, 0.95, 0.45]  },
  candy:  { a: [1.0, 0.15, 0.7], b: [0.35, 0.25, 1.0]  },
};

export class Visualizer {
  constructor(canvas) {
    this._canvas   = canvas;
    this._vizMode  = 'bars';
    this._theme    = 'neon';
    this._active   = null;

    // ── Renderer ──────────────────────────────────────────────────
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this._renderer.setClearColor(0x000000, 0);
    this._feedbackRead = new THREE.WebGLRenderTarget(1, 1);
    this._feedbackWrite = new THREE.WebGLRenderTarget(1, 1);
    this._postScene = new THREE.Scene();
    this._postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._postCamera.position.z = 1;
    this._postMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uCurrent;
        uniform sampler2D uPrevious;
        uniform vec2 uTexel;
        void main() {
          vec3 current = texture2D(uCurrent, vUv).rgb;
          vec3 previous = texture2D(uPrevious, vUv + vec2(-uTexel.x * 5.0, 0.0)).rgb;
          vec3 bloom = vec3(0.0);
          bloom += texture2D(uCurrent, vUv + uTexel * vec2(1.5, 0.0)).rgb;
          bloom += texture2D(uCurrent, vUv - uTexel * vec2(1.5, 0.0)).rgb;
          bloom += texture2D(uCurrent, vUv + uTexel * vec2(0.0, 1.5)).rgb;
          bloom += texture2D(uCurrent, vUv - uTexel * vec2(0.0, 1.5)).rgb;
          vec3 color = min(current * 1.4 + bloom * 0.42 + previous * 0.48, vec3(4.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uCurrent: { value: null },
        uPrevious: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
      },
      depthWrite: false,
      depthTest: false,
    });
    this._postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._postMaterial));

    // ── Scene & Camera ────────────────────────────────────────────
    this._scene  = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this._camera.position.set(0, 5, 8);
    this._camera.lookAt(0, 0, 0);

    // ── DataTexture — 256×1 RGBA carrying normalised FFT bins ─────
    this._freqData = new Uint8Array(256 * 4);
    this._freqTex  = new THREE.DataTexture(
      this._freqData, 256, 1,
      THREE.RGBAFormat, THREE.UnsignedByteType,
    );
    this._freqTex.needsUpdate = true;
    this._effects = new AmbientEffects(this._scene, this._freqTex);
    this._effects.setVisible(false);

    // ── Resize handling ───────────────────────────────────────────
    window.addEventListener('resize', () => this._onResize());
    this._onResize();

    // ── Build default visualisation ───────────────────────────────
    this._buildViz(this._vizMode);
  }

  // ── Public API ─────────────────────────────────────────────────

  setViz(mode) {
    if (mode === this._vizMode) return;
    this._vizMode = mode;
    this._buildViz(mode);
  }

  setTheme(name) {
    if (!THEMES[name]) return;
    this._theme = name;
    const t = THEMES[name];
    this._effects?.setTheme(t.a, t.b);
    this._active?.setTheme(t.a, t.b);
  }

  /**
   * Call once per frame with the latest analyser output.
   * @param {Float32Array} bins    256-element normalised frequency array.
   * @param {number}       energy  Mean energy 0–1.
   * @param {boolean}      beat    True on beat onset.
   */
  render(bins, energy, beat) {
    this._updateFreqTex(bins);

    const time = performance.now() * 0.001;
    if (this._vizMode === 'random') {
      this._effects?.update(time, energy, beat);
    }
    this._active?.update(time, energy, beat);

    if (this._vizMode === 'speaker') {
      this._renderer.setRenderTarget(this._feedbackWrite);
      this._renderer.clear();
      this._renderer.render(this._scene, this._camera);
      this._postMaterial.uniforms.uCurrent.value = this._feedbackWrite.texture;
      this._postMaterial.uniforms.uPrevious.value = this._feedbackRead.texture;
      this._renderer.setRenderTarget(null);
      this._renderer.render(this._postScene, this._postCamera);
      const previous = this._feedbackRead;
      this._feedbackRead = this._feedbackWrite;
      this._feedbackWrite = previous;
    } else {
      this._renderer.render(this._scene, this._camera);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────

  _buildViz(mode) {
    this._active?.dispose();

    const t = THEMES[this._theme];
    switch (mode) {
      case 'orb':
        this._active = new OrbViz(this._scene, this._freqTex);
        break;
      case 'particles':
        this._active = new ParticlesViz(this._scene, this._freqTex);
        break;
      case 'tunnel':
        this._active = new TunnelViz(this._scene, this._freqTex);
        break;
      case 'random':
        this._active = new RandomViz(this._scene, this._freqTex);
        break;
      case 'speaker':
        this._active = new SpeakerViz(this._scene, this._freqTex);
        break;
      default:
        this._active = new BarsViz(this._scene, this._freqTex);
        break;
    }
    this._effects.setVisible(mode === 'random');
    this._effects?.setTheme(t.a, t.b);
    this._active.setTheme(t.a, t.b);
    this._setCameraForMode(mode);
  }

  _setCameraForMode(mode) {
    if (mode === 'tunnel') {
      this._camera.position.set(0, 0.15, 1.1);
      this._camera.lookAt(0, 0, -4.5);
      return;
    }

    if (mode === 'random') {
      this._camera.position.set(0, 0, 10);
      this._camera.lookAt(0, 0, 0);
      return;
    }

    if (mode === 'speaker') {
      this._camera.position.set(0, 0, 0.1);
      this._camera.lookAt(0, 0, -8);
      this._scene.background = new THREE.Color(0x000000);
      this._resetFeedback();
      return;
    }

    this._scene.background = null;
    this._camera.position.set(0, 5, 8);
    this._camera.lookAt(0, 0, 0);
  }

  _resetFeedback() {
    this._renderer.setRenderTarget(this._feedbackRead);
    this._renderer.clear();
    this._renderer.setRenderTarget(this._feedbackWrite);
    this._renderer.clear();
    this._renderer.setRenderTarget(null);
  }

  _updateFreqTex(bins) {
    for (let i = 0; i < 256; i++) {
      const v = Math.floor(bins[i] * 255);
      const o = i * 4;
      this._freqData[o] = this._freqData[o + 1] = this._freqData[o + 2] = v;
      this._freqData[o + 3] = 255;
    }
    this._freqTex.needsUpdate = true;
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    const pixelRatio = Math.min(devicePixelRatio, 2);
    this._feedbackRead.setSize(w * pixelRatio, h * pixelRatio);
    this._feedbackWrite.setSize(w * pixelRatio, h * pixelRatio);
    this._postMaterial.uniforms.uTexel.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  }
}
