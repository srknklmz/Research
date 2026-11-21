import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const S = 100; // beyin ölçeği
const NT = 128; // düğüm dokusu genişliği
const LT = 256; // bağ dokusu genişliği

function rng(seed) { let s = seed; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Beyin biçimi: birim yön vektörü için yarıçap ve kıvrım değeri. */
function brain(x, y, z) {
  const A = 0.92, B = 0.8, C = 1.18;
  let r = 1 / Math.sqrt((x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2);
  r *= 1 - 0.17 * Math.exp(-(x * x) / 0.006) * smooth(-0.15, 0.5, y); // yarımküreler arası yarık
  if (y < 0) r *= 1 - 0.24 * Math.pow(-y, 1.4); // alt taraf düz
  const g = Math.sin(x * 11 + Math.sin(z * 9 + y * 4) * 1.6) * Math.sin(y * 10 + Math.sin(x * 8) * 1.3 + z * 5);
  const g2 = Math.sin(z * 23 + x * 17) * Math.sin(y * 19 + z * 3);
  r *= 1 + 0.032 * g + 0.012 * g2;
  return [r, g * 0.75 + g2 * 0.25];
}
const CB = { c: [0, -0.5, -0.74], r: [0.5, 0.27, 0.34] }; // beyincik

function shellGeometry(detail) {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75));
  const p = geo.attributes.position;
  const fold = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [r, g] = brain(x, y, z);
    p.setXYZ(i, x * r * S, y * r * S, z * r * S);
    fold[i] = g;
  }
  geo.setAttribute('aFold', new THREE.BufferAttribute(fold, 1));
  geo.computeVertexNormals();
  return geo;
}

function cerebellumGeometry(detail) {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75));
  const p = geo.attributes.position;
  const fold = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const g = Math.sin(y * 34 + Math.sin(x * 6) * 1.5);
    const k = 1 + 0.03 * g;
    p.setXYZ(i, (CB.c[0] + x * CB.r[0] * k) * S, (CB.c[1] + y * CB.r[1] * k) * S, (CB.c[2] + z * CB.r[2] * k) * S);
    fold[i] = g;
  }
  geo.setAttribute('aFold', new THREE.BufferAttribute(fold, 1));
  geo.computeVertexNormals();
  return geo;
}

function inside(v, margin = 0.84) {
  const l = v.length();
  if (l < 1e-6) return true;
  const [r] = brain(v.x / l, v.y / l, v.z / l);
  if (l < r * margin) return true;
  const dx = (v.x - CB.c[0]) / CB.r[0], dy = (v.y - CB.c[1]) / CB.r[1], dz = (v.z - CB.c[2]) / CB.r[2];
  return dx * dx + dy * dy + dz * dz < margin * margin;
}

const SHELL_VS = `
attribute float aFold; uniform float uTime; uniform float uWobble;
varying vec3 vN; varying vec3 vV; varying float vFold;
void main(){
  vec3 p = position + normal * sin(uTime*0.9 + position.y*0.045 + position.z*0.03) * 1.6 * uWobble;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vFold = aFold;
  gl_Position = projectionMatrix * mv;
}`;
const SHELL_FS = `
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

const SOMA_VS = `
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
const SOMA_FS = `
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

const LINE_VS = `
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
const LINE_FS = `
uniform float uInk; uniform float uGain;
varying vec3 vColor; varying float vA;
void main(){ gl_FragColor = vec4(vColor, clamp(vA * uGain, 0.0, 1.0)); }`;

const TUBE_VS = `
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
const TUBE_FS = `
uniform vec3 uAccent; uniform float uInk; uniform vec3 uInkColor;
varying vec3 vColor; varying float vI; varying float vPulse; varying float vBurst; varying float vFres;
void main(){
  float sig = vPulse + vBurst*2.0;
  vec3 col = vColor * (0.22 + 0.25*vFres) + uAccent * sig * 1.3;
  float a = (0.24 + sig) * vI;
  if (uInk > 0.5) { col = mix(mix(uInkColor, vColor, 0.35), uAccent, clamp(sig,0.0,1.0)); a = (0.6 + sig) * clamp(vI,0.0,1.0); }
  gl_FragColor = vec4(col, clamp(a,0.0,1.0));
}`;

const DUST_VS = `
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
const DUST_FS = `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; gl_FragColor = vec4(uColor, (1.0-d*d) * vA * uOpacity); }`;

