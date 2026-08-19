export const vertexShader = /* glsl */`
  attribute vec3 aSeed;

  uniform float uTime;
  uniform float uBurst;
  uniform float uEnergy;

  varying float vSeed;
  varying float vBurst;

  void main() {
    vec3 pos = position;
    float phase = uTime * (0.7 + aSeed.x * 1.8) + aSeed.y * 6.2832;
    float drift = sin(phase) * 0.35 + cos(phase * 0.63) * 0.2;
    pos.x += drift * (0.4 + aSeed.z);
    pos.y += cos(phase * 0.8) * 0.22;

    float radial = length(pos.xy);
    pos.xy *= 1.0 + uBurst * (0.3 + aSeed.x * 0.9);
    pos.z += uBurst * (aSeed.y - 0.5) * 2.4;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = clamp((0.8 + aSeed.z * 1.8 + uBurst * 2.0 + uEnergy) * (150.0 / -mvPos.z), 1.0, 5.0);
    vSeed = aSeed.x;
    vBurst = uBurst * (0.45 + aSeed.y * 0.55);
  }
`;

export const fragmentShader = /* glsl */`
  varying float vSeed;
  varying float vBurst;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uEnergy;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float shape = dot(uv, uv);
    if (shape > 1.0) discard;

    vec3 color = mix(uColorA, uColorB, vSeed);
    float glow = 0.35 + uEnergy * 0.8 + vBurst * 2.0;
    float alpha = (0.08 + vBurst * 0.5 + uEnergy * 0.12) * (1.0 - smoothstep(0.5, 1.0, shape));
    gl_FragColor = vec4(color * glow, alpha);
  }
`;
