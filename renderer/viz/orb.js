'use strict';
import * as THREE from '../lib/three.module.js';
import { vertexShader, fragmentShader } from '../shaders/orb.glsl.js';

export class OrbViz {
  constructor(scene, freqTex) {
    this._scene = scene;

    const geo = new THREE.SphereGeometry(1.6, 96, 64);

    this._mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFreqTex: { value: freqTex },
        uTime:    { value: 0 },
        uEnergy:  { value: 0 },
        uBeat:    { value: 0 },
        uColorA:  { value: new THREE.Color() },
        uColorB:  { value: new THREE.Color() },
      },
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      transparent:  true,
      side:         THREE.FrontSide,
    });

    this._points = new THREE.Points(geo, this._mat);
    scene.add(this._points);
  }

  setTheme(colorA, colorB) {
    this._mat.uniforms.uColorA.value.setRGB(...colorA);
    this._mat.uniforms.uColorB.value.setRGB(...colorB);
  }

  update(time, energy, beat) {
    this._mat.uniforms.uTime.value   = time;
    this._mat.uniforms.uEnergy.value = energy;
    this._mat.uniforms.uBeat.value   = beat ? 1.0 : 0.0;
    this._points.rotation.y          = time * 0.12;
  }

  dispose() {
    this._scene.remove(this._points);
    this._points.geometry.dispose();
    this._mat.dispose();
  }
}
