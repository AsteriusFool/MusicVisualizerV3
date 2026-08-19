'use strict';
import * as THREE from '../lib/three.module.js';
import { vertexShader, fragmentShader } from '../shaders/bars.glsl.js';

const BAR_COUNT = 128;
const INNER_R   = 2.2;
const MAX_H     = 5.0;

export class BarsViz {
  constructor(scene, freqTex) {
    this._scene = scene;

    // Geometry: BoxGeometry pivoted at its base (translate Y so bottom is at origin)
    const geo = new THREE.BoxGeometry(0.12, 1, 0.12);
    geo.translate(0, 0.5, 0);

    // Per-instance frequency index attribute (normalised 0→1 across 256 bins)
    const freqIndices = new Float32Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      freqIndices[i] = i / 256; // map 128 bars to first half of the 256-bin texture
    }
    geo.setAttribute('aFreqIndex', new THREE.InstancedBufferAttribute(freqIndices, 1));

    this._mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFreqTex: { value: freqTex },
        uMaxH:    { value: MAX_H },
        uBeat:    { value: 0 },
        uColorA:  { value: new THREE.Color() },
        uColorB:  { value: new THREE.Color() },
      },
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      transparent:  true,
    });

    this._mesh = new THREE.InstancedMesh(geo, this._mat, BAR_COUNT);
    this._mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); // matrices are fixed

    // Pre-compute the ring layout — positions never change at runtime
    const dummy = new THREE.Object3D();
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * INNER_R, 0, Math.sin(angle) * INNER_R);
      dummy.rotation.y = -angle;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this._mesh.setMatrixAt(i, dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;

    scene.add(this._mesh);
  }

  setTheme(colorA, colorB) {
    this._mat.uniforms.uColorA.value.setRGB(...colorA);
    this._mat.uniforms.uColorB.value.setRGB(...colorB);
  }

  update(time, energy, beat) {
    this._mesh.rotation.y = time * 0.35;
    this._mat.uniforms.uBeat.value = beat ? 1.0 : 0.0;
  }

  dispose() {
    this._scene.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._mat.dispose();
  }
}
