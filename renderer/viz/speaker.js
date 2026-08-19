'use strict';
import * as THREE from '../lib/three.module.js';
import { vertexShader, fragmentShader } from '../shaders/speaker.glsl.js';
import { vertexShader as orbVertexShader, fragmentShader as orbFragmentShader } from '../shaders/orb.glsl.js';

const RINGS = 50;
const SEGMENTS = 32;
const DEPTH = 36.0;
const RING_STEP = DEPTH / (RINGS - 1);
const EDGE_COUNT = RINGS * SEGMENTS + (RINGS - 1) * SEGMENTS;

export class SpeakerViz {
  constructor(scene, freqTex) {
    this._scene = scene;
    this._motionTime = 0;
    this._lastTime = 0;
    this._speedEnergy = 0;
    const positions = new Float32Array(EDGE_COUNT * 2 * 3);
    const ringIndices = new Float32Array(EDGE_COUNT * 2);
    const segmentIndices = new Float32Array(EDGE_COUNT * 2);
    let edge = 0;

    const addEdge = (a, b, ring, segment) => {
      const offset = edge * 6;
      positions[offset] = a.x;
      positions[offset + 1] = a.y;
      positions[offset + 2] = a.z;
      positions[offset + 3] = b.x;
      positions[offset + 4] = b.y;
      positions[offset + 5] = b.z;
      ringIndices[edge * 2] = ringIndices[edge * 2 + 1] = ring / (RINGS - 1);
      segmentIndices[edge * 2] = segmentIndices[edge * 2 + 1] = segment / SEGMENTS;
      edge++;
    };

    for (let ring = 0; ring < RINGS; ring++) {
      const z = -ring * RING_STEP;
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const nextSegment = (segment + 1) % SEGMENTS;
        addEdge(this._point(segment, ring, z), this._point(nextSegment, ring, z), ring, segment);
        if (ring < RINGS - 1) {
          addEdge(this._point(segment, ring, z), this._point(segment, ring + 1, z - RING_STEP), ring, segment);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRingIndex', new THREE.BufferAttribute(ringIndices, 1));
    geometry.setAttribute('aSegmentIndex', new THREE.BufferAttribute(segmentIndices, 1));

    this._material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFreqTex: { value: freqTex },
        uTime: { value: 0 },
        uTravel: { value: 0 },
        uEnergy: { value: 0 },
        uBeat: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    this._lines = new THREE.LineSegments(geometry, this._material);
    this._lines.frustumCulled = false;
    scene.add(this._lines);
    this._core = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 32, 24),
      new THREE.ShaderMaterial({
        vertexShader: orbVertexShader,
        fragmentShader: orbFragmentShader,
        uniforms: {
          uFreqTex: { value: freqTex },
          uTime: { value: 0 },
          uEnergy: { value: 0 },
          uBeat: { value: 0 },
          uColorA: { value: new THREE.Color(0.15, 0.8, 1.0) },
          uColorB: { value: new THREE.Color(0.7, 0.1, 1.0) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this._core.position.set(0, 0, -7.5);
    scene.add(this._core);
  }

  _point(segment, ring, z) {
    const theta = segment / SEGMENTS * Math.PI * 2.0;
    const radius = 0.35 + (ring / (RINGS - 1)) * 4.1;
    return new THREE.Vector3(Math.sin(theta) * radius, Math.cos(theta) * radius, z);
  }

  setTheme(colorA, colorB) {
    this._core.material.uniforms.uColorA.value.setRGB(...colorA);
    this._core.material.uniforms.uColorB.value.setRGB(...colorB);
  }

  update(time, energy, beat) {
    const delta = this._lastTime ? Math.min(time - this._lastTime, 0.05) : 0.016;
    this._lastTime = time;
    const isPlaying = beat || energy > 0.01;
    this._speedEnergy += (energy - this._speedEnergy) * Math.min(delta * 5.0, 1.0);
    const animationSpeed = isPlaying ? 0.85 + this._speedEnergy * 1.1 : 0.12;
    const travelSpeed = isPlaying ? 0.75 + this._speedEnergy * 2.2 : 0.08;
    this._motionTime += delta * animationSpeed;
    this._material.uniforms.uTravel.value += delta * travelSpeed;
    this._material.uniforms.uTime.value = this._motionTime;
    this._material.uniforms.uEnergy.value = energy;
    this._material.uniforms.uBeat.value = beat ? 1.0 : 0.0;
    const pulse = 1.0 + this._speedEnergy * 0.8 + (beat ? 0.22 : 0);
    this._core.scale.setScalar(pulse);
    this._core.material.uniforms.uTime.value = this._motionTime;
    this._core.material.uniforms.uEnergy.value = energy;
    this._core.material.uniforms.uBeat.value = beat ? 1.0 : 0.0;
  }

  dispose() {
    this._scene.remove(this._lines);
    this._scene.remove(this._core);
    this._lines.geometry.dispose();
    this._material.dispose();
    this._core.geometry.dispose();
    this._core.material.dispose();
  }
}
