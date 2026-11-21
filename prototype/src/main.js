import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { marked } from 'marked';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs';

// pdf.js'i ana iş parçacığında çalıştır (ayrı worker dosyası gerekmez).
globalThis.pdfjsWorker = pdfWorker;

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

const TOPICS = [
  { key: 'İş & Girişim', color: '#f5a524' },
  { key: 'Teknoloji & YZ', color: '#7c5cff' },
  { key: 'Bilim', color: '#22c3ee' },
  { key: 'Sağlık', color: '#2ecc8f' },
  { key: 'Genel Kültür', color: '#ff6b9a' },
  { key: 'Diğer', color: '#94a3b8' },
];
const topicColor = (t) => (TOPICS.find((x) => x.key === t) || TOPICS[5]).color;

const LINK_TYPES = {
  'destekler': '#33d69f',
  'çelişir': '#ff5c7a',
  'örneğidir': '#f5a524',
  'devamıdır': '#36d6ff',
  'aynı konu': '#8b7bff',
  'neden-sonuç': '#ffb86b',
  'aynı kişi/kurum': '#e879f9',
  'zaman çizgisi': '#60a5fa',
  'kavram': '#64748b',
  'kişi': '#a78bfa',
  'elle': '#94a3b8',
};
const AI_LINK_TYPES = ['destekler', 'çelişir', 'örneğidir', 'devamıdır', 'aynı konu', 'neden-sonuç', 'aynı kişi/kurum', 'zaman çizgisi'];

const NOTE_TYPES = { source: 'Kaynak', concept: 'Kavram', person: 'Kişi', own: 'Kendi notum' };
const IDEA_TYPES = ['sentez', 'iş fikri', 'araştırma sorusu', 'hipotez'];

const MAX_CONTENT = 40000;

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const now = () => new Date().toISOString();
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const STOP = new Set('ve veya ile bir bu şu o da de ki için gibi çok daha en ne mi mı mu mü ama fakat ise olan olarak her hem the a an of to in and or for is are on with that this from by as at be it was were'.split(' '));
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

function banner(msg) {
  const b = $('#banner');
  if (!msg) { b.hidden = true; return; }
  b.textContent = msg;
  b.hidden = false;
}

function modal(html, bind) {
  const m = $('#modal');
  $('#modalCard').innerHTML = html;
  m.hidden = false;
  return new Promise((resolve) => {
    const close = (v) => { m.hidden = true; resolve(v); };
    m.onclick = (e) => { if (e.target === m) close(null); };
    $$('[data-choice]', m).forEach((b) => (b.onclick = () => close(b.dataset.choice)));
    bind?.(m, close);
  });
}

/* ------------------------------------------------------------------ */
/* Durum ve depolama                                                   */
/* ------------------------------------------------------------------ */

const state = {
  db: null,
  col: null,
  sample: null,
  sampleImages: false,
  docs: new Map(),
  view: 'ekle',
  selectedNote: null,
  noteFilter: { q: '', type: 'all', coll: '' },
  ideaFilter: 'all',
  editing: false,
  pendingFire: [],
  busy: false,
};

const all = (kind) => [...state.docs.values()].filter((d) => d.kind === kind);
const notes = () => all('note');
const links = () => all('link');
const ideas = () => all('idea');
const profile = () => state.docs.get('profile') || { kind: 'profile', interests: '', goals: '', projects: '', collections: '' };
const noteById = (id) => { const d = state.docs.get(id); return d && d.kind === 'note' ? d : null; };
const noteByTitle = (t) => notes().find((n) => norm(n.title) === norm(t));

async function save(doc) {
  const clean = JSON.parse(JSON.stringify(doc));
  state.docs.set(doc.id, clean);
  if (!state.col) return;
  try {
    await state.col.doc(doc.id).set(clean);
  } catch (e) {
    if (e?.code === 'unavailable') {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      await state.col.doc(doc.id).set(clean);
    } else {
      console.error(e);
      if (e?.code === 'quota_exceeded') banner('Depolama sınırı doldu: bazı notları silmeden yeni not eklenemez.');
      else toast('Kaydedilemedi: ' + (e?.message || e));
      throw e;
    }
  }
}

async function remove(id) {
  state.docs.delete(id);
  if (state.col) await state.col.doc(id).delete();
}

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderAll();
  });
}

async function initRuntime() {
  if (!window.claude?.use) {
    setSync('Çevrimdışı mod', 'err');
    banner('Bu sayfa Claude dışında açıldı: kaydetme ve yapay zeka çalışmaz.');
    return;
  }
  const [db, user, sample] = await Promise.all([
    window.claude.use('db').catch(() => null),
    window.claude.use('user').catch(() => null),
    window.claude.use('sample').catch(() => null),
  ]);
  state.sample = sample;
  if (sample?.limits) {
    try { state.sampleImages = !!(await sample.limits())?.images; } catch { state.sampleImages = false; }
  }
  if (!sample) banner('Yapay zeka bu görünümde kullanılamıyor; notları yine de görebilir ve düzenleyebilirsin.');

  const uid = user ? await user.id().catch(() => null) : null;
  if (!db || !uid) {
    setSync('Kaydetme kapalı', 'err');
    banner('Notlar kaydedilemiyor (giriş yapılmamış olabilir). Bu oturumda eklediklerin sayfa kapanınca kaybolur.');
    return;
  }
  state.db = db;
  state.col = db.collection('data/users/' + uid);
  setSync('Yükleniyor…');
  const timer = setTimeout(() => setSync('Sunucuya ulaşılamıyor', 'err'), 10000);
  state.col.onSnapshot(
    (snap) => {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') state.docs.delete(ch.doc.id);
        else state.docs.set(ch.doc.id, { ...ch.doc.data(), id: ch.doc.id });
      }
      if (!snap.metadata.fromCache) { clearTimeout(timer); setSync('Senkron', 'ok'); }
      scheduleRender();
    },
    (err) => {
      clearTimeout(timer);
      setSync('Bağlantı koptu', 'err');
      console.error(err);
    },
  );
}

function setSync(text, cls = '') {
  const s = $('#sync');
  s.textContent = text;
  s.className = 'sync ' + cls;
}

/* ------------------------------------------------------------------ */
/* Yapay zeka                                                          */
/* ------------------------------------------------------------------ */

function parseJSON(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

async function ask(prompt, opts = {}) {
  if (!state.sample) throw new Error('Yapay zeka kullanılamıyor');
  const r = await state.sample(prompt, opts);
  return r.text;
}

async function askJSON(prompt, opts = {}) {
  if (!state.sample) throw new Error('Yapay zeka kullanılamıyor');
  const full = prompt + '\n\nYalnızca geçerli JSON döndür; açıklama, markdown ya da kod bloğu ekleme.';
  if (typeof state.sample.json === 'function') {
    try {
      const v = await state.sample.json(full, opts);
      if (v && typeof v === 'object') return v;
    } catch (e) {
      if (e?.code && e.code !== 'invalid_output' && e.code !== 'parse_error') throw e;
    }
  }
  const r = await state.sample(full, opts);
  return parseJSON(r.text);
}

function aiError(e) {
  if (e?.code === 'not_granted') return 'Yapay zeka izni verilmedi.';
  if (e?.code === 'rate_limited') return 'Çok sık istek gönderildi; biraz bekleyip tekrar dene.';
  return e?.message || String(e);
}

function profileText() {
  const p = profile();
  const liked = ideas().filter((i) => i.status === 'liked').slice(-8).map((i) => '+ ' + i.title);
  const disliked = ideas().filter((i) => i.status === 'disliked').slice(-8).map((i) => '- ' + i.title);
  const learned = p.learned ? 'Öğrenilen ilgi alanları: ' + p.learned : '';
  return [
    p.interests && 'İlgi alanları: ' + p.interests,
    p.goals && 'Hedefler: ' + p.goals,
    p.projects && 'Aktif projeler:\n' + p.projects,
    learned,
    liked.length && 'Beğendiği fikirler:\n' + liked.join('\n'),
    disliked.length && 'Beğenmediği fikirler:\n' + disliked.join('\n'),
  ].filter(Boolean).join('\n') || '(profil boş)';
}

/* ------------------------------------------------------------------ */
/* İçerik okuma                                                        */
/* ------------------------------------------------------------------ */

async function readPdf(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
  let out = '';
  const pages = Math.min(doc.numPages, 60);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it) => it.str).join(' ') + '\n\n';
    if (out.length > MAX_CONTENT * 1.5) break;
  }
  return out.trim();
}

