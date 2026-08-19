// GLSL shaders for the Bars visualisation.
// Each of the 128 bar instances reads its amplitude from a 256×1 DataTexture.

export const vertexShader = /* glsl */`
  attribute float aFreqIndex;

  uniform sampler2D uFreqTex;
  uniform float     uMaxH;
  uniform float     uBeat;

  varying float vFreqIndex;
  varying float vHeight;

  void main() {
    float amp  = texture2D(uFreqTex, vec2(aFreqIndex + 0.001953125, 0.5)).r; // +0.5/256
    float h    = max(amp * uMaxH, 0.02) * (1.0 + uBeat * 0.15);

    vec3 pos   = position;
    pos.y     *= h;               // position.y is already 0→1 (pivot at base)

    vFreqIndex = aFreqIndex;
    vHeight    = pos.y / uMaxH;

    #ifdef USE_INSTANCING
      vec4 world = instanceMatrix * vec4(pos, 1.0);
    #else
      vec4 world = vec4(pos, 1.0);
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;

export const fragmentShader = /* glsl */`
  varying float vFreqIndex;
  varying float vHeight;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uBeat;

  void main() {
    vec3 col  = mix(uColorA, uColorB, vFreqIndex);
    col      *= 0.55 + vHeight * 0.9;       // brighten towards the tip
    col      += uBeat * vec3(0.15);         // brief flash on beat onset
    gl_FragColor = vec4(col, 1.0);
  }
`;
