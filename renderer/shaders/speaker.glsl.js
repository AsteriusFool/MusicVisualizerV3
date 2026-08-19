export const vertexShader = /* glsl */`
  attribute float aRingIndex;
  attribute float aSegmentIndex;

  uniform float uTime;
  uniform float uTravel;
  uniform float uEnergy;
  uniform float uBeat;

  varying float vRing;
  varying float vSegment;
  varying float vEnergy;

  void main() {
    float depth = mod(position.z + uTravel, 36.0);
    float ring = clamp(depth / 36.0, 0.0, 1.0);
    float offsetX = sin(uTime + depth * 0.72) * (0.22 + uEnergy * 0.45);
    float offsetY = cos(uTime + depth * 0.72) * (0.16 + uEnergy * 0.32);
    float radius = 0.35 + ring * 4.1;

    vec3 pos = position;
    vec2 radial = normalize(pos.xy + vec2(0.0001));
    pos.xy = radial * radius;
    pos.x += offsetX;
    pos.y += offsetY;
    pos.z = -depth;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    vRing = ring;
    vSegment = aSegmentIndex;
    vEnergy = uEnergy + uBeat * 0.25;
  }
`;

export const fragmentShader = /* glsl */`
  varying float vRing;
  varying float vSegment;
  varying float vEnergy;

  void main() {
    vec3 green = vec3(0.0, 1.0, 0.12);
    vec3 cyan = vec3(0.0, 0.95, 1.0);
    vec3 magenta = vec3(1.0, 0.0, 0.7);
    float phase = fract(vRing * 0.72 + vSegment * 0.32);
    vec3 color = mix(green, cyan, smoothstep(0.08, 0.42, phase));
    color = mix(color, magenta, smoothstep(0.42, 0.88, phase));
    float brightness = 0.9 + vEnergy * 1.2;
    gl_FragColor = vec4(color * brightness, 0.88);
  }
`;