async function collectInput({ text, url, why, files }) {
  const parts = [];
  const images = [];
  const fileNames = [];
  if (text) parts.push(text);
  for (const f of files) {
    fileNames.push(f.name);
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      const t = await readPdf(f);
      parts.push(`--- PDF: ${f.name} ---\n${t}`);
    } else if (f.type.startsWith('image/')) {
      images.push(f);
    } else {
      parts.push(`--- Dosya: ${f.name} ---\n${await f.text()}`);
    }
  }
  let content = parts.join('\n\n').trim();
  const urlInText = !url && /^https?:\/\/\S+$/.test(content) ? content : '';
  if (urlInText) { url = urlInText; content = ''; }
  return { content: content.slice(0, MAX_CONTENT), url: url || '', why: why || '', images, fileNames };
}

/* ------------------------------------------------------------------ */
/* Analiz hattı                                                        */
/* ------------------------------------------------------------------ */

const STEPS = ['İçerik okunuyor', 'Tekrar kontrolü', 'Analiz ve detaylandırma', 'Bağlantılar ve fikirler', 'Kavram ve kişi notları', 'Kaydediliyor'];

function pipelineUI() {
  const el = $('#pipeline');
  el.hidden = false;
  el.innerHTML = STEPS.map((s, i) => `<div class="step" data-i="${i}"><span class="dot"></span>${s}</div>`).join('');
  return {
    set(i, st, extra) {
      const s = $(`.step[data-i="${i}"]`, el);
      if (!s) return;
      s.className = 'step ' + st;
      if (extra) s.innerHTML = `<span class="dot"></span>${esc(STEPS[i])} — ${esc(extra)}`;
    },
  };
}

function analysisPrompt(inp) {
  const kind = inp.images.length && !inp.content ? 'görsel' : inp.url && !inp.content ? 'yalnızca link' : 'metin';
  return `Sen "Sinaps" adlı kişisel bilgi asistanısın. Kullanıcının internetten bulduğu bir veriyi inceleyip Türkçe, detaylı ve dürüst bir analiz çıkar.

Kullanıcı profili:
${profileText()}

Veri türü: ${kind}
${inp.url ? 'Kaynak link: ' + inp.url : ''}
${inp.why ? 'Kullanıcının notu (neden kaydetti): ' + inp.why : ''}
${inp.fileNames.length ? 'Dosyalar: ' + inp.fileNames.join(', ') : ''}
${inp.images.length ? 'Ekli görseller var: görseldeki yazıyı oku (OCR), grafik/tablo/diyagramı yorumla ve olası kaynağını tahmin et.' : ''}
${inp.url && !inp.content ? 'DİKKAT: Sayfa içeriği verilmedi; yalnızca linkten ve kendi bilginden çıkarım yapıyorsun. Bunu özet ve güvenilirlik notlarında açıkça belirt.' : ''}

İçerik:
"""
${inp.content || '(metin yok)'}
"""

Şu JSON yapısını doldur (tüm metinler Türkçe):
{
  "title": "kısa ve açıklayıcı başlık",
  "sourceType": "makale | haber | blog | akademik | sosyal medya | video | podcast | görsel | doküman | diğer",
  "topic": "${TOPICS.map((t) => t.key).join(' | ')}",
  "language": "kaynağın orijinal dili (ör. İngilizce)",
  "summary": "2-3 cümlelik özet",
  "longSummary": "1-2 paragraflık ayrıntılı özet",
  "keyPoints": ["ana fikir/iddia/rakam", "..."],
  "tags": ["küçük harfli kısa etiketler, en fazla 6"],
  "credibility": { "score": 1-5 arası sayı, "verdict": "tek cümle değerlendirme", "notes": ["yazar, tarih, kanıt, taraf tutma vb. gözlemler"] },
  "concepts": [{ "name": "önemli kavram", "explanation": "2-3 cümle açıklama" }],
  "people": [{ "name": "ad soyad ya da kurum", "role": "bu içerikteki rolü" }],
  "counterViews": ["konunun karşıt ya da farklı görüşleri"],
  "qa": [{ "q": "veriyle ilgili düşündürücü soru", "a": "cevap" }],
  "critique": ["zayıf nokta, eksik veri ya da dikkat edilmesi gereken husus"],
  "actions": ["bu veriyle kullanıcının yapabileceği somut adım"],
  "events": [{ "date": "YYYY ya da YYYY-AA-GG", "text": "içerikte geçen tarihli olay" }],
  "imageNotes": "görsel varsa: okunan yazı + yorum + olası kaynak; yoksa boş"
}
Kavramlar en fazla 6, kişiler en fazla 5, keyPoints 3-7 madde olsun. İçerikte olmayan bilgiyi uydurma; kendi genel bilginle detaylandırdığın yerleri "(genel bilgi)" diye işaretle.`;
}

function candidateNotes(a, excludeId) {
  const qWords = new Set([...words(a.title), ...words(a.summary), ...(a.tags || []).flatMap(words)]);
  const conceptNames = new Set((a.concepts || []).map((c) => norm(c.name)));
  const peopleNames = new Set((a.people || []).map((p) => norm(p.name)));
  const scored = notes()
    .filter((n) => n.id !== excludeId && (n.type === 'source' || n.type === 'own'))
    .map((n) => {
      let s = 0;
      for (const w of words(n.title + ' ' + (n.summary || '') + ' ' + (n.tags || []).join(' '))) if (qWords.has(w)) s += 1;
      for (const t of n.tags || []) if ((a.tags || []).map(norm).includes(norm(t))) s += 3;
      for (const c of n.concepts || []) if (conceptNames.has(norm(c))) s += 4;
      for (const p of n.people || []) if (peopleNames.has(norm(p))) s += 4;
      if (n.topic === a.topic) s += 1;
      return { n, s };
    })
    .sort((x, y) => y.s - x.s);
  const top = scored.filter((x) => x.s > 0).slice(0, 24).map((x) => x.n);
  const recent = notes().filter((n) => n.id !== excludeId && n.type === 'source' && !top.includes(n))
    .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || '')).slice(0, 6);
  return [...top, ...recent];
}

function linkPrompt(a, cands) {
  const list = cands.map((n) => `- id: ${n.id} | başlık: ${n.title} | etiketler: ${(n.tags || []).join(', ')} | özet: ${(n.summary || '').slice(0, 260)}`).join('\n');
  return `Sen "Sinaps" adlı kişisel bilgi asistanısın. Yeni bir not eklendi; bunu kullanıcının eski notlarıyla bağla ve yeni fikirler üret.

Kullanıcı profili:
${profileText()}

YENİ NOT
Başlık: ${a.title}
Konu: ${a.topic}
Özet: ${a.summary}
Ana fikirler: ${(a.keyPoints || []).join(' / ')}
Etiketler: ${(a.tags || []).join(', ')}
Olaylar: ${(a.events || []).map((e) => e.date + ' ' + e.text).join(' / ')}

ESKİ NOTLAR
${list || '(henüz eski not yok)'}

Görevler:
1. Gerçekten anlamlı ilişkisi olan eski notları seç (zorlama bağlantı kurma). Tür şunlardan biri olsun: ${AI_LINK_TYPES.join(', ')}. Çelişkileri özellikle yakala.
2. Yeni notla (ve bağlandığı notlarla) ilgili 2-4 fikir üret. Türler: ${IDEA_TYPES.join(', ')}. Kullanıcının profiline ve beğenilerine uygun olsun; beğenmediklerine benzer fikirlerden kaçın.
3. Yeni veri kullanıcının aktif projelerinden birine yarıyorsa belirt.

JSON:
{
  "links": [{ "id": "eski not id", "type": "tür", "reason": "neden bağlı, 1 cümle", "strength": 1-3 }],
  "ideas": [{ "title": "kısa başlık", "body": "2-4 cümle açıklama", "type": "tür", "novelty": 1-10, "feasibility": 1-10, "potential": 1-10, "fromNotes": ["ilgili eski not id'leri"] }],
  "projectHints": [{ "project": "proje adı", "why": "nasıl yarar" }]
}`;
}

