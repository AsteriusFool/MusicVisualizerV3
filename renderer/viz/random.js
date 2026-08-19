'use strict';
import * as THREE from '../lib/three.module.js';
import { vertexShader, fragmentShader } from '../shaders/random.glsl.js';

const COUNT = 9000;

export class RandomViz {
  constructor(scene, freqTex) {
    this._scene = scene;
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 4);

    for (let i = 0; i < COUNT; i++) {
      const index = i * 3;
      const seedIndex = i * 4;
      const longitude = Math.random() * Math.PI * 2;
      const latitude = Math.acos(1 - Math.random() * 2);
      const radius = (0.35 + Math.pow(Math.random(), 0.72) * 4.7);
      positions[index] = Math.sin(latitude) * Math.cos(longitude) * radius;
      positions[index + 1] = Math.cos(latitude) * radius * 0.9;
      positions[index + 2] = Math.sin(latitude) * Math.sin(longitude) * radius * 0.82;
      seeds[seedIndex] = Math.random();
      seeds[seedIndex + 1] = Math.random();
      seeds[seedIndex + 2] = Math.random();
      seeds[seedIndex + 3] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

    this._material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFreqTex: { value: freqTex },
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uBeat: { value: 0 },
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

  update(time, energy, beat) {
    this._material.uniforms.uTime.value = time;
    this._material.uniforms.uEnergy.value = energy;
    this._material.uniforms.uBeat.value = beat ? 1.0 : 0.0;
    this._points.rotation.z = time * 0.08;
  }

  dispose() {
    this._scene.remove(this._points);
    this._points.geometry.dispose();
    this._material.dispose();
  }
}
