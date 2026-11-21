import { Brain, S } from './brain.js';
import { DESIGNS } from './themes.js';
import { TOPICS, LINK_TYPES, IDEAS, buildData } from './data.js';
import * as THREE from 'three';

const ID = window.SINAPS_DESIGN || 1;
const design = DESIGNS[ID];
const data = buildData();
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const up = (s) => s.toLocaleUpperCase('tr');
const TYPE = { source: 'KAYNAK', concept: 'KAVRAM', person: 'KİŞİ' };

/* ---------- tema ---------- */
let mode = design.defaultMode;
function applyTheme() {
  const m = design[mode];
  const st = document.documentElement.style;
  document.documentElement.dataset.mode = mode;
  document.body.dataset.d = ID;
  for (const [k, v] of Object.entries({ bg: m.bg, bg2: m.bg2, text: m.text, mute: m.mute, accent: m.accent, glass: m.glass, line: m.line, shell: m.shell }))
    st.setProperty('--' + k, v);
  st.setProperty('--f-display', design.fonts.display + ", 'Arial Narrow', sans-serif");
  st.setProperty('--f-body', design.fonts.body + ', Georgia, serif');
  st.setProperty('--f-ui', design.fonts.ui + ', system-ui, sans-serif');
}
applyTheme();
$('#designTag').innerHTML = `TASARIM 0${ID} <b>${design.name}</b>`;
$('#designBlurb').textContent = design.blurb;

/* ---------- ses ---------- */
const audio = { ctx: null, on: false, amb: null };
function tone(freq, dur, vol, type = 'sine') {
  if (!audio.on) return;
  const c = audio.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.05);
}
const SCALE = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
const sfx = {
  click: () => tone(1250, 0.06, 0.025, 'triangle'),
  open: () => { tone(420, 0.18, 0.03); setTimeout(() => tone(630, 0.22, 0.025), 70); },
  fire: () => tone(SCALE[Math.floor(Math.random() * SCALE.length)] * 2, 0.7, 0.022),
};
function toggleSound() {
  try {
    if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.on = !audio.on;
    if (audio.on) {
      audio.ctx.resume();
      const c = audio.ctx, g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.035;
      const os = [55, 55.4, 82.6].map((hz) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); return o; });
      f.connect(g).connect(c.destination); audio.amb = { os, g };
      sfx.open();
    } else if (audio.amb) { audio.amb.os.forEach((o) => o.stop()); audio.amb = null; }
  } catch { audio.on = false; }
  $('#btnSound').classList.toggle('on', audio.on);
}

/* ---------- beyin ---------- */
const stage = $('#stage');
const brain = new Brain($('#gl'), design, data, TOPICS, LINK_TYPES);
let lastFire = 0;
brain.onFire = () => { const t = performance.now(); if (t - lastFire > 90) { lastFire = t; sfx.fire(); } };

