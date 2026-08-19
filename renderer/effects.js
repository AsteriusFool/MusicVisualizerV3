'use strict';
import * as THREE from './lib/three.module.js';
import { vertexShader, fragmentShader } from './shaders/effects.glsl.js';

const COUNT = 420;

export class AmbientEffects {
  constructor(scene, freqTex) {
    this._scene = scene;
    this._burst = 0;
    this._lastEvent = 0;
    this._nextEvent = 1.5 + Math.random() * 3.0;

    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.4 + Math.random() * 4.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));

    this._material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
        uEnergy: { value: 0 },
        uFreqTex: { value: freqTex },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._points = new THREE.Points(geometry, this._material);
    this._points.frustumCulled = false;
    scene.add(this._points);
  }

  setTheme(colorA, colorB) {
    this._material.uniforms.uColorA.value.setRGB(...colorA);
    this._material.uniforms.uColorB.value.setRGB(...colorB);
  }

  setVisible(visible) {
    this._points.visible = visible;
  }

  update(time, energy, beat) {
    if (beat || (energy > 0.12 && time - this._lastEvent > this._nextEvent)) {
      this._burst = 1;
      this._lastEvent = time;
      this._nextEvent = 2.0 + Math.random() * 4.0;
    }

    this._burst *= 0.91;
    this._material.uniforms.uTime.value = time;
    this._material.uniforms.uBurst.value = this._burst;
    this._material.uniforms.uEnergy.value = energy;
    this._points.rotation.y = time * 0.018;
  }

  dispose() {
    this._scene.remove(this._points);
    this._points.geometry.dispose();
    this._material.dispose();
  }
}
