// GLSL shaders for the Particles visualisation.
// 8 000 points arranged on a torus; each particle pulsates along its base normal
// according to its assigned frequency band sampled from the DataTexture.

export const vertexShader = /* glsl */`
  attribute float aFreqIndex;   // normalised 0–1, unique per particle
  attribute vec3  aBasePos;     // rest position on the torus surface

  uniform sampler2D uFreqTex;
  uniform float     uTime;
  uniform float     uEnergy;
  uniform float     uBeat;

  varying float vAmp;
  varying float vFreqIndex;

  void main() {
    float amp   = texture2D(uFreqTex, vec2(aFreqIndex + 0.001953125, 0.5)).r;

    // Displacement uses the same amp+energy that drives brightness — glow and bounce are always in sync
    vec3 dir    = normalize(aBasePos);
    vec3 pos    = aBasePos + dir * (amp * 2.8 + uEnergy * 1.0 + uBeat * 0.3)
                           + dir * sin(uTime * 2.4 + aFreqIndex * 6.2832)  * 0.12
                           + dir * sin(uTime * 5.0 + aFreqIndex * 12.5664) * amp * 0.07;

    vAmp       = amp;
    vFreqIndex = aFreqIndex;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position  = projectionMatrix * mvPos;
    gl_PointSize = clamp((1.25 + amp * 2.0) * (200.0 / -mvPos.z), 1.0, 5.0);
  }
`;

export const fragmentShader = /* glsl */`
  varying float vAmp;
  varying float vFreqIndex;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uEnergy;

  void main() {
    // Keep the particle body crisp while retaining a thin anti-aliased edge.
    vec2  uv   = gl_PointCoord * 2.0 - 1.0;
    float dist = dot(uv, uv);
    if (dist > 1.0) discard;

    float alpha = (1.0 - smoothstep(0.72, 1.0, dist)) * (0.65 + vAmp * 0.35);
    vec3  col   = mix(uColorA, uColorB, vFreqIndex);
    col        *= 0.6 + uEnergy * 1.8;

    gl_FragColor = vec4(col, alpha);
  }
`;