/* etiketler */
const labels = $('#labels');
const nodeEls = data.nodes.map((n) => {
  const el = document.createElement('div');
  el.className = 'nlabel'; el.textContent = n.title; el.dataset.id = n.id;
  labels.appendChild(el); return el;
});
const lobeEls = TOPICS.map((t, i) => {
  const el = document.createElement('button');
  el.className = 'lobe'; el.type = 'button'; el.textContent = t.key; el.dataset.lobe = i; el.style.setProperty('--c', t.color);
  labels.appendChild(el); return el;
});
const linkEls = [];
function setLinkLabels(id) {
  linkEls.splice(0).forEach((x) => x.el.remove());
  if (id == null) return;
  for (const { link } of brain.neighbors(id)) {
    const el = document.createElement('div');
    el.className = 'llabel'; el.textContent = LINK_TYPES[link.type].key; el.style.setProperty('--c', LINK_TYPES[link.type].color);
    labels.appendChild(el); linkEls.push({ el, link });
  }
}
const lobePos = TOPICS.map((t) => { const v = new THREE.Vector3(...t.lobe); return v.multiplyScalar(S).add(v.clone().normalize().multiplyScalar(34)).add(new THREE.Vector3(0, 14, 0)); });
const o = {};
brain.onFrame = () => {
  const cam = brain.camera.position;
  const selSet = brain.sel != null ? new Set([brain.sel, ...brain.neighbors(brain.sel).map((x) => x.node.id)]) : null;
  const dist = cam.distanceTo(brain.controls.target);
  data.nodes.forEach((n, i) => {
    const el = nodeEls[i];
    brain.screen(n.pos, o);
    const d = cam.distanceTo(n.pos);
    let a = 0;
    if (n.active && n.reveal > 0.8 && o.z < 1) {
      if (selSet) a = selSet.has(n.id) ? 1 : 0;
      else if (brain.lobe != null) a = n.topic === brain.lobe && n.type === 'source' ? 1 : 0;
      else a = Math.max(0, Math.min(1, (175 * brain.far() - d) / 45));
      if (n.id === brain.hover) a = 1;
    }
    el.style.opacity = a.toFixed(2);
    if (a > 0.01) el.style.transform = `translate(-50%,-100%) translate(${o.x.toFixed(1)}px,${(o.y - 8 - n.size * 600 / d).toFixed(1)}px)`;
    el.classList.toggle('sel', n.id === brain.sel);
  });
  lobeEls.forEach((el, i) => {
    brain.screen(lobePos[i], o);
    const a = brain.sel != null || o.z > 1 ? 0 : brain.lobe != null ? (brain.lobe === i ? 0.9 : 0.12) : Math.max(0, Math.min(1, (dist - 190 * brain.far()) / 90));
    el.style.opacity = (a * brain.shellU.uReveal.value).toFixed(2);
    el.style.pointerEvents = a > 0.3 ? 'auto' : 'none';
    el.style.transform = `translate(-50%,-50%) translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
  });
  for (const { el, link } of linkEls) {
    brain.screen(link.mid, o);
    el.style.opacity = o.z < 1 ? 1 : 0;
    el.style.transform = `translate(-50%,-50%) translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
  }
};
labels.addEventListener('click', (e) => {
  const l = e.target.closest('.lobe');
  if (l) { sfx.open(); closePanels(); brain.focusLobe(+l.dataset.lobe); }
});

/* ---------- not ekranı (bölünmüş) ---------- */
function noteHTML(n) {
  const nb = brain.neighbors(n.id);
  const t = TOPICS[n.topic];
  const body = n.type === 'source' ? `
    <p class="lead">Bu not, “${esc(n.title)}” başlıklı kaynağın özüdür. Sinaps kaynağı okudu, ana iddiaları ayıkladı ve arşivindeki ${nb.length} notla ilişkilendirdi.</p>
    <h3>ANA FİKİRLER</h3>
    <ul><li>Temel iddia, tek bir örnek yerine birbirini doğrulayan üç bağımsız gözleme dayanıyor.</li><li>Yazarın önerdiği yaklaşım küçük ölçekte ucuz, büyük ölçekte pahalı.</li><li>Ölçüm yöntemi sonucu ciddi biçimde etkiliyor; rakamlar buna göre okunmalı.</li></ul>
    <h3>ELEŞTİRİ</h3>
    <p>Kaynak güvenilir ama tek taraflı: karşıt örneklere yer vermiyor. Örneklem küçük, sonuçlar genellenirken dikkat gerekli.</p>
    <blockquote>“Bilgi, birbirine bağlandığı ölçüde değer kazanır.”</blockquote>
    <h3>AKSİYON</h3>
    <p>Bu bulguyu aktif projendeki fiyatlandırma kararında sınamak için küçük bir deney tasarla.</p>`
    : `<p class="lead">${esc(n.title)}, arşivindeki ${nb.length} kaynakta geçiyor. Sinaps yeni kaynak geldikçe bu notu günceller.</p>
       <h3>TANIM</h3><p>Farklı kaynaklarda aynı anlamda kullanılan ortak bir düşünce birimi; lobları birbirine bağlayan düğümlerden biri.</p>`;
  return `
    <button class="ghost x" data-close type="button" aria-label="Kapat">KAPAT</button>
    <div class="note-kicker"><i style="background:${t.color}"></i>${t.key} · ${TYPE[n.type]} · ${n.days === 0 ? 'BUGÜN' : n.days + ' GÜN ÖNCE'}</div>
    <h1>${esc(up(n.title))}</h1>
    <div class="note-body">${body}</div>
    <h3 class="sec">BAĞLANTILAR <span>${nb.length}</span></h3>
    <div class="links">${nb.map(({ link, node }) => `<button type="button" class="linkrow" data-node="${node.id}"><span class="lt" style="--c:${LINK_TYPES[link.type].color}">${up(LINK_TYPES[link.type].key)}</span><span>${esc(node.title)}</span></button>`).join('')}</div>
    <div class="row"><button class="ghost" type="button">DAHA DERİN İNCELE</button><button class="ghost" type="button">DÜZENLE</button></div>`;
}
brain.onSelect = (n) => {
  setLinkLabels(n ? n.id : null);
  const p = $('#note');
  if (!n) { document.body.classList.remove('split'); return; }
  p.innerHTML = noteHTML(n); p.scrollTop = 0;
  document.body.classList.add('split');
  sfx.open();
};
$('#note').addEventListener('click', (e) => {
  const b = e.target.closest('[data-node]');
  if (b) return brain.select(+b.dataset.node);
  if (e.target.closest('[data-close]')) brain.select(null);
  else if (e.target.closest('.ghost')) sfx.click();
});

/* ---------- paneller ---------- */
function closePanels(except) {
  for (const id of ['list', 'ideas', 'palette']) if (id !== except) $('#' + id).classList.remove('open');
  document.body.classList.toggle('overlay', except === 'ideas');
}
function toggle(id) {
  const el = $('#' + id);
  const open = !el.classList.contains('open');
  closePanels(open ? id : null);
  el.classList.toggle('open', open);
  if (open) sfx.open();
  if (id === 'ideas' && open && brain.sel != null) brain.select(null);
  return open;
}

/* not listesi */
$('#listBody').innerHTML = TOPICS.map((t, ti) => {
  const ns = data.nodes.filter((n) => n.topic === ti && n.type === 'source' && !n.spare);
  return `<div class="grp"><h4><i style="background:${t.color}"></i>${t.key}<span>${ns.length}</span></h4>${ns.map((n) => `<button type="button" data-node="${n.id}">${esc(n.title)}</button>`).join('')}</div>`;
}).join('');
$('#list').addEventListener('click', (e) => { const b = e.target.closest('[data-node]'); if (b) { closePanels(); brain.select(+b.dataset.node); } });
$('#list').addEventListener('pointerover', (e) => { const b = e.target.closest('[data-node]'); if (b) { const n = data.nodes[+b.dataset.node]; brain.hover = n.id; n.flash = Math.max(n.flash, 0.7); } });

/* arama */
const palIn = $('#palIn');
function renderPalette() {
  const q = palIn.value.toLocaleLowerCase('tr').trim();
  const hits = data.nodes.filter((n) => n.active && (!q || n.title.toLocaleLowerCase('tr').includes(q))).slice(0, 8);
  $('#palList').innerHTML = hits.map((n) => `<button type="button" data-node="${n.id}"><i style="background:${TOPICS[n.topic].color}"></i><span>${esc(n.title)}</span><em>${TYPE[n.type]}</em></button>`).join('') || '<div class="none">SONUÇ YOK</div>';
}
palIn.addEventListener('input', renderPalette);
$('#palette').addEventListener('click', (e) => { const b = e.target.closest('[data-node]'); if (b) { closePanels(); brain.select(+b.dataset.node); } else if (e.target.id === 'palette') closePanels(); });
function openSearch() { if (toggle('palette')) { palIn.value = ''; renderPalette(); setTimeout(() => palIn.focus(), 50); } }

/* fikir ağacı + radar */
const flatIdeas = [];
function renderTree() {
  const W = 620, H = 560, rootX = 54, bx = 250, lx = 470;
  const total = IDEAS.branches.reduce((s, b) => s + b.items.length, 0);
  let row = 0, paths = '', nodes = '';
  const y = (r) => 46 + (r + 0.5) * ((H - 92) / total);
  const curve = (x1, y1, x2, y2) => `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
  IDEAS.branches.forEach((b) => {
    const start = row;
    b.items.forEach((it) => { it.id = flatIdeas.length; it.type = b.type; it.y = y(row++); flatIdeas.push(it); });
    const by = (y(start) + y(row - 1)) / 2;
    paths += `<path d="${curve(rootX, H / 2, bx, by)}"/>`;
    nodes += `<g class="tb" transform="translate(${bx},${by})"><circle r="7"/><text x="-14" y="-14" text-anchor="end">${b.type}</text></g>`;
    b.items.forEach((it) => {
      paths += `<path d="${curve(bx, by, lx, it.y)}" data-p="${it.id}"/>`;
      const sum = it.s[0] + it.s[1] + it.s[2];
      nodes += `<g class="leaf" data-idea="${it.id}" transform="translate(${lx},${it.y})" tabindex="0"><circle class="hit" r="26"/><circle class="ring" r="${9 + sum * 0.38}"/><circle class="dot" r="5"/><text x="${22 + sum * 0.3}" y="5">${sum}</text></g>`;
    });
  });
  $('#tree').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="paths">${paths}</g><g class="root" transform="translate(${rootX},${H / 2})"><circle r="13"/><circle r="22" class="halo"/><text y="46" text-anchor="middle">${IDEAS.title}</text></g>${nodes}</svg>`;
}
function radar(s) {
  const R = 78, cx = 110, cy = 104, ax = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
  const pt = (i, v) => `${(cx + Math.cos(ax[i]) * R * v).toFixed(1)},${(cy + Math.sin(ax[i]) * R * v).toFixed(1)}`;
  const grid = [0.33, 0.66, 1].map((k) => `<polygon points="${[0, 1, 2].map((i) => pt(i, k)).join(' ')}"/>`).join('');
  const names = ['YENİLİK', 'UYGULANABİLİRLİK', 'POTANSİYEL'];
  const lab = [0, 1, 2].map((i) => { const [x, yy] = pt(i, 1.2).split(','); return `<text x="${x}" y="${+yy + 3}" text-anchor="${i === 0 ? 'middle' : i === 1 ? 'start' : 'end'}">${names[i]} ${s[i]}</text>`; }).join('');
  return `<svg class="radar" viewBox="-110 0 440 200"><g class="grid">${grid}${[0, 1, 2].map((i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1).split(',')[0]}" y2="${pt(i, 1).split(',')[1]}"/>`).join('')}</g><polygon class="val" points="${[0, 1, 2].map((i) => pt(i, s[i] / 10)).join(' ')}"/>${lab}</svg>`;
}
function showIdea(id) {
  const it = flatIdeas[id];
  $$('#tree .leaf').forEach((g) => g.classList.toggle('on', +g.dataset.idea === id));
  $$('#tree path[data-p]').forEach((p) => p.classList.toggle('on', +p.dataset.p === id));
  $('#ideaDetail').innerHTML = `
    <div class="note-kicker">${it.type} · ${it.s[0] + it.s[1] + it.s[2]}/30</div>
    <h2>${esc(up(it.title))}</h2>
    ${radar(it.s)}
    <p class="serif">${esc(it.body)}</p>
    <h3 class="sec">DAYANDIĞI NOTLAR</h3>
    <div class="links">${it.from.map((n) => `<button type="button" class="linkrow" data-node="${n}"><span>${esc(data.nodes[n].title)}</span></button>`).join('')}</div>
    <div class="row"><button class="ghost" type="button">BEĞEN</button><button class="ghost" type="button">REDDET</button><button class="ghost" type="button">EYLEM PLANI</button><button class="ghost" type="button">PAZAR KONTROLÜ</button></div>`;
  sfx.click();
}
renderTree(); showIdea(0);
$('#ideas').addEventListener('click', (e) => {
  const g = e.target.closest('[data-idea]'); if (g) return showIdea(+g.dataset.idea);
  const b = e.target.closest('[data-node]'); if (b) { closePanels(); return brain.select(+b.dataset.node); }
  if (e.target.closest('[data-close]')) closePanels(); else if (e.target.closest('.ghost')) sfx.click();
});

/* ---------- ekle akışı (demo) ---------- */
const add = $('#add'), addIn = $('#addIn');
const STEPS = ['OKUNUYOR', 'ANALİZ EDİLİYOR', 'BAĞLANIYOR', 'FİKİR ÜRETİLİYOR'];
const STREAM = 'Dikkat, yeni dönemin en kıt kaynağı. İkinci beyin araçları bilgiyi saklamakla kalmıyor; neye dikkat edeceğimizi de seçiyor. Arşivindeki 4 notla bağlantı bulundu.';
let busy = false, added = false;
async function ingest() {
  if (busy) return;
  busy = true; sfx.open();
  closePanels(); if (brain.sel != null || brain.lobe != null) brain.select(null);
  document.body.classList.add('working');
  add.classList.remove('big');
  brain.think(true);
  const cap = $('#caption'), bar = $('#progress i'), stream = $('#stream');
  stream.textContent = ''; bar.style.width = '0%';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < STEPS.length; i++) {
    cap.textContent = STEPS[i]; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    bar.style.width = ((i + 1) / STEPS.length) * 100 + '%';
    if (i === 1) { for (const ch of STREAM) { stream.textContent += ch; await wait(16); } } else await wait(1150);
    if (i === 2 && !added) { added = true; brain.think(false); brain.grow(data.nodes.find((n) => n.spare).id); await wait(2600); }
  }
  brain.think(false);
  cap.textContent = 'BAĞLANTI KURULDU'; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  await wait(1600);
  document.body.classList.remove('working');
  addIn.value = ''; busy = false;
  const spare = data.nodes.find((n) => n.spare);
  brain.select(spare.id);
}
$('#addForm').addEventListener('submit', (e) => { e.preventDefault(); ingest(); });
addIn.addEventListener('focus', () => add.classList.add('big'));
addIn.addEventListener('blur', () => setTimeout(() => { if (!addIn.value) add.classList.remove('big'); }, 150));
['dragenter', 'dragover'].forEach((ev) => window.addEventListener(ev, (e) => { e.preventDefault(); document.body.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) document.body.classList.remove('drag'); if (ev === 'drop') ingest(); }));

/* ---------- alt bar ---------- */
const QN = ['DÜŞÜK', 'ORTA', 'YÜKSEK'];
$('#btnQuality').textContent = QN[brain.quality];
$('#bar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  sfx.click();
  if (b.id === 'btnList') toggle('list');
  if (b.id === 'btnIdeas') toggle('ideas');
  if (b.id === 'btnSearch') openSearch();
  if (b.id === 'btnAdd') { closePanels(); if (brain.sel != null) brain.select(null); add.classList.add('big'); addIn.focus(); }
  if (b.id === 'btnTheme') { mode = mode === 'dark' ? 'light' : 'dark'; applyTheme(); brain.setMode(mode); }
  if (b.id === 'btnSound') toggleSound();
  if (b.id === 'btnQuality') { brain.setQuality((brain.quality + 1) % 3); b.textContent = QN[brain.quality]; }
});
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') { if ($('.panel.open, #palette.open, #ideas.open')) closePanels(); else if (brain.sel != null || brain.lobe != null) brain.select(null); }
  if (e.key === 'n' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#btnAdd').click(); }
});
setTimeout(() => document.body.classList.add('ready'), 300);