export class Brain {
  constructor(el, design, data, topics, linkTypes) {
    this.el = el; this.design = design; this.data = data; this.topics = topics; this.linkTypes = linkTypes;
    this.mode = design.defaultMode;
    this.time = 0; this.sel = null; this.lobe = null; this.hover = null; this.tween = null;
    this.onSelect = () => {}; this.onFire = () => {};
    const r = rng(11);
    this.rand = r;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
    this.camera.position.set(210, 120, 560);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, autoRotate: true, autoRotateSpeed: 0.38, minDistance: 40, maxDistance: 900, enablePan: false });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1, 0.5, 0.2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.layout();
    this.build();
    this.setMode(this.mode);
    this.setQuality(window.innerWidth < 700 ? 1 : 2);
    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    this.bindPointer();
    this.clock = new THREE.Clock();
    this.intro();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /* ---------- yerleşim ---------- */
  layout() {
    const r = this.rand;
    const { nodes, links } = this.data;
    const gauss = () => (r() + r() + r() - 1.5) * 0.9;
    const placed = [];
    const place = (cx, cy, cz, spread, minD) => {
      for (let k = 0; k < 400; k++) {
        const v = new THREE.Vector3(cx + gauss() * spread, cy + gauss() * spread, cz + gauss() * spread * 1.1);
        if (!inside(v)) continue;
        if (placed.every((p) => p.distanceTo(v) > minD)) { placed.push(v); return v; }
        if (k > 300) minD *= 0.9;
      }
      const v = new THREE.Vector3(cx, cy, cz); placed.push(v); return v;
    };
    for (const n of nodes.filter((n) => n.type === 'source')) {
      const t = this.topics[n.topic];
      let [x, y, z] = t.lobe;
      const spread = n.topic === 5 ? 0.16 : 0.27;
      n.u = place(x, y, z, spread, 0.13);
    }
    for (const n of nodes.filter((n) => n.type !== 'source')) {
      const ls = links.filter((l) => l.a === n.id || l.b === n.id).map((l) => nodes[l.a === n.id ? l.b : l.a]).filter((m) => m.u);
      const c = new THREE.Vector3();
      ls.forEach((m) => c.add(m.u));
      if (ls.length) c.multiplyScalar(0.55 / ls.length);
      n.u = place(c.x, c.y, c.z, 0.12, 0.1);
    }
    for (const n of nodes) {
      n.pos = n.u.clone().multiplyScalar(S);
      n.deg = links.filter((l) => !l.spare && (l.a === n.id || l.b === n.id)).length;
      n.size = (n.type === 'source' ? 5.2 : 3.4) + Math.min(n.deg, 8) * 0.75;
      n.seed = r();
      n.I = 1; n.target = 1; n.flash = 0; n.reveal = 0; n.revealTo = 0; n.revealSpeed = 1.2;
      n.age = 1 - Math.min(n.days, 220) / 220 * 0.55; // eski notlar solar
      n.active = !n.spare;
    }
    for (const l of links) { l.I = 1; l.target = 1; l.burst = 0; l.reveal = 0; l.revealTo = 0; l.seed = r(); l.active = !l.spare; }
  }

  /* ---------- sahne ---------- */
  build() {
    const d = this.design;
    const { nodes, links } = this.data;
    const r = this.rand;
    this.nodeData = new Float32Array(NT * 4);
    this.linkData = new Float32Array(LT * 4);
    this.nodeTex = new THREE.DataTexture(this.nodeData, NT, 1, THREE.RGBAFormat, THREE.FloatType);
    this.linkTex = new THREE.DataTexture(this.linkData, LT, 1, THREE.RGBAFormat, THREE.FloatType);
    const U = (this.U = {
      uTime: { value: 0 }, uTex: { value: this.nodeTex }, uInk: { value: 0 }, uPx: { value: 1 }, uFocus: { value: 330 },
      uAccent: { value: new THREE.Color() }, uInkColor: { value: new THREE.Color() },
    });
    const mat = (vs, fs, extra = {}, opts = {}) => new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...extra }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...opts,
    });
    this.mats = [];

    // Kabuk
    this.shellU = { uColor: { value: new THREE.Color() }, uInt: { value: 0.5 }, uReveal: { value: 0 }, uDim: { value: 1 }, uWobble: { value: d.wobble } };
    this.shell = new THREE.Group();
    const sm = mat(SHELL_VS, SHELL_FS, this.shellU, { side: THREE.DoubleSide });
    this.mats.push(sm);
    const g1 = shellGeometry(d.shell === 'points' ? 120 : 180), g2 = cerebellumGeometry(72);
    if (d.shell === 'points') {
      const pm = new THREE.PointsMaterial({ size: 0.8, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      this.shellPoints = pm; this.mats.push(pm);
      this.shell.add(new THREE.Points(g1, pm), new THREE.Points(g2, pm));
      const wm = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      this.shellWire = wm; this.mats.push(wm);
      this.shell.add(new THREE.LineSegments(new THREE.WireframeGeometry(shellGeometry(26)), wm));
    } else {
      this.shell.add(new THREE.Mesh(g1, sm), new THREE.Mesh(g2, sm));
    }
    this.scene.add(this.shell);

    // Nöron gövdeleri
    const N = nodes.length;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), aNode = new Float32Array(N), aSize = new Float32Array(N), aSeed = new Float32Array(N);
    nodes.forEach((n, i) => { pos.set([n.pos.x, n.pos.y, n.pos.z], i * 3); aNode[i] = i; aSize[i] = n.size; aSeed[i] = n.seed; });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sg.setAttribute('aNode', new THREE.BufferAttribute(aNode, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    this.somaU = { uBreath: { value: d.breath }, uScale: { value: d.soma } };
    this.soma = new THREE.Points(sg, mat(SOMA_VS, SOMA_FS, this.somaU));
    this.mats.push(this.soma.material);
    this.scene.add(this.soma);

    // Dendritler ve sinaps çatalları (çizgiler)
    const lp = [], lc = [], ln = [], ls = [];
    this.lineNodeIdx = [];
    const seg = (a, b, node, s0, s1) => { lp.push(a.x, a.y, a.z, b.x, b.y, b.z); ln.push(node, node); ls.push(s0, s1); lc.push(0, 0, 0, 0, 0, 0); this.lineNodeIdx.push(node, node); };
    const branch = (start, dir, len, node, s0, depth) => {
      let p = start.clone();
      const steps = 6;
      const v = dir.clone();
      for (let i = 0; i < steps; i++) {
        v.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7)).normalize();
        const q = p.clone().addScaledVector(v, len / steps);
        const a = s0 + (1 - s0) * (i / steps), b = s0 + (1 - s0) * ((i + 1) / steps);
        seg(p, q, node, a, b);
        if (depth > 0 && i === 2) branch(q, v.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5)).normalize(), len * 0.55, node, b, depth - 1);
        if (depth > 0 && i === 4 && r() < 0.5) branch(q, v.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5)).normalize(), len * 0.4, node, b, 0);
        p = q;
      }
    };
    nodes.forEach((n, i) => {
      const k = n.type === 'source' ? 6 : 4;
      for (let j = 0; j < k; j++) {
        const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        branch(n.pos, dir, n.size * (2.2 + r() * 2.4), i, 0.0, 1);
      }
    });

    // Sinaps lifleri (tüpler)
    const tp = [], tn = [], tc = [], tl = [], tt = [], tsd = [], ti = [];
    this.tubeLinkIdx = [];
    const RING = 5, SEG = 30;
    links.forEach((l, li) => {
      const A = nodes[l.a].pos, B = nodes[l.b].pos;
      const dist = A.distanceTo(B);
      const mid = (t) => A.clone().lerp(B, t).add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(dist * 0.28));
      const curve = new THREE.CatmullRomCurve3([A, mid(0.3), mid(0.68), B], false, 'catmullrom', 0.6);
      l.curve = curve; l.mid = curve.getPoint(0.5);
      const pts = curve.getPoints(SEG);
      const frames = curve.computeFrenetFrames(SEG, false);
      const base = ti.length ? tp.length / 3 : 0;
      const w = (0.34 + r() * 0.2) * this.design.fiber;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const rad = w * (0.4 + 1.0 * Math.pow(Math.abs(2 * t - 1), 2.4));
        for (let j = 0; j < RING; j++) {
          const a = (j / RING) * Math.PI * 2;
          const nx = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
          const p = pts[i].clone().addScaledVector(nx, rad);
          tp.push(p.x, p.y, p.z); tn.push(nx.x, nx.y, nx.z); tc.push(0, 0, 0); tl.push(li); tt.push(t); tsd.push(l.seed);
          this.tubeLinkIdx.push(li);
        }
      }
      for (let i = 0; i < SEG; i++) for (let j = 0; j < RING; j++) {
        const a = base + i * RING + j, b = base + i * RING + ((j + 1) % RING), c = a + RING, e = b + RING;
        ti.push(a, c, b, b, c, e);
      }
      // uçlarda dallanma
      for (const [t0, node] of [[0.16, l.a], [0.84, l.b]]) {
        const p0 = curve.getPoint(t0);
        const target = nodes[node].pos;
        for (let k = 0; k < 2; k++) {
          const off = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(nodes[node].size * 1.3);
          const end = target.clone().add(off);
          const m = p0.clone().lerp(end, 0.5).add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(3));
          seg(p0, m, node, 0.75, 0.45); seg(m, end, node, 0.45, 0.1);
        }
      }
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    lg.setAttribute('aNode', new THREE.Float32BufferAttribute(ln, 1));
    lg.setAttribute('aS', new THREE.Float32BufferAttribute(ls, 1));
    this.lineU = { uGain: { value: 0.75 } };
    this.lines = new THREE.LineSegments(lg, mat(LINE_VS, LINE_FS, this.lineU));
    this.mats.push(this.lines.material);
    this.scene.add(this.lines);

    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tg.setAttribute('normal', new THREE.Float32BufferAttribute(tn, 3));
    tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
    tg.setAttribute('aLink', new THREE.Float32BufferAttribute(tl, 1));
    tg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
    tg.setAttribute('aSeed', new THREE.Float32BufferAttribute(tsd, 1));
    tg.setIndex(ti);
    this.tubes = new THREE.Mesh(tg, mat(TUBE_VS, TUBE_FS, { uTex: { value: this.linkTex } }));
    this.mats.push(this.tubes.material);
    this.scene.add(this.tubes);

    // Toz ve hacimsel ışık
    const DN = 1400;
    const dp = new Float32Array(DN * 3), ds = new Float32Array(DN);
    for (let i = 0; i < DN; i++) { dp.set([(r() - 0.5) * 900, (r() - 0.5) * 600, (r() - 0.5) * 900], i * 3); ds[i] = r(); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
    this.dustU = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0.5 } };
    this.dust = new THREE.Points(dg, mat(DUST_VS, DUST_FS, this.dustU));
    this.mats.push(this.dust.material);
    this.scene.add(this.dust);

    const c = document.createElement('canvas'); c.width = c.height = 256;
    const cx = c.getContext('2d');
    const gr = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    this.fog = [];
    const fogAt = (x, y, z, s, key, o) => {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: o });
      const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.setScalar(s); sp.renderOrder = -5;
      sp.userData = { key, o }; this.fog.push(sp); this.scene.add(sp);
    };
    fogAt(0, 10, 0, 520, 'bg2', 0.55); fogAt(-160, 120, -220, 520, 'bg2', 0.4); fogAt(190, -90, -160, 420, 'accent', 0.07); fogAt(0, 200, 60, 380, 'shell', 0.06);
  }

  /* ---------- renk / tema ---------- */
  topicColor(i) {
    const d = this.design, m = d[this.mode];
    const c = new THREE.Color(this.topics[i].color);
    if (this.mode === 'dark') return c.lerp(new THREE.Color('#ffffff'), d.mono * 0.9);
    return c.multiplyScalar(0.62).lerp(new THREE.Color(m.text), d.mono * 0.85);
  }
  linkColor(i) {
    const d = this.design, m = d[this.mode];
    const c = new THREE.Color(this.linkTypes[i].color);
    if (this.mode === 'dark') return c.lerp(new THREE.Color(m.shell), d.mono * 0.9);
    return c.multiplyScalar(0.55).lerp(new THREE.Color(m.text), d.mono * 0.9);
  }
  setMode(mode) {
    this.mode = mode;
    const d = this.design, m = d[mode];
    const ink = mode === 'light';
    this.scene.background = new THREE.Color(m.bg);
    this.U.uInk.value = ink ? 1 : 0;
    this.U.uAccent.value.set(m.accent);
    this.U.uInkColor.value.set(m.text);
    this.shellU.uColor.value.set(m.shell);
    this.shellU.uInt.value = m.shellInt;
    if (this.shellPoints) { this.shellPoints.color.set(m.shell); this.shellWire.color.set(m.shell); }
    this.dustU.uColor.value.set(ink ? m.text : m.shell);
    this.dustU.uOpacity.value = ink ? 0.16 : 0.5;
    this.lineU.uGain.value = ink ? 1.15 : 0.5;
    for (const mt of this.mats) { mt.blending = ink ? THREE.NormalBlending : THREE.AdditiveBlending; mt.needsUpdate = true; }
    for (const f of this.fog) { f.visible = !ink; f.material.color.set(m[f.userData.key]); }
    const { nodes, links } = this.data;
    const sc = this.soma.geometry.attributes.color;
    nodes.forEach((n, i) => { const c = this.topicColor(n.topic); n.css = '#' + new THREE.Color(this.topics[n.topic].color).getHexString(); sc.setXYZ(i, c.r, c.g, c.b); });
    sc.needsUpdate = true;
    const lc = this.lines.geometry.attributes.color;
    for (let i = 0; i < lc.count; i++) { const c = this.topicColor(nodes[this.lineNodeIdx[i]].topic); lc.setXYZ(i, c.r, c.g, c.b); }
    lc.needsUpdate = true;
    const tc = this.tubes.geometry.attributes.color;
    const cache = links.map((l) => this.linkColor(l.type));
    for (let i = 0; i < tc.count; i++) { const c = cache[this.tubeLinkIdx[i]]; tc.setXYZ(i, c.r, c.g, c.b); }
    tc.needsUpdate = true;
    if (m.bloom) { this.bloom.strength = m.bloom[0]; this.bloom.radius = m.bloom[1]; this.bloom.threshold = m.bloom[2]; }
    this.bloom.enabled = !ink && this.quality > 0;
  }
  setQuality(q) {
    this.quality = q;
    const pr = [1, Math.min(devicePixelRatio, 1.5), Math.min(devicePixelRatio, 2)][q];
    this.renderer.setPixelRatio(pr); this.composer.setPixelRatio(pr);
    this.U.uPx.value = pr;
    this.bloom.enabled = this.mode === 'dark' && q > 0;
    this.dust.visible = q > 0;
    this.resize();
  }
  resize() {
    const w = this.el.clientWidth || 2, h = this.el.clientHeight || 2;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  /* ---------- animasyon ---------- */
  intro() {
    const { nodes, links } = this.data;
    const order = nodes.filter((n) => n.active).sort((a, b) => b.pos.z - a.pos.z);
    order.forEach((n, i) => setTimeout(() => { n.revealTo = 1; n.flash = 0.9; }, 900 + i * 55));
    links.filter((l) => l.active).forEach((l, i) => setTimeout(() => { l.revealTo = 1; }, 1700 + i * 30));
    this.shellRevealTo = 1;
    this.fly(new THREE.Vector3(140, 62, 288).multiplyScalar(this.far()), new THREE.Vector3(0, -10, 0), 4200);
  }
  far() { const a = (this.el.clientWidth || 1) / (this.el.clientHeight || 1); return a < 1 ? Math.min(2.1, 0.95 / a) : 1; }
  fly(pos, target, ms = 1500) {
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos.clone(), t1: target.clone(), ms, t: 0 };
  }
  home() {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.fly(dir.setY(0).normalize().multiplyScalar(320).setY(62).multiplyScalar(this.far()), new THREE.Vector3(0, -10, 0), 1600);
  }
  flyToNode(n) {
    const dir = this.camera.position.clone().sub(n.pos).normalize();
    const out = n.pos.clone().normalize().multiplyScalar(0.6).add(dir).normalize();
    this.fly(n.pos.clone().addScaledVector(out, 125), n.pos.clone(), 1500);
  }
  fire(n, amount = 1) { n.flash = Math.max(n.flash, amount); this.onFire(n); }
  neighbors(id) {
    const out = [];
    for (const l of this.data.links) if (l.active && (l.a === id || l.b === id)) out.push({ link: l, node: this.data.nodes[l.a === id ? l.b : l.a] });
    return out;
  }
  select(id, opts = {}) {
    const { nodes, links } = this.data;
    this.sel = id; this.lobe = null;
    if (id == null) {
      nodes.forEach((n) => (n.target = 1)); links.forEach((l) => (l.target = 1));
      this.controls.autoRotate = true;
      if (!opts.keepCamera) this.home();
      this.onSelect(null);
      return;
    }
    const n = nodes[id];
    const nb = this.neighbors(id);
    const set = new Set(nb.map((x) => x.node.id));
    nodes.forEach((m) => (m.target = m.id === id ? 2.1 : set.has(m.id) ? 1.5 : 0.07));
    links.forEach((l) => (l.target = l.a === id || l.b === id ? 1.8 : 0.03));
    this.fire(n, 1.6);
    nb.forEach(({ link, node }, i) => { link.burst = 1.5; setTimeout(() => this.fire(node, 1), 260 + i * 60); });
    setTimeout(() => nb.forEach(({ node }) => this.neighbors(node.id).forEach(({ link }) => { if (link.a !== id && link.b !== id) link.burst = 0.6; })), 520);
    this.controls.autoRotate = false;
    this.flyToNode(n);
    this.onSelect(n);
  }
  focusLobe(t) {
    const { nodes, links } = this.data;
    this.sel = null; this.lobe = t;
    nodes.forEach((n) => (n.target = n.topic === t ? 1.5 : 0.1));
    links.forEach((l) => (l.target = nodes[l.a].topic === t && nodes[l.b].topic === t ? 1.4 : 0.06));
    nodes.filter((n) => n.topic === t && n.active).forEach((n, i) => setTimeout(() => this.fire(n, 0.8), i * 50));
    const c = new THREE.Vector3(...this.topics[t].lobe).multiplyScalar(S);
    this.controls.autoRotate = false;
    this.fly(c.clone().add(c.clone().normalize().multiplyScalar(190)).add(new THREE.Vector3(0, 35, 0)), c, 1600);
    this.onSelect(null);
  }
  /* Demo: yeni nöronun büyümesi */
  think(on) { this.thinking = on; }
  grow(id) {
    const { nodes, links } = this.data;
    const n = nodes[id];
    n.active = true; n.revealSpeed = 0.45; n.revealTo = 1; n.flash = 2;
    const ls = links.filter((l) => l.a === id || l.b === id);
    ls.forEach((l, i) => setTimeout(() => { l.active = true; l.revealSpeed = 0.6; l.revealTo = 1; l.burst = 2; }, 900 + i * 450));
    ls.forEach((l, i) => setTimeout(() => this.fire(nodes[l.a === id ? l.b : l.a], 1.4), 2300 + i * 450));
    this.sel = null; nodes.forEach((m) => (m.target = 1)); links.forEach((l) => (l.target = 1));
    this.controls.autoRotate = false;
    this.flyToNode(n);
  }

  /* ---------- etkileşim ---------- */
  screen(v, out = {}) {
    const p = v.clone().project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.el.clientWidth; out.y = (-p.y * 0.5 + 0.5) * this.el.clientHeight; out.z = p.z;
    return out;
  }
  pick(ev) {
    const rect = this.el.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    let best = null, bd = 26;
    const o = {};
    for (const n of this.data.nodes) {
      if (!n.active || n.I < 0.3) continue;
      this.screen(n.pos, o);
      if (o.z > 1) continue;
      const d = Math.hypot(o.x - x, o.y - y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  bindPointer() {
    const dom = this.renderer.domElement;
    let down = null;
    dom.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; this.tween = null; });
    dom.addEventListener('pointermove', (e) => { const n = this.pick(e); this.hover = n ? n.id : null; dom.style.cursor = n ? 'pointer' : 'grab'; });
    dom.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const n = this.pick(e);
      if (n) this.select(n.id); else if (this.sel != null || this.lobe != null) this.select(null);
    });
  }

  loop() {
    requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);
    this.time += dt;
    const { nodes, links } = this.data;
    if (this.tween) {
      const tw = this.tween; tw.t += (Math.min(raw, 0.25) * 1000) / tw.ms;
      const k = ease(Math.min(tw.t, 1));
      this.camera.position.lerpVectors(tw.p0, tw.p1, k); this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    if (this.thinking && Math.random() < dt * 9) { const n = nodes[Math.floor(Math.random() * nodes.length)]; if (n.active) { n.flash = 1.2; this.neighbors(n.id).forEach(({ link }) => (link.burst = 1)); } }
    const nd = this.nodeData, ld = this.linkData;
    for (const n of nodes) {
      n.I += (n.target - n.I) * Math.min(1, dt * 5);
      n.flash *= Math.pow(0.08, dt);
      n.reveal += Math.sign(n.revealTo - n.reveal) * Math.min(Math.abs(n.revealTo - n.reveal), dt * n.revealSpeed);
      const i = n.id * 4;
      const dimAge = this.sel == null && this.lobe == null ? n.age : 1;
      nd[i] = n.I * dimAge * (n.id === this.hover ? 1.5 : 1); nd[i + 1] = n.flash; nd[i + 2] = n.reveal; nd[i + 3] = 1;
    }
    for (const l of links) {
      l.I += (l.target - l.I) * Math.min(1, dt * 5);
      l.burst *= Math.pow(0.25, dt);
      l.reveal += Math.sign(l.revealTo - l.reveal) * Math.min(Math.abs(l.revealTo - l.reveal), dt * (l.revealSpeed || 0.9));
      const i = l.id * 4;
      ld[i] = l.I; ld[i + 1] = l.burst; ld[i + 2] = l.reveal; ld[i + 3] = 1;
    }
    this.nodeTex.needsUpdate = true; this.linkTex.needsUpdate = true;
    const dimTo = this.sel != null ? 0.22 : this.lobe != null ? 0.5 : 1;
    this.shellU.uDim.value += (dimTo - this.shellU.uDim.value) * Math.min(1, dt * 2.5);
    const sr = this.shellU.uReveal; sr.value += ((this.shellRevealTo || 0) - sr.value) * Math.min(1, dt * 0.9);
    if (this.shellPoints) { const sd = this.shellU.uDim.value; this.shellPoints.opacity = sr.value * sd * (this.mode === 'light' ? 0.5 : 0.16); this.shellWire.opacity = sr.value * sd * (this.mode === 'light' ? 0.16 : 0.05); }
    this.U.uTime.value = this.time;
    this.U.uFocus.value += (this.camera.position.distanceTo(this.controls.target) - this.U.uFocus.value) * Math.min(1, dt * 3);
    if (this.bloom.enabled) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  }
}

export { S };
