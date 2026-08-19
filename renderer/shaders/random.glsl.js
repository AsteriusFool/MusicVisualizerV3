export const vertexShader = /* glsl */`
  attribute vec4 aSeed;

  uniform sampler2D uFreqTex;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uBeat;

  varying float vEnergy;
  varying float vPattern;

  vec2 shapePoint(float kind, vec4 seed) {
    float angle = seed.x * 6.2832;
    float radius = sqrt(seed.y);

    // 0: Disk
    if (kind < 0.5) {
      return vec2(cos(angle), sin(angle)) * radius * 4.0;
    }
    // 1: Rectangle
    if (kind < 1.5) {
      return (seed.xy - 0.5) * vec2(7.6, 5.8);
    }
    // 2: Triangle
    if (kind < 2.5) {
      float height = seed.y * 5.8 - 2.9;
      float width = max(0.08, (height + 2.9) / 5.8 * 7.0);
      return vec2((seed.x - 0.5) * width, height);
    }
    // 3: Diamond
    if (kind < 3.5) {
      vec2 direction = vec2(cos(angle), sin(angle));
      float diamondScale = max(abs(direction.x), abs(direction.y));
      return direction / diamondScale * radius * 4.1;
    }
    // 4: Star (5-point)
    if (kind < 4.5) {
      float starRadius = 2.15 + cos(angle * 5.0) * 1.55;
      return vec2(cos(angle), sin(angle)) * radius * starRadius;
    }
    // 5: Galaxy spiral (2 arms)
    if (kind < 5.5) {
      float arm = step(0.5, seed.z) * 3.14159;
      float r = radius * 4.2;
      float t = seed.x * 6.2832 + r * 0.9 + arm;
      return vec2(cos(t), sin(t)) * r;
    }
    // 6: Polar rose (6 petals)
    if (kind < 6.5) {
      float r = abs(cos(angle * 3.0));
      return vec2(cos(angle), sin(angle)) * r * radius * 4.5;
    }
    // 7: Hexagon
    if (kind < 7.5) {
      float sector = floor(seed.x * 6.0);
      float a1 = sector * 1.0472;
      float a2 = a1 + 1.0472;
      vec2 p1 = vec2(cos(a1), sin(a1)) * 3.8;
      vec2 p2 = vec2(cos(a2), sin(a2)) * 3.8;
      return mix(mix(p1, p2, fract(seed.x * 6.0)), vec2(0.0), seed.z * 0.7);
    }
    // 8: Cross
    if (kind < 8.5) {
      float isVert = step(0.5, seed.z);
      float along = (seed.x - 0.5) * 7.5;
      float perp  = (seed.y - 0.5) * 1.5;
      return isVert > 0.5 ? vec2(perp, along) : vec2(along, perp);
    }
    // 9: Heart
    float ht = seed.x * 6.2832;
    float sint = sin(ht);
    float hx =  16.0 * sint * sint * sint;
    float hy = -(13.0 * cos(ht) - 5.0 * cos(2.0*ht) - 2.0 * cos(3.0*ht) - cos(4.0*ht));
    return vec2(hx, hy) * (0.13 + seed.y * 0.10);
  }

  void main() {
    float amp = texture2D(uFreqTex, vec2(aSeed.x, 0.5)).r;
    // Morph briefly between formations, then hold the finished shape.
    float shapePhase = mod(uTime * 0.08, 10.0);
    float shapeKind = floor(shapePhase);
    float morph = smoothstep(0.0, 0.18, fract(shapePhase));
    float previousKind = mod(shapeKind + 9.0, 10.0);
    vec2 formed = mix(
      shapePoint(previousKind, aSeed),
      shapePoint(shapeKind, aSeed),
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
