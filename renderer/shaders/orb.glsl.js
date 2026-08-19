// GLSL shaders for the Orb visualisation.
// Vertex positions are displaced along the surface normal using 3-D simplex noise
// modulated by per-frequency energy sampled from the DataTexture.

export const vertexShader = /* glsl */`
  uniform sampler2D uFreqTex;
  uniform float     uTime;
  uniform float     uEnergy;
  uniform float     uBeat;

  varying vec3 vNormal;
  varying vec3 vPos;

  // ── Simplex noise (Stefan Gustavson / Ian McEwan, MIT licence) ────────────
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4  j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4  x_ = floor(j * ns.z);
    vec4  y_ = floor(j - 7.0 * x_);
    vec4  x  = x_ *ns.x + ns.yyyy;
    vec4  y  = y_ *ns.x + ns.yyyy;
    vec4  h  = 1.0 - abs(x) - abs(y);
    vec4  b0 = vec4(x.xy, y.xy);
    vec4  b1 = vec4(x.zw, y.zw);
    vec4 s0  = floor(b0)*2.0 + 1.0;
    vec4 s1  = floor(b1)*2.0 + 1.0;
    vec4 sh  = -step(h, vec4(0.0));
    vec4 a0  = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1  = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0  = vec3(a0.xy, h.x);
    vec3 p1  = vec3(a0.zw, h.y);
    vec3 p2  = vec3(a1.xy, h.z);
    vec3 p3  = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  // ─────────────────────────────────────────────────────────────────────────

  void main() {
    // Sample frequency at normalised sphere latitude
    float lat  = (normal.y * 0.5 + 0.5);
    float bandAmp = texture2D(uFreqTex, vec2(lat, 0.5)).r;
    float amp = max(uEnergy * 2.4, bandAmp * 0.45);

    // Multi-octave noise adds soft bubbles; the audio signal controls the main pulse.
    float n = snoise(normal * 1.8 + uTime * 0.25) * 0.18
            + snoise(normal * 3.2 - uTime * 0.35) * 0.08;

    float disp = max(amp * 1.25 + uEnergy * 0.35 + n, -0.08)
               * (1.0 + uBeat * 0.3);

    vec3 displaced = position + normal * disp * 0.5;

    vNormal = normalMatrix * normal;
    vPos    = displaced;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = clamp(1.35 * (170.0 / -gl_Position.w), 1.0, 3.0);
  }
`;

export const fragmentShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPos;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uEnergy;
  uniform float uBeat;

  void main() {
    vec3  n   = normalize(vNormal);
    vec2  uv  = gl_PointCoord * 2.0 - 1.0;
    float dotShape = dot(uv, uv);
    if (dotShape > 1.0) discard;

    float rim = pow(1.0 - abs(n.z), 2.0);
    float latitude = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
    vec3  col = mix(uColorB, uColorA, latitude);
    float brightness = 0.3 + rim * 2.8 + uEnergy * 0.8 + uBeat * 0.35;
    float alpha = 0.2 + rim * 0.8;
    col *= brightness;
    gl_FragColor = vec4(col, alpha);
  }
`;
