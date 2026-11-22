import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { NT, LT, SHELL_VS, SHELL_FS, SOMA_VS, SOMA_FS, LINE_VS, LINE_FS, TUBE_VS, TUBE_FS, DUST_VS, DUST_FS } from './shaders.js';

export const S = 100; // beyin ölçeği

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rv = (r) => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);

/* Beyin biçimi: birim yön vektörü için yarıçap ve kıvrım değeri. */
function brainShape(x, y, z) {
  const A = 0.92, B = 0.8, C = 1.18;
  let r = 1 / Math.sqrt((x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2);
  r *= 1 - 0.17 * Math.exp(-(x * x) / 0.006) * smooth(-0.15, 0.5, y);
  if (y < 0) r *= 1 - 0.24 * Math.pow(-y, 1.4);
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
    const [r, g] = brainShape(x, y, z);
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
  const [r] = brainShape(v.x / l, v.y / l, v.z / l);
  if (l < r * margin) return true;
  const dx = (v.x - CB.c[0]) / CB.r[0], dy = (v.y - CB.c[1]) / CB.r[1], dz = (v.z - CB.c[2]) / CB.r[2];
  return dx * dx + dy * dy + dz * dz < margin * margin;
}

/**
 * 3D beyin sahnesi. Düğümler ve bağlar setGraph ile verilir; anahtarlar (key) kalıcıdır,
 * böylece veri değişince eski nöronlar yerinde kalır, yeniler dallanarak büyür.
 */
export class Brain {
  constructor(el, design, topics, linkTypes) {
    this.el = el; this.design = design; this.topics = topics; this.linkTypes = linkTypes;
    this.mode = design.defaultMode;
    this.nodes = []; this.links = []; this.byKey = new Map(); this.linkByKey = new Map();
    this.time = 0; this.sel = null; this.lobe = null; this.hover = null; this.tween = null; this.loaded = false;
    this.onSelect = () => {}; this.onFire = () => {}; this.onPick = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
    this.camera.position.set(210, 120, 560);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, autoRotate: true, autoRotateSpeed: 0.3, minDistance: 40, maxDistance: 900, enablePan: false });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1, 0.5, 0.2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.buildStatic();
    this.setMode(this.mode);
    this.setQuality(window.innerWidth < 700 ? 1 : 2);
    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    this.bindPointer();
    this.clock = new THREE.Clock();
    this.shellRevealTo = 0.3;
    this.fly(new THREE.Vector3(140, 62, 288).multiplyScalar(this.far()), new THREE.Vector3(0, -10, 0), 4200);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /* ---------- sabit sahne: kabuk, toz, ışık ---------- */
  buildStatic() {
    const d = this.design;
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
    this.shellU = { uColor: { value: new THREE.Color() }, uInt: { value: 0.5 }, uReveal: { value: 0 }, uDim: { value: 1 }, uWobble: { value: d.wobble } };
    this.somaU = { uBreath: { value: d.breath }, uScale: { value: d.soma } };
    this.lineU = { uGain: { value: 0.5 } };
    this.dustU = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0.5 } };
    this.M = {
      shell: mat(SHELL_VS, SHELL_FS, this.shellU, { side: THREE.DoubleSide }),
      soma: mat(SOMA_VS, SOMA_FS, this.somaU),
      line: mat(LINE_VS, LINE_FS, this.lineU),
      tube: mat(TUBE_VS, TUBE_FS, { uTex: { value: this.linkTex } }),
      dust: mat(DUST_VS, DUST_FS, this.dustU),
    };
    this.scene.add(new THREE.Mesh(shellGeometry(180), this.M.shell), new THREE.Mesh(cerebellumGeometry(72), this.M.shell));

    const r = rng(11);
    const DN = 1400;
    const dp = new Float32Array(DN * 3), ds = new Float32Array(DN);
    for (let i = 0; i < DN; i++) { dp.set([(r() - 0.5) * 900, (r() - 0.5) * 600, (r() - 0.5) * 900], i * 3); ds[i] = r(); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
    this.dust = new THREE.Points(dg, this.M.dust);
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

  /* ---------- veri ---------- */
  place(n, linked) {
    const r = rng(hash(n.key));
    const gauss = () => (r() + r() + r() - 1.5) * 0.9;
    let cx, cy, cz, spread;
    if (n.type === 'source') {
      [cx, cy, cz] = this.topics[n.topic].lobe; spread = n.topic === 5 ? 0.16 : 0.27;
    } else {
      const c = new THREE.Vector3();
      linked.forEach((m) => c.add(m.u));
      if (linked.length) c.multiplyScalar(0.55 / linked.length);
      cx = c.x; cy = c.y; cz = c.z; spread = 0.13;
    }
    let minD = Math.max(0.045, 0.13 - this.nodes.length * 0.0004);
    for (let k = 0; k < 300; k++) {
      const v = new THREE.Vector3(cx + gauss() * spread, cy + gauss() * spread, cz + gauss() * spread * 1.1);
      if (!inside(v)) continue;
      let ok = true;
      for (const m of this.nodes) if (m.u && m.u.distanceToSquared(v) < minD * minD) { ok = false; break; }
      if (ok) return v;
      if (k % 60 === 59) minD *= 0.8;
    }
    return new THREE.Vector3(cx, cy, cz).multiplyScalar(0.9);
  }

  /** nodes: [{key,title,topic,type,days}], links: [{key,a,b,type}] */
  setGraph(nodesIn, linksIn) {
    const first = !this.loaded;
    const keep = new Set(nodesIn.map((n) => n.key));
    this.nodes = this.nodes.filter((n) => keep.has(n.key));
    for (const k of [...this.byKey.keys()]) if (!keep.has(k)) this.byKey.delete(k);
    const fresh = [];
    const ordered = [...nodesIn].sort((a, b) => (a.type === 'source' ? 0 : 1) - (b.type === 'source' ? 0 : 1));
    const linkedOf = (key) => linksIn.filter((l) => l.a === key || l.b === key).map((l) => this.byKey.get(l.a === key ? l.b : l.a)).filter((m) => m && m.u);
    for (const d of ordered.slice(0, NT)) {
      let n = this.byKey.get(d.key);
      if (!n) {
        n = { key: d.key, seed: (hash(d.key) % 1000) / 1000, I: 1, target: 1, flash: 0, reveal: 0, revealTo: 0, revealSpeed: 1.2 };
        Object.assign(n, d);
        n.u = this.place(n, linkedOf(d.key));
        n.pos = n.u.clone().multiplyScalar(S);
        this.byKey.set(d.key, n); this.nodes.push(n); fresh.push(n);
      } else Object.assign(n, d);
      n.age = 1 - (Math.min(n.days || 0, 220) / 220) * 0.55;
    }
    const lkeep = new Set();
    const links = [];
    const freshLinks = [];
    for (const d of linksIn.slice(0, LT)) {
      const a = this.byKey.get(d.a), b = this.byKey.get(d.b);
      if (!a || !b || a === b) continue;
      lkeep.add(d.key);
      let l = this.linkByKey.get(d.key);
      if (!l) {
        l = { key: d.key, a, b, seed: (hash(d.key) % 1000) / 1000, I: 1, target: 1, burst: 0, reveal: 0, revealTo: 0, revealSpeed: 0.9 };
        this.linkByKey.set(d.key, l); freshLinks.push(l);
      }
      l.type = d.type; links.push(l);
    }
    for (const k of [...this.linkByKey.keys()]) if (!lkeep.has(k)) this.linkByKey.delete(k);
    this.links = links;
    this.nodes.forEach((n, i) => { n.i = i; n.deg = 0; });
    this.links.forEach((l, i) => { l.i = i; l.a.deg++; l.b.deg++; });
    for (const n of this.nodes) n.size = (n.type === 'source' ? 6.2 : 4.0) + Math.min(n.deg, 8) * 0.6;
    if (this.sel != null && !this.byKey.has(this.sel)) { this.sel = null; this.resetTargets(); }
    this.rebuild();

    // canlandırma
    if (first && this.nodes.length) {
      this.loaded = true;
      const order = [...this.nodes].sort((a, b) => b.pos.z - a.pos.z);
      const step = Math.min(55, 2600 / order.length);
      order.forEach((n, i) => setTimeout(() => { n.revealTo = 1; n.flash = 0.9; }, 700 + i * step));
      this.links.forEach((l, i) => setTimeout(() => { l.revealTo = 1; }, 1500 + i * Math.min(30, 2600 / this.links.length)));
    } else {
      this.loaded = this.loaded || nodesIn.length > 0;
      fresh.forEach((n) => { n.revealSpeed = 0.45; n.revealTo = 1; n.flash = 2; });
      freshLinks.forEach((l, i) => setTimeout(() => {
        l.revealSpeed = 0.6; l.revealTo = 1; l.burst = 2;
        setTimeout(() => { this.fire(l.a, 1.2); this.fire(l.b, 1.2); }, 1400);
      }, 500 + Math.min(i, 12) * 260));
    }
    this.shellRevealTo = this.nodes.length ? 1 : 0.3;
    return fresh;
  }

  rebuild() {
    for (const k of ['soma', 'lines', 'tubes']) if (this[k]) { this.scene.remove(this[k]); this[k].geometry.dispose(); this[k] = null; }
    const nodes = this.nodes, links = this.links;
    if (!nodes.length) return;
    const N = nodes.length;
    const pos = new Float32Array(N * 3), aNode = new Float32Array(N), aSize = new Float32Array(N), aSeed = new Float32Array(N);
    nodes.forEach((n, i) => { pos.set([n.pos.x, n.pos.y, n.pos.z], i * 3); aNode[i] = i; aSize[i] = n.size; aSeed[i] = n.seed; });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    sg.setAttribute('aNode', new THREE.BufferAttribute(aNode, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    this.soma = new THREE.Points(sg, this.M.soma);
    this.soma.frustumCulled = false;

    const lp = [], ln = [], ls = [];
    const seg = (a, b, node, s0, s1) => { lp.push(a.x, a.y, a.z, b.x, b.y, b.z); ln.push(node, node); ls.push(s0, s1); };
    const stub = (r, start, dir, len, node) => {
      let p = start.clone();
      const v = dir.clone();
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        v.add(rv(r).multiplyScalar(0.25)).normalize();
        const q = p.clone().addScaledVector(v, len / steps);
        seg(p, q, node, i / steps, (i + 1) / steps);
        p = q;
      }
    };
    nodes.forEach((n, i) => {
      const r = rng(hash(n.key) ^ 0x9e37);
      const k = n.type === 'source' ? 4 : 3;
      for (let j = 0; j < k; j++) stub(r, n.pos, rv(r).normalize(), n.size * (0.9 + r() * 0.6), i);
    });

    const RING = 6, SEG = 28;
    const tp = [], tn = [], tl = [], tt = [], tsd = [], ti = [];
    links.forEach((l, li) => {
      const r = rng(hash(l.key));
      const A = l.a.pos, B = l.b.pos, dist = A.distanceTo(B);
      const m = A.clone().add(B).multiplyScalar(0.5);
      const out = m.clone().normalize().multiplyScalar(dist * 0.18 + 4).add(rv(r).multiplyScalar(dist * 0.06));
      const curve = new THREE.QuadraticBezierCurve3(A.clone(), m.clone().add(out), B.clone());
      l.mid = curve.getPoint(0.5);
      const pts = curve.getPoints(SEG);
      const frames = curve.computeFrenetFrames(SEG, false);
      const base = tp.length / 3;
      const key = this.linkTypes[l.type]?.key;
      const thin = key === 'kavram' || key === 'kişi';
      const w = (thin ? 0.16 : 0.3) * this.design.fiber;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG, rad = w * (0.45 + 0.55 * Math.sin(Math.PI * t));
        for (let j = 0; j < RING; j++) {
          const a = (j / RING) * Math.PI * 2;
          const nx = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
          const p = pts[i].clone().addScaledVector(nx, rad);
          tp.push(p.x, p.y, p.z); tn.push(nx.x, nx.y, nx.z); tl.push(li); tt.push(t); tsd.push(l.seed);
        }
      }
      for (let i = 0; i < SEG; i++) for (let j = 0; j < RING; j++) {
        const a = base + i * RING + j, b = base + i * RING + ((j + 1) % RING), c = a + RING, e = b + RING;
        ti.push(a, c, b, b, c, e);
      }
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lp.length), 3));
    lg.setAttribute('aNode', new THREE.Float32BufferAttribute(ln, 1));
    lg.setAttribute('aS', new THREE.Float32BufferAttribute(ls, 1));
    this.lines = new THREE.LineSegments(lg, this.M.line);
    this.lines.frustumCulled = false;
    this.lineNode = ln;

    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tg.setAttribute('normal', new THREE.Float32BufferAttribute(tn, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tp.length), 3));
    tg.setAttribute('aLink', new THREE.Float32BufferAttribute(tl, 1));
    tg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
    tg.setAttribute('aSeed', new THREE.Float32BufferAttribute(tsd, 1));
    tg.setIndex(ti);
    this.tubes = new THREE.Mesh(tg, this.M.tube);
    this.tubes.frustumCulled = false;
    this.tubeLink = tl;
    this.scene.add(this.soma, this.lines, this.tubes);
    this.paint();
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
  paint() {
    if (!this.soma) return;
    const tcs = this.topics.map((_, i) => this.topicColor(i));
    const sc = this.soma.geometry.attributes.color;
    this.nodes.forEach((n, i) => { const c = tcs[n.topic]; sc.setXYZ(i, c.r, c.g, c.b); });
    sc.needsUpdate = true;
    const lc = this.lines.geometry.attributes.color;
    for (let i = 0; i < lc.count; i++) { const c = tcs[this.nodes[this.lineNode[i]].topic]; lc.setXYZ(i, c.r, c.g, c.b); }
    lc.needsUpdate = true;
    const lcs = this.linkTypes.map((t, i) => { const c = this.linkColor(i); return t.key === 'kavram' || t.key === 'kişi' ? c.multiplyScalar(0.45) : c; });
    const tc = this.tubes.geometry.attributes.color;
    for (let i = 0; i < tc.count; i++) { const c = lcs[this.links[this.tubeLink[i]].type]; tc.setXYZ(i, c.r, c.g, c.b); }
    tc.needsUpdate = true;
  }
  setMode(mode) {
    this.mode = mode;
    const m = this.design[mode];
    const ink = mode === 'light';
    this.scene.background = new THREE.Color(m.bg);
    this.U.uInk.value = ink ? 1 : 0;
    this.U.uAccent.value.set(m.accent);
    this.U.uInkColor.value.set(m.text);
    this.shellU.uColor.value.set(m.shell);
    this.shellU.uInt.value = m.shellInt;
    this.dustU.uColor.value.set(ink ? m.text : m.shell);
    this.dustU.uOpacity.value = ink ? 0.16 : 0.5;
    this.lineU.uGain.value = ink ? 0.7 : 0.32;
    for (const mt of Object.values(this.M)) { mt.blending = ink ? THREE.NormalBlending : THREE.AdditiveBlending; mt.needsUpdate = true; }
    for (const f of this.fog) { f.visible = !ink; f.material.color.set(m[f.userData.key]); }
    if (m.bloom) { this.bloom.strength = m.bloom[0]; this.bloom.radius = m.bloom[1]; this.bloom.threshold = m.bloom[2]; }
    this.bloom.enabled = !ink && this.quality > 0;
    this.paint();
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

  /* ---------- kamera ve seçim ---------- */
  far() { const a = (this.el.clientWidth || 1) / (this.el.clientHeight || 1); return a < 1 ? Math.min(2.1, 0.95 / a) : 1; }
  fly(pos, target, ms = 1500) { this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos.clone(), t1: target.clone(), ms, t: 0 }; }
  home() {
    const dir = this.camera.position.clone().sub(this.controls.target);
    this.fly(dir.setY(0).normalize().multiplyScalar(320).setY(62).multiplyScalar(this.far()), new THREE.Vector3(0, -10, 0), 1600);
  }
  flyToNode(n) {
    const dir = this.camera.position.clone().sub(n.pos).normalize();
    const out = n.pos.clone().normalize().multiplyScalar(0.6).add(dir).normalize();
    this.fly(n.pos.clone().addScaledVector(out, 125), n.pos.clone(), 1500);
  }
  fire(n, amount = 1) { if (typeof n === 'string') n = this.byKey.get(n); if (!n) return; n.flash = Math.max(n.flash, amount); this.onFire(n); }
  neighbors(key) {
    const out = [];
    for (const l of this.links) if (l.a.key === key || l.b.key === key) out.push({ link: l, node: l.a.key === key ? l.b : l.a });
    return out;
  }
  resetTargets() { this.nodes.forEach((n) => (n.target = 1)); this.links.forEach((l) => (l.target = 1)); }
  select(key, opts = {}) {
    this.lobe = null;
    const n = key == null ? null : this.byKey.get(key);
    if (!n) {
      this.sel = null; this.resetTargets();
      this.controls.autoRotate = true;
      if (!opts.keepCamera) this.home();
      if (!opts.silent) this.onSelect(null);
      return;
    }
    this.sel = key;
    const nb = this.neighbors(key);
    const set = new Set(nb.map((x) => x.node.key));
    this.nodes.forEach((m) => (m.target = m.key === key ? 2.1 : set.has(m.key) ? 1.5 : 0.07));
    this.links.forEach((l) => (l.target = l.a.key === key || l.b.key === key ? 1.8 : 0.03));
    this.fire(n, 1.6);
    nb.slice(0, 24).forEach(({ link, node }, i) => { link.burst = 1.5; setTimeout(() => this.fire(node, 1), 260 + i * 60); });
    this.controls.autoRotate = false;
    this.flyToNode(n);
    if (!opts.silent) this.onSelect(n);
  }
  focusLobe(t) {
    this.sel = null; this.lobe = t;
    this.nodes.forEach((n) => (n.target = n.topic === t ? 1.5 : 0.1));
    this.links.forEach((l) => (l.target = l.a.topic === t && l.b.topic === t ? 1.4 : 0.06));
    this.nodes.filter((n) => n.topic === t).slice(0, 40).forEach((n, i) => setTimeout(() => this.fire(n, 0.8), i * 50));
    const c = new THREE.Vector3(...this.topics[t].lobe).multiplyScalar(S);
    this.controls.autoRotate = false;
    this.fly(c.clone().add(c.clone().normalize().multiplyScalar(190)).add(new THREE.Vector3(0, 35, 0)), c, 1600);
    this.onSelect(null);
  }
  think(on) { this.thinking = on; }

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
    for (const n of this.nodes) {
      if (n.I < 0.3 || n.reveal < 0.5) continue;
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
    dom.addEventListener('pointermove', (e) => { const n = this.pick(e); this.hover = n ? n.key : null; dom.style.cursor = n ? 'pointer' : 'grab'; });
    dom.addEventListener('pointerleave', () => { this.hover = null; });
    dom.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const n = this.pick(e);
      if (n) this.select(n.key); else if (this.sel != null || this.lobe != null) this.select(null);
    });
  }

  loop() {
    requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);
    this.time += dt;
    const nodes = this.nodes, links = this.links;
    if (this.tween) {
      const tw = this.tween; tw.t += (Math.min(raw, 0.25) * 1000) / tw.ms;
      const k = ease(Math.min(tw.t, 1));
      this.camera.position.lerpVectors(tw.p0, tw.p1, k); this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    if (this.thinking && nodes.length && Math.random() < dt * 9) {
      const n = nodes[Math.floor(Math.random() * nodes.length)];
      n.flash = 1.2; this.onFire(n);
      for (const l of links) if (l.a === n || l.b === n) l.burst = 1;
    }
    const nd = this.nodeData, ld = this.linkData;
    const plain = this.sel == null && this.lobe == null;
    for (const n of nodes) {
      n.I += (n.target - n.I) * Math.min(1, dt * 5);
      n.flash *= Math.pow(0.08, dt);
      n.reveal += Math.sign(n.revealTo - n.reveal) * Math.min(Math.abs(n.revealTo - n.reveal), dt * n.revealSpeed);
      const i = n.i * 4;
      nd[i] = n.I * (plain ? n.age : 1) * (n.key === this.hover ? 1.5 : 1); nd[i + 1] = n.flash; nd[i + 2] = n.reveal; nd[i + 3] = 1;
    }
    for (const l of links) {
      l.I += (l.target - l.I) * Math.min(1, dt * 5);
      l.burst *= Math.pow(0.25, dt);
      l.reveal += Math.sign(l.revealTo - l.reveal) * Math.min(Math.abs(l.revealTo - l.reveal), dt * l.revealSpeed);
      const i = l.i * 4;
      ld[i] = l.I; ld[i + 1] = l.burst; ld[i + 2] = l.reveal; ld[i + 3] = 1;
    }
    this.nodeTex.needsUpdate = true; this.linkTex.needsUpdate = true;
    const camD = this.camera.position.distanceTo(this.controls.target) / this.far();
    const zoomFade = smooth(140, 300, camD);
    const dimTo = (this.sel != null ? 0.22 : this.lobe != null ? 0.5 : 1) * zoomFade;
    this.shellU.uDim.value += (dimTo - this.shellU.uDim.value) * Math.min(1, dt * 2.5);
    for (const f of this.fog) f.material.opacity = f.userData.o * (0.15 + 0.85 * zoomFade);
    const sr = this.shellU.uReveal; sr.value += (this.shellRevealTo - sr.value) * Math.min(1, dt * 0.9);
    this.U.uTime.value = this.time;
    this.U.uFocus.value += (this.camera.position.distanceTo(this.controls.target) - this.U.uFocus.value) * Math.min(1, dt * 3);
    if (this.bloom.enabled) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  }
}