function buildBody(a, inp) {
  const L = [];
  const meta = [a.sourceType, a.language && 'Dil: ' + a.language, inp.url && `[Kaynak](${inp.url})`].filter(Boolean).join(' · ');
  if (meta) L.push('> ' + meta, '');
  L.push('## Özet', a.summary || '', '', a.longSummary || '', '');
  if (a.keyPoints?.length) L.push('## Ana fikirler', ...a.keyPoints.map((k) => '- ' + k), '');
  if (a.imageNotes) L.push('## Görsel incelemesi', a.imageNotes, '');
  const det = [];
  if (a.concepts?.length) det.push('### Kavramlar', ...a.concepts.map((c) => `- **[[${c.name}]]**: ${c.explanation}`), '');
  if (a.people?.length) det.push('### Kişiler ve kurumlar', ...a.people.map((p) => `- **[[${p.name}]]**: ${p.role}`), '');
  if (a.counterViews?.length) det.push('### Karşıt görüşler', ...a.counterViews.map((c) => '- ' + c), '');
  if (a.qa?.length) det.push('### Soru-cevap', ...a.qa.flatMap((q) => [`**S:** ${q.q}`, '', `**C:** ${q.a}`, '']));
  if (a.events?.length) det.push('### Zaman çizgisi', ...a.events.map((e) => `- **${e.date}**: ${e.text}`), '');
  if (det.length) L.push('## Detaylandırma', ...det);
  const cr = a.credibility || {};
  L.push('## Eleştiri ve güvenilirlik', `**Güvenilirlik:** ${'★'.repeat(clamp(cr.score, 0, 5))}${'☆'.repeat(5 - clamp(cr.score, 0, 5))} — ${cr.verdict || ''}`, '');
  if (cr.notes?.length) L.push(...cr.notes.map((n) => '- ' + n), '');
  if (a.critique?.length) L.push('**Zayıf noktalar**', ...a.critique.map((c) => '- ' + c), '');
  if (a.actions?.length) L.push('## Aksiyonlar', ...a.actions.map((x) => '- [ ] ' + x), '');
  if (inp.why) L.push('## Neden kaydettim', inp.why, '');
  return L.join('\n');
}

