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
    float pulse = amp * (1.0 + uBeat * 0.4);

    // Drift slightly along the radius direction
    vec3 dir    = normalize(aBasePos);
    vec3 pos    = aBasePos + dir * pulse * 1.8
                           + dir * sin(uTime * 1.2 + aFreqIndex * 6.2832) * 0.08;

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
