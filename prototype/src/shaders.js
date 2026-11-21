// Beyin sahnesinin gölgelendiricileri.
export const NT = 1024; // düğüm dokusu genişliği (en fazla nöron)
export const LT = 4096; // bağ dokusu genişliği (en fazla sinaps)

export const SHELL_VS = `
attribute float aFold; uniform float uTime; uniform float uWobble;
varying vec3 vN; varying vec3 vV; varying float vFold;
void main(){
  vec3 p = position + normal * sin(uTime*0.9 + position.y*0.045 + position.z*0.03) * 1.6 * uWobble;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vFold = aFold;
  gl_Position = projectionMatrix * mv;
}`;
export const SHELL_FS = `
uniform vec3 uColor; uniform float uInt; uniform float uReveal; uniform float uInk; uniform float uTime; uniform float uDim;
varying vec3 vN; varying vec3 vV; varying float vFold;
void main(){
  float nv = abs(dot(normalize(vN), normalize(vV)));
  float f = pow(1.0 - nv, mix(2.6, 1.6, uInk));
  float crease = smoothstep(0.1, -0.85, vFold);
  float a = (f * 0.9 + crease * mix(0.10, 0.34, uInk) * (0.35 + 0.65*nv)) * uInt * uReveal * uDim;
  if (!gl_FrontFacing) a *= 0.45;
  a *= 0.92 + 0.08 * sin(uTime*0.7);
  gl_FragColor = vec4(uColor, a);
}`;

export const SOMA_VS = `
attribute float aNode; attribute float aSize; attribute float aSeed; attribute vec3 color;
uniform sampler2D uTex; uniform float uTime; uniform float uBreath; uniform float uPx; uniform float uFocus; uniform float uScale;
varying vec3 vColor; varying float vI; varying float vFlash; varying float vBlur;
void main(){
  vec4 d = texture2D(uTex, vec2((aNode + 0.5) / ${NT}.0, 0.5));
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  float depth = -mv.z;
  float blur = clamp(abs(depth - uFocus) / 260.0, 0.0, 1.0);
  float br = 1.0 + 0.14 * uBreath * sin(uTime*1.3 + aSeed*6.283);
  float sz = aSize * uScale * br * (1.0 + d.g*1.3) * d.b * (1.0 + blur*0.9);
  gl_PointSize = sz * uPx * 330.0 / depth;
  vColor = color; vI = d.r; vFlash = d.g; vBlur = blur;
  gl_Position = projectionMatrix * mv;
}`;
export const SOMA_FS = `
uniform float uInk; uniform vec3 uAccent; uniform vec3 uInkColor;
varying vec3 vColor; varying float vI; varying float vFlash; varying float vBlur;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.42, 0.05, d);
  float halo = exp(-d*d*5.0);
  vec3 col = mix(vColor, vec3(1.0), core*0.55);
  col = mix(col, uAccent, clamp(vFlash,0.0,1.0)*0.75);
  float a = (core*0.9 + halo*0.4) * vI / (1.0 + vBlur*1.6);
  if (uInk > 0.5) {
    float disc = smoothstep(0.62, 0.5, d);
    float ring = smoothstep(0.1, 0.0, abs(d-0.72)) * 0.5;
    col = mix(mix(uInkColor, vColor, 0.55), uAccent, clamp(vFlash,0.0,1.0));
    a = (disc + ring) * clamp(vI, 0.0, 1.0) / (1.0 + vBlur);
  }
  gl_FragColor = vec4(col, a);
}`;

export const LINE_VS = `
attribute float aNode; attribute float aS; attribute vec3 color;
uniform sampler2D uTex;
varying vec3 vColor; varying float vA;
void main(){
  vec4 d = texture2D(uTex, vec2((aNode + 0.5) / ${NT}.0, 0.5));
  float grow = smoothstep(aS - 0.12, aS, d.b * 1.12);
  vA = (1.0 - aS) * d.r * grow * (1.0 + d.g);
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;
export const LINE_FS = `
uniform float uInk; uniform float uGain;
varying vec3 vColor; varying float vA;
void main(){ gl_FragColor = vec4(vColor, clamp(vA * uGain, 0.0, 1.0)); }`;

export const TUBE_VS = `
attribute float aLink; attribute float aT; attribute float aSeed; attribute vec3 color;
uniform sampler2D uTex; uniform float uTime;
varying vec3 vColor; varying float vI; varying float vPulse; varying float vBurst; varying float vFres;
void main(){
  vec4 d = texture2D(uTex, vec2((aLink + 0.5) / ${LT}.0, 0.5));
  float p = fract(aT - uTime * (0.10 + aSeed*0.10) - aSeed*7.0);
  vPulse = smoothstep(0.16, 0.0, p) + smoothstep(0.985, 1.0, p);
  float p2 = fract(aT - uTime*0.9 - aSeed*3.0);
  vBurst = d.g * smoothstep(0.3, 0.0, p2);
  vI = d.r * step(aT, d.b);
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vFres = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
export const TUBE_FS = `
uniform vec3 uAccent; uniform float uInk; uniform vec3 uInkColor;
varying vec3 vColor; varying float vI; varying float vPulse; varying float vBurst; varying float vFres;
void main(){
  float sig = vPulse + vBurst*2.0;
  vec3 col = vColor * (0.22 + 0.25*vFres) + uAccent * sig * 1.3;
  float a = (0.24 + sig) * vI;
  if (uInk > 0.5) { col = mix(mix(uInkColor, vColor, 0.35), uAccent, clamp(sig,0.0,1.0)); a = (0.6 + sig) * clamp(vI,0.0,1.0); }
  gl_FragColor = vec4(col, clamp(a,0.0,1.0));
}`;

export const DUST_VS = `
attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uFocus;
varying float vA;
void main(){
  vec3 p = position;
  p.y += sin(uTime*0.12 + aSeed*40.0) * 9.0; p.x += cos(uTime*0.09 + aSeed*31.0) * 9.0;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float depth = -mv.z;
  float blur = clamp(abs(depth - uFocus) / 200.0, 0.0, 1.0);
  gl_PointSize = (1.2 + aSeed*2.2) * (1.0 + blur*4.0) * uPx * 150.0 / depth;
  vA = (0.25 + 0.75*aSeed) / (1.0 + blur*blur*9.0);
  gl_Position = projectionMatrix * mv;
}`;
export const DUST_FS = `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; gl_FragColor = vec4(uColor, (1.0-d*d) * vA * uOpacity); }`;