function findDuplicate(inp) {
  if (inp.url) {
    const u = inp.url.replace(/[#?].*$/, '').replace(/\/$/, '');
    const hit = notes().find((n) => n.url && n.url.replace(/[#?].*$/, '').replace(/\/$/, '') === u);
    if (hit) return hit;
  }
  if (inp.content && inp.content.length > 200) {
    const a = new Set(words(inp.content.slice(0, 4000)));
    for (const n of notes()) {
      if (!n.content || n.content.length < 200) continue;
      const b = new Set(words(n.content.slice(0, 4000)));
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      const j = inter / (a.size + b.size - inter || 1);
      if (j > 0.6) return n;
    }
  }
  return null;
}

async function ingest(raw) {
  if (state.busy) return;
  if (!state.sample) { toast('Yapay zeka kullanılamıyor.'); return; }
  state.busy = true;
  const btn = $('#ingestBtn');
  btn.disabled = true;
  $('#ingestResult').innerHTML = '';
  const ui = pipelineUI();
  let step = 0;
  try {
    ui.set(0, 'run');
    const inp = await collectInput(raw);
    if (!inp.content && !inp.url && !inp.images.length) throw new Error('Boş veri gönderilemez.');
    if (inp.images.length && !state.sampleImages) throw new Error('Bu görünümde yapay zeka görsel okuyamıyor.');
    ui.set(0, 'done');

    step = 1; ui.set(1, 'run');
    const dup = findDuplicate(inp);
    let mergeInto = null;
    if (dup) {
      const choice = await modal(`
        <h2>Bu veri zaten var gibi</h2>
        <p>“<b>${esc(dup.title)}</b>” notuna çok benziyor (${fmtDate(dup.createdAt)}).</p>
        <div class="row actions">
          <button class="btn" data-choice="merge">Mevcut nota ekle</button>
          <button class="btn" data-choice="new">Ayrı not olarak kaydet</button>
          <span class="spacer"></span>
          <button class="btn ghost" data-choice="cancel">Vazgeç</button>
        </div>`);
      if (!choice || choice === 'cancel') { ui.set(1, 'fail', 'vazgeçildi'); return; }
      if (choice === 'merge') mergeInto = dup;
    }
    ui.set(1, 'done', dup ? (mergeInto ? 'mevcut nota eklenecek' : 'ayrı not') : 'yeni');

    if (mergeInto) {
      step = 2; ui.set(2, 'run');
      const add = await ask(`Aşağıdaki mevcut nota yeni gelen veriyi ekleyeceğiz. Yeni verinin getirdiği YENİ bilgileri Türkçe, madde madde, kısa özetle (mevcut notta olanı tekrarlama).

MEVCUT NOT: ${mergeInto.title}
${mergeInto.summary}

YENİ VERİ:
${inp.content || inp.url}`, { modelTier: 'default', images: inp.images.length ? inp.images : undefined });
      ui.set(2, 'done');
      [3, 4].forEach((i) => ui.set(i, 'done', 'atlandı'));
      ui.set(5, 'run');
      const n = { ...mergeInto };
      n.body = (n.body || '') + `\n\n## Ek veri (${fmtDate(now())})\n${add}\n`;
      n.content = ((n.content || '') + '\n\n---\n\n' + (inp.content || '')).slice(0, MAX_CONTENT);
      n.updatedAt = now();
      await save(n);
      ui.set(5, 'done');
      showResult(n, 0, 0);
      fire(n.id);
      return;
    }

    step = 2; ui.set(2, 'run');
    const a = await askJSON(analysisPrompt(inp), { modelTier: 'default', images: inp.images.length ? inp.images : undefined });
    a.title = String(a.title || 'Başlıksız').slice(0, 160);
    if (!TOPICS.some((t) => t.key === a.topic)) a.topic = 'Diğer';
    a.tags = (a.tags || []).map((t) => norm(t)).filter(Boolean).slice(0, 6);
    a.concepts = (a.concepts || []).slice(0, 6);
    a.people = (a.people || []).slice(0, 5);
    ui.set(2, 'done', a.title);

    const noteId = newId('n');
    step = 3; ui.set(3, 'run');
    const cands = candidateNotes(a, noteId);
    let lr = { links: [], ideas: [], projectHints: [] };
    try {
      lr = await askJSON(linkPrompt(a, cands), { modelTier: 'default' });
    } catch (e) {
      console.warn('bağlantı adımı', e);
    }
    const validLinks = (lr.links || []).filter((l) => noteById(l.id) && l.id !== noteId);
    ui.set(3, 'done', `${validLinks.length} bağlantı, ${(lr.ideas || []).length} fikir`);

    step = 4; ui.set(4, 'run');
    const note = {
      id: noteId,
      kind: 'note',
      type: 'source',
      title: a.title,
      topic: a.topic,
      sourceType: a.sourceType || '',
      language: a.language || '',
      summary: a.summary || '',
      tags: a.tags,
      credibility: clamp(a.credibility?.score, 0, 5),
      concepts: a.concepts.map((c) => c.name),
      people: a.people.map((p) => p.name),
      events: (a.events || []).slice(0, 12),
      url: inp.url,
      why: inp.why,
      content: inp.content,
      fileNames: inp.fileNames,
      collections: [],
      projectHints: (lr.projectHints || []).slice(0, 4),
      body: buildBody(a, inp),
      createdAt: now(),
      updatedAt: now(),
    };
    const writes = [];
    let entityLinks = 0;
    const entity = async (name, type, text) => {
      if (!name) return;
      let e = noteByTitle(name);
      const line = `- [[${a.title}]]: ${text}`;
      if (e && (e.type === 'concept' || e.type === 'person')) {
        e = { ...e, body: (e.body || '') + '\n' + line, updatedAt: now() };
      } else if (!e) {
        e = {
          id: newId('n'), kind: 'note', type, title: name, topic: a.topic, summary: text, tags: [], concepts: [], people: [],
          body: `${text}\n\n## Geçtiği kaynaklar\n${line}`, createdAt: now(), updatedAt: now(), collections: [],
        };
      }
      writes.push(e);
      writes.push({ id: newId('l'), kind: 'link', a: note.id, b: e.id, type: type === 'concept' ? 'kavram' : 'kişi', reason: text.slice(0, 160), strength: 1, createdAt: now() });
      entityLinks++;
    };
    for (const c of a.concepts) await entity(c.name, 'concept', c.explanation || '');
    for (const p of a.people) await entity(p.name, 'person', p.role || '');
    ui.set(4, 'done', `${entityLinks} kavram/kişi`);

    step = 5; ui.set(5, 'run');
    await save(note);
    for (const w of writes) await save(w);
    for (const l of validLinks) {
      await save({
        id: newId('l'), kind: 'link', a: note.id, b: l.id,
        type: LINK_TYPES[l.type] ? l.type : 'aynı konu',
        reason: String(l.reason || '').slice(0, 300), strength: clamp(l.strength, 1, 3), createdAt: now(),
      });
    }
    for (const i of (lr.ideas || []).slice(0, 4)) {
      await save({
        id: newId('i'), kind: 'idea', title: String(i.title || '').slice(0, 160), body: i.body || '',
        type: IDEA_TYPES.includes(i.type) ? i.type : 'sentez',
        novelty: clamp(i.novelty, 0, 10), feasibility: clamp(i.feasibility, 0, 10), potential: clamp(i.potential, 0, 10),
        fromNotes: [note.id, ...(i.fromNotes || []).filter((x) => noteById(x))].slice(0, 6),
        status: 'new', createdAt: now(),
      });
    }
    ui.set(5, 'done');
    maybeLearnInterests();
    showResult(note, validLinks.length, (lr.ideas || []).length);
    fire(note.id);
    resetForm();
  } catch (e) {
    console.error(e);
    ui.set(step, 'fail', aiError(e));
  } finally {
    state.busy = false;
    btn.disabled = false;
    scheduleRender();
  }
}

function showResult(note, nLinks, nIdeas) {
  $('#ingestResult').innerHTML = `
    <div class="card result-card">
      <div class="card-title">${esc(note.title)}</div>
      <div class="card-sum">${esc(note.summary)}</div>
      <div class="row actions">
        <span class="muted small">${nLinks} bağlantı · ${nIdeas} yeni fikir</span>
        <span class="spacer"></span>
        <a class="btn small" href="#beyin">Beyinde gör</a>
        <button class="btn small primary" type="button" data-open="${note.id}">Notu aç</button>
      </div>
    </div>`;
}

let learnCounter = 0;
async function maybeLearnInterests() {
  learnCounter++;
  const n = notes().filter((x) => x.type === 'source');
  if (n.length < 5 || learnCounter % 5 !== 0) return;
  try {
    const titles = n.slice(-40).map((x) => '- ' + x.title + ' [' + (x.tags || []).join(', ') + ']').join('\n');
    const text = await ask(`Kullanıcının kaydettiği notların başlıkları aşağıda. İlgi alanlarını Türkçe, virgülle ayrılmış 5-10 kısa ifade olarak çıkar. Sadece listeyi yaz.\n\n${titles}`, { modelTier: 'quick' });
    await save({ ...profile(), id: 'profile', kind: 'profile', learned: text.trim().slice(0, 500) });
  } catch (e) { console.warn(e); }
}

/* ------------------------------------------------------------------ */
/* Not işlemleri                                                       */
/* ------------------------------------------------------------------ */

async function deepen(note) {
  toast('Derin inceleme başladı…', 2500);
  try {
    const related = linksOf(note.id).map((l) => noteById(l.other)?.title).filter(Boolean).slice(0, 10);
    const text = await ask(`Sen "Sinaps" adlı bilgi asistanısın. Aşağıdaki notu derinleştir. Türkçe ve markdown yaz, başlıklar "###" seviyesinde olsun.
Bölümler: Bağlam ve arka plan; Önemli veriler ve kanıtlar; Farklı perspektifler; Açık sorular ve bilgi boşlukları; Sonraki okuma/araştırma önerileri; Kullanıcının hedeflerine etkisi.
Kendi genel bilginden eklediğin bilgiler için dikkatli ol, emin olmadığını belirt.

Kullanıcı profili:
${profileText()}

Bağlantılı notlar: ${related.join(', ') || 'yok'}

NOT: ${note.title}
${note.body}

ORİJİNAL İÇERİK (kısaltılmış):
${(note.content || '').slice(0, 15000)}`, { modelTier: 'complex' });
    const cur = noteById(note.id) || note;
    await save({ ...cur, body: cur.body + `\n\n## Derin inceleme (${fmtDate(now())})\n${text}\n`, updatedAt: now() });
    toast('Derin inceleme nota eklendi.');
  } catch (e) {
    toast('Derin inceleme başarısız: ' + aiError(e));
  }
}

async function findLinksFor(note) {
  if (!state.sample) return toast('Yapay zeka kullanılamıyor.');
  toast('Bağlantılar aranıyor…', 2000);
  try {
    const a = { title: note.title, topic: note.topic, summary: note.summary || (note.body || '').slice(0, 600), keyPoints: [], tags: note.tags || [], concepts: [], people: [] };
    const existing = new Set(linksOf(note.id).map((l) => l.other));
    const lr = await askJSON(linkPrompt(a, candidateNotes(a, note.id)), { modelTier: 'default' });
    let n = 0;
    for (const l of lr.links || []) {
      if (!noteById(l.id) || l.id === note.id || existing.has(l.id)) continue;
      await save({ id: newId('l'), kind: 'link', a: note.id, b: l.id, type: LINK_TYPES[l.type] ? l.type : 'aynı konu', reason: String(l.reason || '').slice(0, 300), strength: clamp(l.strength, 1, 3), createdAt: now() });
      n++;
    }
    for (const i of (lr.ideas || []).slice(0, 3)) {
      await save({ id: newId('i'), kind: 'idea', title: i.title, body: i.body, type: IDEA_TYPES.includes(i.type) ? i.type : 'sentez', novelty: clamp(i.novelty, 0, 10), feasibility: clamp(i.feasibility, 0, 10), potential: clamp(i.potential, 0, 10), fromNotes: [note.id, ...(i.fromNotes || []).filter((x) => noteById(x))], status: 'new', createdAt: now() });
    }
    toast(`${n} yeni bağlantı bulundu.`);
    fire(note.id);
  } catch (e) {
    toast('Bağlantı aranamadı: ' + aiError(e));
  }
}

async function syncWikiLinks(note) {
  const targets = [...(note.body || '').matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim());
  const existing = new Set(linksOf(note.id).map((l) => l.other));
  for (const t of new Set(targets)) {
    const target = noteByTitle(t);
    if (!target || target.id === note.id || existing.has(target.id)) continue;
    await save({ id: newId('l'), kind: 'link', a: note.id, b: target.id, type: 'elle', reason: 'Not içinde [[bağlantı]] ile bağlandı', strength: 1, createdAt: now() });
  }
}

async function deleteNote(note) {
  const c = await modal(`<h2>Not silinsin mi?</h2><p>“${esc(note.title)}” ve bağlantıları silinecek.</p>
    <div class="row actions"><span class="spacer"></span><button class="btn ghost" data-choice="no">Vazgeç</button><button class="btn danger" data-choice="yes">Sil</button></div>`);
  if (c !== 'yes') return;
  for (const l of links().filter((l) => l.a === note.id || l.b === note.id)) await remove(l.id);
  await remove(note.id);
  state.selectedNote = null;
  scheduleRender();
}

function linksOf(id) {
  return links()
    .filter((l) => l.a === id || l.b === id)
    .map((l) => ({ ...l, other: l.a === id ? l.b : l.a }))
    .filter((l) => noteById(l.other));
}

/* ------------------------------------------------------------------ */
/* Görünümler                                                          */
/* ------------------------------------------------------------------ */

function route() {
  const v = (location.hash || '#ekle').slice(1);
  state.view = ['ekle', 'beyin', 'notlar', 'fikirler', 'profil'].includes(v) ? v : 'ekle';
  $$('.view').forEach((el) => (el.hidden = el.id !== 'view-' + state.view));
  $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.view === state.view));
  renderAll();
  if (state.view === 'beyin') showGraph();
  else pauseGraph();
}

function renderAll() {
  renderRecent();
  if (state.view === 'notlar') renderNotes();
  if (state.view === 'fikirler') renderIdeas();
  if (state.view === 'profil') renderProfile();
  if (state.view === 'beyin') updateGraph();
}

function topicPill(t) {
  return `<span class="topic" style="background:${topicColor(t)}">${esc(t || 'Diğer')}</span>`;
}

function renderRecent() {
  const list = notes().filter((n) => n.type === 'source' || n.type === 'own')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);
  $('#recentList').innerHTML = list.length
    ? list.map((n) => `<div class="card" data-open="${n.id}"><div class="card-title">${esc(n.title)}</div><div class="card-sum">${esc(n.summary || '')}</div></div>`).join('')
    : '<div class="muted">Henüz bir şey eklemedin.</div>';
}

/* --- Notlar --- */

function filteredNotes() {
  const { q, type, coll } = state.noteFilter;
  const qq = norm(q);
  return notes()
    .filter((n) => type === 'all' || n.type === type)
    .filter((n) => !coll || (n.collections || []).includes(coll))
    .filter((n) => !qq || norm(n.title + ' ' + (n.summary || '') + ' ' + (n.tags || []).join(' ') + ' ' + (n.body || '')).includes(qq))
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
}

function collections() {
  return (profile().collections || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function renderNotes() {
  $('#typeChips').innerHTML = [['all', 'Hepsi'], ...Object.entries(NOTE_TYPES)]
    .map(([k, v]) => `<button type="button" class="chip ${state.noteFilter.type === k ? 'on' : ''}" data-ntype="${k}">${v}</button>`).join('');
  const cs = collections();
  $('#collFilter').innerHTML = `<option value="">Tüm koleksiyonlar</option>` + cs.map((c) => `<option ${state.noteFilter.coll === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#collFilter').hidden = !cs.length;
  const list = filteredNotes();
  $('#noteList').innerHTML = list.length
    ? list.map((n) => `<div class="note-item ${state.selectedNote === n.id ? 'active' : ''}" data-select="${n.id}">
        <div class="t"><span class="topic" style="background:${topicColor(n.topic)};width:8px;height:8px;padding:0"></span>${esc(n.title)}</div>
        <div class="s">${esc(NOTE_TYPES[n.type] || '')} · ${esc(n.summary || '')}</div></div>`).join('')
    : '<div class="muted small" style="padding:10px">Not bulunamadı.</div>';
  if (!state.editing) renderNoteDetail();
}

function renderMarkdown(md) {
  const withWiki = String(md || '').replace(/\[\[([^\]]+)\]\]/g, (_, t) => {
    const target = noteByTitle(t.trim());
    return target
      ? `<a class="wiki" data-open="${target.id}">${esc(t)}</a>`
      : `<a class="wiki missing" title="Bu başlıkta not yok">${esc(t)}</a>`;
  });
  const html = marked.parse(withWiki, { breaks: false, gfm: true });
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script,iframe,object,embed,style').forEach((x) => x.remove());
  tpl.content.querySelectorAll('*').forEach((el) => {
    for (const at of [...el.attributes]) if (/^on/i.test(at.name) || (at.name === 'href' && /^\s*javascript:/i.test(at.value))) el.removeAttribute(at.name);
    if (el.tagName === 'A' && el.getAttribute('href')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
  });
  const div = document.createElement('div');
  div.appendChild(tpl.content);
  return div.innerHTML;
}

function noteView(n, compact = false) {
  const ls = linksOf(n.id).sort((a, b) => (b.strength || 1) - (a.strength || 1));
  const relIdeas = ideas().filter((i) => (i.fromNotes || []).includes(n.id));
  const stars = n.credibility ? `<span class="stars" title="Güvenilirlik">${'★'.repeat(n.credibility)}${'☆'.repeat(5 - n.credibility)}</span>` : '';
  const cs = collections();
  return `
    <div class="note-head">
      <h1>${esc(n.title)}</h1>
      ${compact ? '' : `<div class="note-tools">
        <button class="btn small" data-act="edit">Düzenle</button>
        ${n.type !== 'concept' && n.type !== 'person' ? '<button class="btn small" data-act="deep">Daha derin incele</button>' : ''}
        <button class="btn small" data-act="links">Bağlantı bul</button>
        <button class="btn small danger" data-act="delete">Sil</button>
      </div>`}
    </div>
    <div class="note-meta">
      ${topicPill(n.topic)} <span class="badge">${esc(NOTE_TYPES[n.type] || '')}</span> ${stars}
      <span>${fmtDate(n.createdAt)}</span>
      ${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">Kaynağa git ↗</a>` : ''}
    </div>
    <div>${(n.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
    ${!compact && cs.length ? `<div class="chips">${cs.map((c) => `<button type="button" class="chip ${(n.collections || []).includes(c) ? 'on' : ''}" data-coll="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${(n.projectHints || []).length ? `<div class="panel"><h3>Projelerine katkısı</h3>${n.projectHints.map((p) => `<div><b>${esc(p.project)}</b>: ${esc(p.why)}</div>`).join('')}</div>` : ''}
    <div class="md">${renderMarkdown(compact ? (n.summary || n.body) : n.body)}</div>
    <div class="panel">
      <h3>Bağlantılar (${ls.length})</h3>
      ${ls.length ? ls.map((l) => { const o = noteById(l.other); return `<div class="link-row">
        <span class="link-type" style="background:${LINK_TYPES[l.type] || '#64748b'}">${esc(l.type)}</span>
        <div><a data-open="${o.id}">${esc(o.title)}</a><div class="why">${esc(l.reason || '')}</div></div></div>`; }).join('') : '<div class="muted small">Henüz bağlantı yok.</div>'}
    </div>
    ${relIdeas.length ? `<div class="panel"><h3>Bu nottan doğan fikirler</h3>${relIdeas.map((i) => `<div class="link-row"><span class="link-type" style="background:var(--accent)">${esc(i.type)}</span><div><b>${esc(i.title)}</b><div class="why">${esc(i.body)}</div></div></div>`).join('')}</div>` : ''}
    ${!compact && n.content ? `<details class="orig panel"><summary>Orijinal içerik (${esc(n.language || 'kaynak dili')})</summary><pre>${esc(n.content)}</pre></details>` : ''}
    ${compact ? `<div class="row"><button class="btn primary small" data-goto="${n.id}">Notu aç</button></div>` : ''}`;
}

function renderNoteDetail() {
  const el = $('#noteDetail');
  const n = noteById(state.selectedNote);
  if (!n) {
    el.innerHTML = `<div class="empty">Soldan bir not seç ya da <a href="#ekle">yeni veri ekle</a>.</div>`;
    return;
  }
  el.innerHTML = noteView(n);
}

function openEditor(n) {
  state.editing = true;
  const el = $('#noteDetail');
  el.innerHTML = `
    <form class="editor" id="editForm">
      <input id="edTitle" type="text" value="${esc(n?.title || '')}" placeholder="Başlık">
      <div class="row"><input id="edTags" type="text" value="${esc((n?.tags || []).join(', '))}" placeholder="Etiketler (virgülle)"></div>
      <div class="row"><select id="edTopic">${TOPICS.map((t) => `<option ${n?.topic === t.key ? 'selected' : ''}>${t.key}</option>`).join('')}</select></div>
      <p class="muted small">Markdown yazabilirsin. Başka bir nota bağlamak için <code>[[Not başlığı]]</code> yaz.</p>
      <textarea id="edBody">${esc(n?.body || '')}</textarea>
      <div class="row actions">
        <button class="btn ghost" type="button" id="edCancel">Vazgeç</button>
        <span class="spacer"></span>
        ${state.sample ? '<button class="btn" type="button" id="edSaveLink">Kaydet ve bağlantı bul</button>' : ''}
        <button class="btn primary" type="submit">Kaydet</button>
      </div>
    </form>`;
  const doSave = async (findLinks) => {
    const title = $('#edTitle').value.trim() || 'Başlıksız';
    const body = $('#edBody').value;
    const base = n || { id: newId('n'), kind: 'note', type: 'own', createdAt: now(), collections: [], concepts: [], people: [] };
    const summary = n?.summary && n.type !== 'own' ? n.summary : body.replace(/[#>*\[\]_`-]/g, '').trim().slice(0, 220);
    const doc = {
      ...base, title, body, summary,
      tags: $('#edTags').value.split(',').map((t) => norm(t)).filter(Boolean).slice(0, 10),
      topic: $('#edTopic').value,
      updatedAt: now(),
    };
    await save(doc);
    await syncWikiLinks(doc);
    state.editing = false;
    state.selectedNote = doc.id;
    scheduleRender();
    if (findLinks) findLinksFor(doc);
  };
  $('#editForm').onsubmit = (e) => { e.preventDefault(); doSave(false); };
  $('#edSaveLink')?.addEventListener('click', () => doSave(true));
  $('#edCancel').onclick = () => { state.editing = false; renderNotes(); };
  $('#edTitle').focus();
}

async function toggleCollection(n, c) {
  const set = new Set(n.collections || []);
  set.has(c) ? set.delete(c) : set.add(c);
  await save({ ...n, collections: [...set], updatedAt: now() });
  scheduleRender();
}

function openNote(id) {
  state.selectedNote = id;
  state.editing = false;
  if (location.hash !== '#notlar') location.hash = 'notlar';
  else renderNotes();
}

/* --- Fikirler --- */

function ideaScore(i) { return (i.novelty || 0) + (i.feasibility || 0) + (i.potential || 0); }

function renderIdeas() {
  $('#ideaChips').innerHTML = [['all', 'Hepsi'], ['liked', 'Beğendiklerim'], ...IDEA_TYPES.map((t) => [t, t])]
    .map(([k, v]) => `<button type="button" class="chip ${state.ideaFilter === k ? 'on' : ''}" data-ifilter="${esc(k)}">${esc(v)}</button>`).join('');
  const f = state.ideaFilter;
  const list = ideas()
    .filter((i) => f === 'all' ? i.status !== 'disliked' : f === 'liked' ? i.status === 'liked' : i.type === f)
    .sort((a, b) => ideaScore(b) - ideaScore(a));
  const open = state.openIdea;
  $('#ideaList').innerHTML = list.length ? list.map((i) => `
    <div class="idea ${i.status || ''}" data-idea="${i.id}">
      <div class="idea-top">
        <span class="badge">${esc(i.type)}</span>
        <div class="idea-title">${esc(i.title)}</div>
        <span class="muted small">${ideaScore(i)}/30</span>
      </div>
      <div>${esc(i.body)}</div>
      <div class="scores">
        ${[['Yenilik', i.novelty], ['Uygulanabilirlik', i.feasibility], ['Potansiyel', i.potential]].map(([k, v]) => `<div class="score"><label>${k} ${v || 0}</label><div class="bar"><i style="width:${(v || 0) * 10}%"></i></div></div>`).join('')}
      </div>
      <div class="from">Kaynak: ${(i.fromNotes || []).map((id) => noteById(id)).filter(Boolean).map((n) => `<a data-open="${n.id}">${esc(n.title)}</a>`).join(', ') || '—'}</div>
      <div class="idea-actions">
        <button class="btn small ${i.status === 'liked' ? 'on' : ''}" data-iact="like">👍 Beğen</button>
        <button class="btn small ${i.status === 'disliked' ? 'on' : ''}" data-iact="dislike">👎 Reddet</button>
        <button class="btn small" data-iact="plan">Eylem planı</button>
        <button class="btn small" data-iact="market">Pazar/rakip kontrolü</button>
        <button class="btn small" data-iact="chat">Geliştir (sohbet)</button>
        <button class="btn small ghost danger" data-iact="del">Sil</button>
      </div>
      ${i.plan ? `<div class="idea-extra md"><h3>Eylem planı</h3>${renderMarkdown(i.plan)}</div>` : ''}
      ${i.market ? `<div class="idea-extra md"><h3>Pazar / rakip kontrolü</h3>${renderMarkdown(i.market)}</div>` : ''}
      ${open === i.id ? `<div class="idea-extra">
        <div class="chat">${(i.chat || []).map((m) => `<div class="msg ${m.role}">${m.role === 'assistant' ? renderMarkdown(m.content) : esc(m.content)}</div>`).join('')}</div>
        <form class="row" data-chatform="${i.id}"><input type="text" name="m" placeholder="Bu fikri nasıl geliştirelim?" autocomplete="off"><button class="btn primary small">Gönder</button></form>
      </div>` : ''}
    </div>`).join('')
    : `<div class="empty">Henüz fikir yok. Veri ekledikçe Sinaps fikir üretir.</div>`;
}

async function ideaAction(i, act) {
  if (act === 'like' || act === 'dislike') {
    const st = act === 'like' ? 'liked' : 'disliked';
    await save({ ...i, status: i.status === st ? 'new' : st });
    return scheduleRender();
  }
  if (act === 'del') { await remove(i.id); return scheduleRender(); }
  if (act === 'chat') { state.openIdea = state.openIdea === i.id ? null : i.id; return renderIdeas(); }
  const src = (i.fromNotes || []).map((id) => noteById(id)).filter(Boolean).map((n) => `- ${n.title}: ${n.summary}`).join('\n');
  try {
    toast(act === 'plan' ? 'Eylem planı hazırlanıyor…' : 'Pazar kontrolü yapılıyor…', 2500);
    if (act === 'plan') {
      const t = await ask(`Şu fikir için Türkçe, adım adım, uygulanabilir bir eylem planı yaz (markdown, numaralı adımlar, her adımda süre tahmini ve başarı ölçütü; en sonda ilk 48 saatte yapılacak 3 şey).\n\nKullanıcı profili:\n${profileText()}\n\nFİKİR: ${i.title}\n${i.body}\n\nDayandığı notlar:\n${src}`, { modelTier: 'default' });
      await save({ ...(state.docs.get(i.id) || i), plan: t });
    } else {
      const t = await ask(`Şu fikir daha önce yapılmış mı? Bildiğin benzer ürünleri, şirketleri, açık kaynak projeleri ve araştırmaları listele; farklılaşma fırsatlarını ve riskleri yaz. Türkçe, markdown. Bilgin belirli bir tarihe kadardır; güncel olmayabilecek bilgileri belirt.\n\nFİKİR: ${i.title}\n${i.body}`, { modelTier: 'default' });
      await save({ ...(state.docs.get(i.id) || i), market: t });
    }
    scheduleRender();
  } catch (e) { toast('Olmadı: ' + aiError(e)); }
}

async function ideaChat(i, msg) {
  const chat = [...(i.chat || []), { role: 'user', content: msg }];
  await save({ ...i, chat });
  renderIdeas();
  const src = (i.fromNotes || []).map((id) => noteById(id)).filter(Boolean).map((n) => `- ${n.title}: ${n.summary}`).join('\n');
  const sys = `Sen "Sinaps" adlı düşünce ortağısın. Kullanıcıyla aşağıdaki fikri geliştiriyorsun. Türkçe, net ve yapıcı ol; gerekirse eleştir.\n\nKullanıcı profili:\n${profileText()}\n\nFİKİR: ${i.title}\n${i.body}\n\nDayandığı notlar:\n${src}`;
  const messages = chat.slice(-12).map((m, idx) => ({ role: m.role, content: idx === 0 ? sys + '\n\n---\n\n' + m.content : m.content }));
  if (messages[0].role !== 'user') messages.shift();
  try {
    const r = await state.sample(messages, { modelTier: 'default', cache: false });
    await save({ ...(state.docs.get(i.id) || i), chat: [...chat, { role: 'assistant', content: r.text }].slice(-30) });
    renderIdeas();
  } catch (e) { toast('Cevap alınamadı: ' + aiError(e)); }
}

async function synthesize() {
  if (!state.sample) return toast('Yapay zeka kullanılamıyor.');
  const src = notes().filter((n) => n.type === 'source' || n.type === 'own').slice(-40);
  if (src.length < 3) return toast('Sentez için en az 3 not gerekli.');
  toast('Tüm arşivden sentez üretiliyor…', 3000);
  try {
    const list = src.map((n) => `- id: ${n.id} | ${n.title} | ${(n.summary || '').slice(0, 200)}`).join('\n');
    const r = await askJSON(`Sen "Sinaps" adlı bilgi asistanısın. Kullanıcının notlarını birlikte düşün; farklı notları birleştiren, tek tek notlarda görünmeyen 3-5 yeni fikir üret (sentez, iş fikri, araştırma sorusu, hipotez). Kullanıcının profiline uygun olsun.

Kullanıcı profili:
${profileText()}

NOTLAR:
${list}

JSON: { "ideas": [{ "title": "", "body": "", "type": "${IDEA_TYPES.join(' | ')}", "novelty": 1-10, "feasibility": 1-10, "potential": 1-10, "fromNotes": ["id"] }] }`, { modelTier: 'complex' });
    for (const i of (r.ideas || []).slice(0, 5)) {
      await save({ id: newId('i'), kind: 'idea', title: i.title, body: i.body, type: IDEA_TYPES.includes(i.type) ? i.type : 'sentez', novelty: clamp(i.novelty, 0, 10), feasibility: clamp(i.feasibility, 0, 10), potential: clamp(i.potential, 0, 10), fromNotes: (i.fromNotes || []).filter((x) => noteById(x)), status: 'new', createdAt: now() });
    }
    toast('Yeni fikirler eklendi.');
    scheduleRender();
  } catch (e) { toast('Sentez başarısız: ' + aiError(e)); }
}

/* --- Profil --- */

function renderProfile() {
  const p = profile();
  const f = $('#profileForm');
  if (f.dataset.dirty) return;
  $('#pInterests').value = p.interests || '';
  $('#pGoals').value = p.goals || '';
  $('#pProjects').value = p.projects || '';
  $('#pCollections').value = p.collections || '';
  $('#learned').innerHTML = p.learned ? `<div class="panel"><h3>Sinaps'ın senden öğrendiği ilgi alanları</h3>${esc(p.learned)}</div>` : '';
}

/* ------------------------------------------------------------------ */
/* 3D Beyin                                                            */
/* ------------------------------------------------------------------ */

const G = { graph: null, bloom: null, nodes: new Map(), links: new Map(), sig: '', angle: 0, idleUntil: 0, raf: 0, pulses: new Map() };

function isDark() { return document.documentElement.dataset.theme !== 'light'; }

function legend() {
  $('#legend').innerHTML = TOPICS.map((t) => `<span><i style="background:${t.color}"></i>${t.key}</span>`).join('');
}

function initGraph() {
  const el = $('#graph');
  const g = ForceGraph3D({ controlType: 'orbit' })(el)
    .backgroundColor(isDark() ? '#000000' : '#eef1f8')
    .showNavInfo(false)
    .nodeId('id')
    .nodeLabel((n) => `<div style="background:rgba(10,12,20,.85);color:#fff;padding:6px 10px;border-radius:8px;font:13px Inter,sans-serif;max-width:280px"><b>${esc(n.title)}</b><br><span style="opacity:.7">${esc(NOTE_TYPES[n.type] || '')} · ${n.deg} bağlantı</span></div>`)
    .nodeVal((n) => (n.type === 'source' || n.type === 'own' ? 2.5 : 1) + n.deg * 1.6 + (G.pulses.has(n.id) ? 14 : 0))
    .nodeColor((n) => (G.pulses.has(n.id) ? '#ffffff' : n.color))
    .nodeOpacity(0.95)
    .nodeResolution(14)
    .linkColor((l) => (isDark() ? 'rgba(140,160,255,0.28)' : 'rgba(60,70,120,0.28)'))
    .linkWidth((l) => (l.type === 'kavram' || l.type === 'kişi' ? 0.3 : 0.6 + (l.strength || 1) * 0.3))
    .linkOpacity(0.5)
    .linkDirectionalParticles((l) => (l.type === 'kavram' || l.type === 'kişi' ? 1 : 2))
    .linkDirectionalParticleSpeed(() => 0.003 + Math.random() * 0.006)
    .linkDirectionalParticleWidth((l) => (l.type === 'kavram' || l.type === 'kişi' ? 1.2 : 2))
    .linkDirectionalParticleColor((l) => LINK_TYPES[l.type] || '#9fb3ff')
    .onNodeClick((n) => flyTo(n))
    .onBackgroundClick(() => { $('#drawer').hidden = true; });

  g.d3Force('charge').strength(-60);
  g.d3Force('link').distance((l) => (l.type === 'kavram' || l.type === 'kişi' ? 30 : 55));

  G.bloom = new UnrealBloomPass(new THREE.Vector2(el.clientWidth || 800, el.clientHeight || 600), 0.75, 0.35, 0.3);
  g.postProcessingComposer().addPass(G.bloom);
  g.postProcessingComposer().addPass(new OutputPass());
  G.bloom.enabled = isDark();

  const stopIdle = () => { G.idleUntil = performance.now() + 9000; };
  el.addEventListener('pointerdown', stopIdle);
  el.addEventListener('wheel', stopIdle, { passive: true });
  window.addEventListener('resize', () => { if (state.view === 'beyin') g.width(el.clientWidth).height(el.clientHeight); });

  G.graph = g;
  legend();
}

function graphData() {
  const ns = notes();
  const ls = links().filter((l) => noteById(l.a) && noteById(l.b));
  const deg = new Map();
  for (const l of ls) { deg.set(l.a, (deg.get(l.a) || 0) + 1); deg.set(l.b, (deg.get(l.b) || 0) + 1); }
  const nodes = ns.map((n) => {
    let o = G.nodes.get(n.id);
    if (!o) { o = { id: n.id }; G.nodes.set(n.id, o); }
    o.title = n.title; o.type = n.type; o.deg = deg.get(n.id) || 0;
    const base = topicColor(n.topic);
    o.color = n.type === 'concept' || n.type === 'person' ? base + 'aa' : base;
    return o;
  });
  const live = new Set(ns.map((n) => n.id));
  for (const id of [...G.nodes.keys()]) if (!live.has(id)) G.nodes.delete(id);
  const linksArr = ls.map((l) => {
    let o = G.links.get(l.id);
    if (!o) { o = { id: l.id, source: l.a, target: l.b }; G.links.set(l.id, o); }
    o.type = l.type; o.strength = l.strength;
    return o;
  });
  const liveL = new Set(ls.map((l) => l.id));
  for (const id of [...G.links.keys()]) if (!liveL.has(id)) G.links.delete(id);
  return { nodes, links: linksArr };
}

function updateGraph() {
  if (!G.graph) return;
  const ns = notes();
  const sig = ns.map((n) => n.id + n.topic + n.title).join('|') + '#' + links().map((l) => l.id).join('|');
  $('#graphEmpty').hidden = ns.length > 0;
  if (sig === G.sig) return;
  G.sig = sig;
  const before = G.graph.graphData().nodes.length;
  G.graph.graphData(graphData());
  if (!before || ns.length - before > 3) fitSoon();
}

function fitSoon() {
  clearTimeout(G.fitT);
  G.fitT = setTimeout(() => {
    if (state.view !== 'beyin' || !G.graph) return;
    G.idleUntil = performance.now() + 1200;
    G.graph.zoomToFit(900, 90);
  }, 1800);
}

function showGraph() {
  if (!G.graph) initGraph();
  const el = $('#graph');
  G.graph.width(el.clientWidth).height(el.clientHeight);
  G.graph.resumeAnimation();
  updateGraph();
  fitSoon();
  cancelAnimationFrame(G.raf);
  const tick = () => {
    G.raf = requestAnimationFrame(tick);
    if (performance.now() < G.idleUntil) return;
    const cam = G.graph.camera();
    const r = Math.max(40, Math.hypot(cam.position.x, cam.position.z));
    G.angle = Math.atan2(cam.position.x, cam.position.z) + 0.0016;
    cam.position.x = r * Math.sin(G.angle);
    cam.position.z = r * Math.cos(G.angle);
    cam.lookAt(0, 0, 0);
  };
  tick();
  if (state.pendingFire.length) {
    const ids = state.pendingFire.splice(0);
    setTimeout(() => ids.forEach(fire), 900);
  }
}

function pauseGraph() {
  cancelAnimationFrame(G.raf);
  G.graph?.pauseAnimation();
}

function flyTo(n) {
  G.idleUntil = performance.now() + 15000;
  const dist = 60;
  const r = 1 + dist / Math.hypot(n.x || 1, n.y || 1, n.z || 1);
  G.graph.cameraPosition({ x: (n.x || 1) * r, y: (n.y || 1) * r, z: (n.z || 1) * r }, n, 1400);
  const note = noteById(n.id);
  if (!note) return;
  const d = $('#drawer');
  d.hidden = false;
  d.innerHTML = `<button class="btn small ghost drawer-close" data-closedrawer>✕</button>` + noteView(note, true);
  fire(n.id, true);
}

function fire(id, quiet = false) {
  if (!G.graph || state.view !== 'beyin') {
    if (!quiet) state.pendingFire.push(id);
    return;
  }
  G.pulses.set(id, true);
  G.graph.nodeVal(G.graph.nodeVal()).nodeColor(G.graph.nodeColor());
  const { links: ls } = G.graph.graphData();
  const touching = ls.filter((l) => (l.source.id || l.source) === id || (l.target.id || l.target) === id);
  let k = 0;
  const burst = setInterval(() => {
    touching.forEach((l) => G.graph.emitParticle(l));
    if (++k > 6) clearInterval(burst);
  }, 160);
  setTimeout(() => {
    G.pulses.delete(id);
    G.graph.nodeVal(G.graph.nodeVal()).nodeColor(G.graph.nodeColor());
  }, 1600);
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('sinaps-theme', t); } catch {}
  if (G.graph) {
    G.graph.backgroundColor(t === 'light' ? '#eef1f8' : '#000000');
    G.bloom.enabled = t !== 'light';
    G.graph.linkColor(G.graph.linkColor());
  }
}

/* ------------------------------------------------------------------ */
/* Olaylar                                                             */
/* ------------------------------------------------------------------ */

const pendingFiles = [];

function renderFiles() {
  $('#fileList').innerHTML = pendingFiles.map((f, i) => `<span class="file-pill">${esc(f.name)}<button type="button" data-rmfile="${i}" aria-label="Kaldır">✕</button></span>`).join('');
}

function resetForm() {
  $('#inText').value = '';
  $('#inUrl').value = '';
  $('#inWhy').value = '';
  pendingFiles.length = 0;
  renderFiles();
}

function bind() {
  window.addEventListener('hashchange', route);

  try { const t = localStorage.getItem('sinaps-theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
  $('#themeBtn').onclick = () => applyTheme(isDark() ? 'light' : 'dark');

  const dz = $('#ingestForm');
  dz.addEventListener('submit', (e) => {
    e.preventDefault();
    ingest({ text: $('#inText').value.trim(), url: $('#inUrl').value.trim(), why: $('#inWhy').value.trim(), files: [...pendingFiles] });
  });
  $('#inFile').addEventListener('change', (e) => { pendingFiles.push(...e.target.files); e.target.value = ''; renderFiles(); });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => { pendingFiles.push(...(e.dataTransfer?.files || [])); renderFiles(); });
  $('#inText').addEventListener('paste', (e) => {
    const fs = [...(e.clipboardData?.files || [])];
    if (fs.length) { e.preventDefault(); pendingFiles.push(...fs); renderFiles(); }
  });
  $('#inText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) dz.requestSubmit(); });

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-open],[data-goto],[data-select],[data-act],[data-ntype],[data-coll],[data-ifilter],[data-iact],[data-rmfile],[data-closedrawer]');
    if (!t) return;
    if (t.dataset.rmfile !== undefined) { pendingFiles.splice(+t.dataset.rmfile, 1); return renderFiles(); }
    if (t.dataset.closedrawer !== undefined) { $('#drawer').hidden = true; return; }
    if (t.dataset.open) {
      if (state.view === 'beyin' && G.nodes.get(t.dataset.open)) return flyTo(G.nodes.get(t.dataset.open));
      return openNote(t.dataset.open);
    }
    if (t.dataset.goto) return openNote(t.dataset.goto);
    if (t.dataset.select) { state.selectedNote = t.dataset.select; state.editing = false; return renderNotes(); }
    if (t.dataset.ntype) { state.noteFilter.type = t.dataset.ntype; return renderNotes(); }
    if (t.dataset.ifilter) { state.ideaFilter = t.dataset.ifilter; return renderIdeas(); }
    const n = noteById(state.selectedNote);
    if (t.dataset.coll && n) return toggleCollection(n, t.dataset.coll);
    if (t.dataset.act && n) {
      if (t.dataset.act === 'edit') return openEditor(n);
      if (t.dataset.act === 'deep') return deepen(n);
      if (t.dataset.act === 'links') return findLinksFor(n);
      if (t.dataset.act === 'delete') return deleteNote(n);
    }
    if (t.dataset.iact) {
      const i = state.docs.get(t.closest('[data-idea]').dataset.idea);
      if (i) return ideaAction(i, t.dataset.iact);
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-chatform]');
    if (!f) return;
    e.preventDefault();
    const msg = f.m.value.trim();
    const i = state.docs.get(f.dataset.chatform);
    if (msg && i) ideaChat(i, msg);
  });

  $('#noteSearch').addEventListener('input', (e) => { state.noteFilter.q = e.target.value; renderNotes(); });
  $('#collFilter').addEventListener('change', (e) => { state.noteFilter.coll = e.target.value; renderNotes(); });
  $('#newNoteBtn').onclick = () => { state.selectedNote = null; openEditor(null); };
  $('#synthBtn').onclick = synthesize;

  const pf = $('#profileForm');
  pf.addEventListener('input', () => (pf.dataset.dirty = '1'));
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    await save({ ...profile(), id: 'profile', kind: 'profile', interests: $('#pInterests').value.trim(), goals: $('#pGoals').value.trim(), projects: $('#pProjects').value.trim(), collections: $('#pCollections').value.trim() });
    delete pf.dataset.dirty;
    toast('Profil kaydedildi.');
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#modal').hidden) $('#modal').click(); $('#drawer').hidden = true; } });
}

bind();
route();
initRuntime();
