// Glowing point wormhole inspired by classic console music visualizers.

export const vertexShader = /* glsl */`
  attribute float aFreqIndex;
  attribute float aRingIndex;

  uniform sampler2D uFreqTex;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uBeat;

  varying float vAmp;
  varying float vRing;

  void main() {
    float amp = texture2D(uFreqTex, vec2(aFreqIndex + 0.001953125, 0.5)).r;
    float ringWave = sin(uTime * 2.4 - aRingIndex * 20.0) * 0.06;
    float pulse = amp * 0.8 + uEnergy * 0.7 + uBeat * 0.2;

    vec3 pos = position;
    vec2 radial = normalize(pos.xy);
    float flow = mod(pos.z + uTime * (2.2 + uEnergy * 2.0) + 3.2, 19.2) - 16.0;
    float twist = uTime * 0.35 + aRingIndex * 3.5 + amp * 0.8;
    mat2 spin = mat2(cos(twist), -sin(twist), sin(twist), cos(twist));
    pos.xy = spin * pos.xy;
    pos.xy += radial * (pulse + ringWave) * (0.4 + aRingIndex * 1.2);
    pos.xy *= 1.0 + sin(flow * 0.55 + uTime) * 0.06;
    pos.z = flow;

    vAmp = amp;
    vRing = aRingIndex;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = clamp((1.2 + amp * 2.8 + uEnergy) * (190.0 / -mvPos.z), 1.0, 5.0);
  }
`;

export const fragmentShader = /* glsl */`
  varying float vAmp;
  varying float vRing;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uEnergy;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float shape = dot(uv, uv);
    if (shape > 1.0) discard;

    float vortex = 1.0 - vRing;
    vec3 color = mix(uColorA, uColorB, clamp(vRing + vAmp * 0.8, 0.0, 1.0));
    color = mix(color, vec3(1.0), clamp(vortex * 0.55 + vAmp * 0.25, 0.0, 0.8));
    float alpha = 0.2 + vAmp * 0.55 + uEnergy * 0.45 + vortex * 0.3;
    color *= 0.7 + vAmp * 1.6 + uEnergy * 1.1;
    gl_FragColor = vec4(color, alpha * (1.0 - smoothstep(0.65, 1.0, shape)));
  }
`;
