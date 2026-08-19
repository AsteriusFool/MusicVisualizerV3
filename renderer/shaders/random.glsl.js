export const vertexShader = /* glsl */`
  attribute vec4 aSeed;

  uniform sampler2D uFreqTex;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uBeat;

  varying float vEnergy;
  varying float vPattern;

  vec2 shapePoint(float kind, vec2 seed) {
    float angle = seed.x * 6.2832;
    float radius = sqrt(seed.y);

    if (kind < 0.5) {
      return vec2(cos(angle), sin(angle)) * radius * 4.0;
    }
    if (kind < 1.5) {
      return (seed - 0.5) * vec2(7.6, 5.8);
    }
    if (kind < 2.5) {
      float height = seed.y * 5.8 - 2.9;
      float width = max(0.08, (height + 2.9) / 5.8 * 7.0);
      return vec2((seed.x - 0.5) * width, height);
    }
    if (kind < 3.5) {
      vec2 direction = vec2(cos(angle), sin(angle));
      float diamondScale = max(abs(direction.x), abs(direction.y));
      return direction / diamondScale * radius * 4.1;
    }

    float starRadius = 2.15 + cos(angle * 5.0) * 1.55;
    return vec2(cos(angle), sin(angle)) * radius * starRadius;
  }

  void main() {
    float amp = texture2D(uFreqTex, vec2(aSeed.x, 0.5)).r;
    // Morph briefly between formations, then hold the finished shape.
    float shapePhase = mod(uTime * 0.08, 5.0);
    float shapeKind = floor(shapePhase);
    float morph = smoothstep(0.0, 0.18, fract(shapePhase));
    float previousKind = mod(shapeKind + 4.0, 5.0);
    vec2 formed = mix(
      shapePoint(previousKind, aSeed.xy),
      shapePoint(shapeKind, aSeed.xy),
      morph
    );
    vec3 pos = vec3(formed, position.z * 0.22 + (aSeed.z - 0.5) * 1.2);
    float twist = 0.0;
    mat2 turn = mat2(cos(twist), -sin(twist), sin(twist), cos(twist));

    pos.xy = turn * pos.xy;
    float bounce = sin(uTime * 2.4) * 0.045;
    float particleBounce = sin(uTime * 3.2 + aSeed.w * 6.2832) * 0.018;
    pos.xy *= 1.08 + bounce + particleBounce + amp * 0.02 + uBeat * 0.04;
    pos.z += bounce * 0.35 + particleBounce * 0.2;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = clamp((1.0 + amp * 2.4 + uEnergy + uBeat * 1.4) * (170.0 / -mvPos.z), 1.0, 5.0);
    vEnergy = amp + uEnergy;
    vPattern = clamp(aSeed.x * 0.7 + amp * 0.5, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */`
  varying float vEnergy;
  varying float vPattern;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uBeat;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float shape = dot(uv, uv);
    if (shape > 1.0) discard;

    vec3 color = mix(uColorA, uColorB, vPattern);
    color = mix(color, vec3(1.0), clamp(uBeat * 0.35 + vEnergy * 0.12, 0.0, 0.5));
    float alpha = (0.2 + vEnergy * 0.42) * (1.0 - smoothstep(0.55, 1.0, shape));
    gl_FragColor = vec4(color * (0.7 + vEnergy * 1.2), alpha);
  }
`;
