import { marked } from 'marked';
import * as THREE from 'three';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import { Brain, S } from './brain.js';

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
  scheduleRender();
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
  scheduleRender();
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
    setSync('ÇEVRİMDIŞI', 'err');
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
    setSync('KAYDETME KAPALI', 'err');
    banner('Notlar kaydedilemiyor (giriş yapılmamış olabilir). Bu oturumda eklediklerin sayfa kapanınca kaybolur.');
    return;
  }
  state.db = db;
  state.col = db.collection('data/users/' + uid);
  setSync('YÜKLENİYOR');
  const timer = setTimeout(() => setSync('SUNUCUYA ULAŞILAMIYOR', 'err'), 10000);
  state.col.onSnapshot(
    (snap) => {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') state.docs.delete(ch.doc.id);
        else state.docs.set(ch.doc.id, { ...ch.doc.data(), id: ch.doc.id });
      }
      if (!snap.metadata.fromCache) { clearTimeout(timer); setSync('SENKRON', 'ok'); }
      state.loaded = true;
      scheduleRender();
    },
    (err) => {
      clearTimeout(timer);
      setSync('BAĞLANTI KOPTU', 'err');
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
    <div class="row"><span class="spacer"></span><button class="ghost" data-choice="no">Vazgeç</button><button class="ghost solid" data-choice="yes">Sil</button></div>`);
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
function collections() {
  return (profile().collections || '').split(',').map((s) => s.trim()).filter(Boolean);
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
function ideaScore(i) { return (i.novelty || 0) + (i.feasibility || 0) + (i.potential || 0); }
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

/* ================================================================== */
/* Arayüz: Korteks tasarımı                                            */
/* ================================================================== */

const DESIGN = {
  name: 'KORTEKS', shell: 'glass', defaultMode: 'dark', mono: 0.0, fiber: 1.0, breath: 1.0, wobble: 0.0, soma: 1.75,
  dark: { bg: '#050916', bg2: '#0b1a3a', text: '#eef1f8', mute: '#8791a8', accent: '#ff2d6f', shell: '#7fa6ff', shellInt: 0.32, bloom: [0.55, 0.6, 0.42], glass: 'rgba(12,18,36,.55)', line: 'rgba(255,255,255,.12)' },
  light: { bg: '#eceef3', bg2: '#ffffff', text: '#10131c', mute: '#5d6578', accent: '#d81b5c', shell: '#5a6c96', shellInt: 0.5, glass: 'rgba(255,255,255,.6)', line: 'rgba(16,19,28,.14)' },
};
const LOBES = [[0, 0.16, 0.74], [0, 0.5, -0.08], [0, 0.12, -0.86], [-0.6, -0.14, 0.1], [0.6, -0.14, 0.1], [0, -0.5, -0.74]];
const BT = TOPICS.map((t, i) => ({ ...t, lobe: LOBES[i] }));
const LTL = Object.entries(LINK_TYPES).map(([key, color]) => ({ key, color }));
const topicIdx = (t) => { const i = TOPICS.findIndex((x) => x.key === t); return i < 0 ? 5 : i; };
const linkIdx = (t) => { const i = LTL.findIndex((x) => x.key === t); return i < 0 ? 4 : i; };
const up = (s) => String(s || '').toLocaleUpperCase('tr');
const TYPE_UP = { source: 'KAYNAK', concept: 'KAVRAM', person: 'KİŞİ', own: 'KENDİ NOTUM' };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

Object.assign(state, { selIdea: null, openIdea: null, hold: false, listType: 'all', listQ: '' });

/* ---------- tema ---------- */
let mode = store.get('sinaps-mode') === 'light' ? 'light' : 'dark';
function applyTheme() {
  const m = DESIGN[mode];
  const st = document.documentElement.style;
  document.documentElement.dataset.mode = mode;
  for (const k of ['bg', 'bg2', 'text', 'mute', 'accent', 'glass', 'line', 'shell']) st.setProperty('--' + k, m[k]);
  st.setProperty('--f-display', "'Barlow Condensed', 'Arial Narrow', sans-serif");
  st.setProperty('--f-body', "'Newsreader', Georgia, serif");
  st.setProperty('--f-ui', "'Barlow', system-ui, sans-serif");
}
applyTheme();

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
      f.connect(g).connect(c.destination); audio.amb = { os };
      sfx.open();
    } else if (audio.amb) { audio.amb.os.forEach((o) => o.stop()); audio.amb = null; }
  } catch { audio.on = false; }
  $('#btnSound').classList.toggle('on', audio.on);
}

/* ---------- beyin ---------- */
DESIGN.defaultMode = mode;
const brain = new Brain($('#gl'), DESIGN, BT, LTL);
let lastFire = 0;
brain.onFire = () => { const t = performance.now(); if (t - lastFire > 90) { lastFire = t; sfx.fire(); } };
function fire(id) { brain.fire(id, 1.5); }

const labels = $('#labels');
const nodeEls = new Map();
const lobeEls = BT.map((t, i) => {
  const el = document.createElement('button');
  el.className = 'lobe'; el.type = 'button'; el.textContent = up(t.key); el.dataset.lobe = i; el.style.setProperty('--c', t.color);
  labels.appendChild(el); return el;
});
const lobePos = BT.map((t) => { const v = new THREE.Vector3(...t.lobe); return v.multiplyScalar(S).add(v.clone().normalize().multiplyScalar(34)).add(new THREE.Vector3(0, 14, 0)); });
let linkEls = [];
function setLinkLabels(id) {
  linkEls.forEach((x) => x.el.remove()); linkEls = [];
  if (id == null) return;
  for (const { link } of brain.neighbors(id).slice(0, 30)) {
    const t = LTL[link.type];
    if (t.key === 'kavram' || t.key === 'kişi') continue;
    const el = document.createElement('div');
    el.className = 'llabel'; el.textContent = t.key; el.style.setProperty('--c', t.color);
    labels.appendChild(el); linkEls.push({ el, link });
  }
}
const o = {};
brain.onFrame = () => {
  const cam = brain.camera.position;
  const selSet = brain.sel != null ? new Set([brain.sel, ...brain.neighbors(brain.sel).map((x) => x.node.key)]) : null;
  const dist = cam.distanceTo(brain.controls.target);
  const near = 175 * brain.far();
  for (const n of brain.nodes) {
    const el = nodeEls.get(n.key);
    if (!el) continue;
    const d = cam.distanceTo(n.pos);
    let a = 0;
    if (n.reveal > 0.8) {
      if (selSet) a = selSet.has(n.key) ? 1 : 0;
      else if (brain.lobe != null) a = n.topic === brain.lobe && n.type === 'source' ? 1 : 0;
      else a = Math.max(0, Math.min(1, (near - d) / 45));
      if (n.key === brain.hover) a = 1;
    }
    if (a > 0.01) {
      brain.screen(n.pos, o);
      if (o.z > 1) a = 0;
      else el.style.transform = `translate(-50%,-100%) translate(${o.x.toFixed(1)}px,${(o.y - 8 - (n.size * 600) / d).toFixed(1)}px)`;
    }
    if (a !== el._a) { el._a = a; el.style.opacity = a.toFixed(2); el.classList.toggle('sel', n.key === brain.sel); }
  }
  lobeEls.forEach((el, i) => {
    brain.screen(lobePos[i], o);
    const a = brain.sel != null || o.z > 1 || !brain.nodes.length ? 0 : brain.lobe != null ? (brain.lobe === i ? 0.9 : 0.12) : Math.max(0, Math.min(1, (dist - 190 * brain.far()) / 90));
    el.style.opacity = (a * brain.shellU.uReveal.value).toFixed(2);
    el.style.pointerEvents = a > 0.3 ? 'auto' : 'none';
    el.style.transform = `translate(-50%,-50%) translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
  });
  for (const { el, link } of linkEls) {
    if (!link.mid) continue;
    brain.screen(link.mid, o);
    el.style.opacity = o.z < 1 ? 1 : 0;
    el.style.transform = `translate(-50%,-50%) translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
  }
};
labels.addEventListener('click', (e) => {
  const l = e.target.closest('.lobe');
  if (l) { sfx.open(); closePanels(); brain.focusLobe(+l.dataset.lobe); }
});

let graphSig = '';
function syncGraph() {
  const ns = notes(), ls = links();
  const sig = ns.map((n) => n.id + '|' + n.title + '|' + n.topic).join(';') + '#' + ls.map((l) => l.id + l.type).join(';');
  document.body.classList.toggle('empty', !ns.length && state.loaded);
  $('#stats').textContent = ns.length ? `${ns.filter((n) => n.type === 'source' || n.type === 'own').length} NOT · ${ls.length} SİNAPS · ${ideas().length} FİKİR` : '';
  if (sig === graphSig) return;
  graphSig = sig;
  const t = Date.now();
  brain.setGraph(
    ns.map((n) => ({ key: n.id, title: n.title, topic: topicIdx(n.topic), type: n.type === 'own' ? 'source' : n.type, days: Math.max(0, (t - new Date(n.updatedAt || n.createdAt || t).getTime()) / 864e5) })),
    ls.filter((l) => noteById(l.a) && noteById(l.b)).map((l) => ({ key: l.id, a: l.a, b: l.b, type: linkIdx(l.type) })),
  );
  const live = new Set(ns.map((n) => n.id));
  for (const [k, el] of nodeEls) if (!live.has(k)) { el.remove(); nodeEls.delete(k); }
  for (const n of ns) {
    let el = nodeEls.get(n.id);
    if (!el) { el = document.createElement('div'); el.className = 'nlabel'; labels.appendChild(el); nodeEls.set(n.id, el); }
    if (el.textContent !== n.title) el.textContent = n.title;
  }
  if (brain.sel != null) setLinkLabels(brain.sel);
}

/* ---------- genel çizim ---------- */
function renderAll() {
  if (!state.hold) syncGraph();
  if ($('#list').classList.contains('open')) renderList();
  if ($('#ideas').classList.contains('open')) renderIdeas();
  if ($('#palette').classList.contains('open')) renderPalette();
  if (state.selectedNote && !state.editing) renderNote();
  renderProfile();
}

/* ---------- not ekranı ---------- */
let noteSig = '';
function noteHTML(n) {
  const ls = linksOf(n.id).sort((a, b) => (b.strength || 1) - (a.strength || 1));
  const rel = ideas().filter((i) => (i.fromNotes || []).includes(n.id));
  const t = TOPICS[topicIdx(n.topic)];
  const cs = collections();
  const stars = n.credibility ? ' · GÜVENİLİRLİK ' + '★'.repeat(n.credibility) + '☆'.repeat(5 - n.credibility) : '';
  return `
    <button class="ghost small x" data-close type="button">KAPAT</button>
    <div class="note-kicker"><i style="background:${t.color};color:${t.color}"></i>${up(t.key)} · ${TYPE_UP[n.type] || ''} · ${up(fmtDate(n.createdAt))}${stars}</div>
    <h1>${esc(up(n.title))}</h1>
    <div class="note-tools">
      <button class="ghost small" data-act="edit" type="button">DÜZENLE</button>
      ${n.type === 'concept' || n.type === 'person' ? '' : '<button class="ghost small" data-act="deep" type="button">DAHA DERİN İNCELE</button>'}
      <button class="ghost small" data-act="links" type="button">BAĞLANTI BUL</button>
      ${n.url ? `<a class="ghost small" href="${esc(n.url)}" target="_blank" rel="noopener">KAYNAĞA GİT</a>` : ''}
      <button class="ghost small danger" data-act="delete" type="button">SİL</button>
    </div>
    <div class="tags">${(n.tags || []).map((x) => `<span>#${esc(x)}</span>`).join('')}</div>
    ${cs.length ? `<div class="chips">${cs.map((c) => `<button type="button" class="chip ${(n.collections || []).includes(c) ? 'on' : ''}" data-coll="${esc(c)}">${esc(up(c))}</button>`).join('')}</div>` : ''}
    ${(n.projectHints || []).length ? `<div class="hints">${n.projectHints.map((p) => `<div><b>${esc(p.project)}:</b> ${esc(p.why)}</div>`).join('')}</div>` : ''}
    <div class="note-body">${renderMarkdown(n.body)}</div>
    <h3 class="sec">BAĞLANTILAR <span>${ls.length}</span></h3>
    <div class="links">${ls.map((l) => { const x = noteById(l.other); return `<button type="button" class="linkrow" data-open="${x.id}"><span class="lt" style="--c:${LINK_TYPES[l.type] || '#94a3b8'}">${esc(up(l.type))}</span><div>${esc(x.title)}<span class="why">${esc(l.reason || '')}</span></div></button>`; }).join('') || '<div class="empty">Henüz bağlantı yok.</div>'}</div>
    ${rel.length ? `<h3 class="sec">BU NOTTAN DOĞAN FİKİRLER <span>${rel.length}</span></h3><div class="links">${rel.map((i) => `<button type="button" class="linkrow" data-idea-open="${i.id}"><span class="lt" style="--c:var(--accent)">${esc(up(i.type))}</span><div>${esc(i.title)}<span class="why">${esc(i.body)}</span></div></button>`).join('')}</div>` : ''}
    ${n.content ? `<details class="orig"><summary>ORİJİNAL İÇERİK${n.language ? ' · ' + esc(up(n.language)) : ''}</summary><pre>${esc(n.content)}</pre></details>` : ''}`;
}
function renderNote(force) {
  const n = noteById(state.selectedNote);
  const p = $('#note');
  if (!n) { state.selectedNote = null; document.body.classList.remove('split'); return; }
  const sig = n.id + (n.updatedAt || '') + linksOf(n.id).length + ideas().length + (n.collections || []).join() + profile().collections;
  if (sig === noteSig && !force) return;
  const keep = noteSig.startsWith(n.id) ? p.scrollTop : 0;
  noteSig = sig;
  p.innerHTML = noteHTML(n); p.scrollTop = keep;
}
brain.onSelect = (node) => {
  setLinkLabels(node ? node.key : null);
  state.editing = false;
  if (!node) { state.selectedNote = null; noteSig = ''; document.body.classList.remove('split'); return; }
  state.selectedNote = node.key;
  renderNote(true);
  document.body.classList.add('split');
  sfx.open();
};
function openNote(id) {
  closePanels();
  if (!brain.byKey.has(id)) { graphSig = ''; syncGraph(); }
  if (brain.byKey.has(id)) brain.select(id);
}
function openEditor(n) {
  state.editing = true;
  const p = $('#note');
  p.innerHTML = `
    <form class="editor" id="editForm">
      <div class="note-kicker">${n ? 'NOTU DÜZENLE' : 'YENİ NOT'}</div>
      <input id="edTitle" class="field" type="text" value="${esc(n?.title || '')}" placeholder="Başlık" style="margin-top:14px">
      <input id="edTags" class="field" type="text" value="${esc((n?.tags || []).join(', '))}" placeholder="Etiketler (virgülle)" style="font:400 14px var(--f-ui);letter-spacing:0">
      <select id="edTopic" class="field">${TOPICS.map((t) => `<option ${n?.topic === t.key ? 'selected' : ''}>${t.key}</option>`).join('')}</select>
      <p class="hint">Markdown yazabilirsin. Başka bir nota bağlamak için <code>[[Not başlığı]]</code> yaz.</p>
      <textarea id="edBody" class="field">${esc(n?.body || '')}</textarea>
      <div class="row">
        <button class="ghost" type="button" id="edCancel">VAZGEÇ</button>
        ${state.sample ? '<button class="ghost" type="button" id="edSaveLink">KAYDET VE BAĞLANTI BUL</button>' : ''}
        <button class="ghost solid" type="submit">KAYDET</button>
      </div>
    </form>`;
  document.body.classList.add('split');
  const doSave = async (find) => {
    const title = $('#edTitle').value.trim() || 'Başlıksız';
    const body = $('#edBody').value;
    const base = n || { id: newId('n'), kind: 'note', type: 'own', createdAt: now(), collections: [], concepts: [], people: [] };
    const summary = n?.summary && n.type !== 'own' ? n.summary : body.replace(/[#>*\[\]_`-]/g, '').trim().slice(0, 220);
    const doc = { ...base, title, body, summary, tags: $('#edTags').value.split(',').map((t) => norm(t)).filter(Boolean).slice(0, 10), topic: $('#edTopic').value, updatedAt: now() };
    await save(doc);
    await syncWikiLinks(doc);
    state.editing = false;
    graphSig = ''; syncGraph();
    brain.select(doc.id);
    if (find) findLinksFor(doc);
  };
  $('#editForm').onsubmit = (e) => { e.preventDefault(); doSave(false); };
  $('#edSaveLink')?.addEventListener('click', () => doSave(true));
  $('#edCancel').onclick = () => { state.editing = false; if (n) renderNote(true); else { document.body.classList.remove('split'); } };
  $('#edTitle').focus();
}
$('#note').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-close],[data-act],[data-coll],[data-idea-open]');
  if (!t) return;
  sfx.click();
  if (t.dataset.close !== undefined) return brain.select(null);
  if (t.dataset.ideaOpen) { state.selIdea = t.dataset.ideaOpen; brain.select(null); return toggle('ideas'); }
  const n = noteById(state.selectedNote);
  if (!n) return;
  if (t.dataset.coll) { const set = new Set(n.collections || []); set.has(t.dataset.coll) ? set.delete(t.dataset.coll) : set.add(t.dataset.coll); return save({ ...n, collections: [...set] }); }
  if (t.dataset.act === 'edit') return openEditor(n);
  if (t.dataset.act === 'deep') { t.disabled = true; brain.think(true); await deepen(n); brain.think(false); return; }
  if (t.dataset.act === 'links') { t.disabled = true; brain.think(true); await findLinksFor(n); brain.think(false); t.disabled = false; return; }
  if (t.dataset.act === 'delete') { await deleteNote(n); if (!noteById(n.id)) brain.select(null); }
});
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-open]');
  if (a) { e.preventDefault(); openNote(a.dataset.open); }
});

/* ---------- paneller ---------- */
const PANELS = ['list', 'ideas', 'palette', 'profile'];
function closePanels(except) {
  for (const id of PANELS) if (id !== except) $('#' + id).classList.remove('open');
  document.body.classList.toggle('overlay', except === 'ideas');
}
function toggle(id) {
  const el = $('#' + id);
  const open = !el.classList.contains('open');
  closePanels(open ? id : null);
  el.classList.toggle('open', open);
  if (open) { sfx.open(); if (id === 'list') renderList(); if (id === 'ideas') { if (brain.sel != null) brain.select(null); renderIdeas(); } if (id === 'profile') renderProfile(true); }
  return open;
}

/* not listesi */
function renderList() {
  $('#listChips').innerHTML = [['all', 'HEPSİ'], ['source', 'KAYNAK'], ['own', 'KENDİ'], ['concept', 'KAVRAM'], ['person', 'KİŞİ'], ...collections().map((c) => ['c:' + c, up(c)])]
    .map(([k, v]) => `<button type="button" class="chip ${state.listType === k ? 'on' : ''}" data-ltype="${esc(k)}">${esc(v)}</button>`).join('');
  const q = norm(state.listQ), f = state.listType;
  const ns = notes()
    .filter((n) => f === 'all' ? true : f.startsWith('c:') ? (n.collections || []).includes(f.slice(2)) : n.type === f)
    .filter((n) => !q || norm(n.title + ' ' + (n.summary || '') + ' ' + (n.tags || []).join(' ') + ' ' + (n.body || '')).includes(q))
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  $('#listBody').innerHTML = TOPICS.map((t) => {
    const g = ns.filter((n) => TOPICS[topicIdx(n.topic)] === t);
    if (!g.length) return '';
    return `<div class="grp"><h4><i style="background:${t.color}"></i>${up(t.key)}<span>${g.length}</span></h4>${g.map((n) => `<button type="button" data-node="${n.id}">${esc(n.title)}${n.type !== 'source' ? `<em>${TYPE_UP[n.type]}</em>` : ''}</button>`).join('')}</div>`;
  }).join('') || `<div class="empty">${notes().length ? 'Eşleşen not yok.' : 'Henüz not yok.'}</div>`;
}
$('#list').addEventListener('click', (e) => {
  const c = e.target.closest('[data-ltype]'); if (c) { state.listType = c.dataset.ltype; return renderList(); }
  const b = e.target.closest('[data-node]'); if (b) openNote(b.dataset.node);
});
$('#list').addEventListener('pointerover', (e) => { const b = e.target.closest('[data-node]'); if (b) { brain.hover = b.dataset.node; const n = brain.byKey.get(b.dataset.node); if (n) n.flash = Math.max(n.flash, 0.7); } });
$('#listSearch').addEventListener('input', (e) => { state.listQ = e.target.value; renderList(); });
$('#newNote').onclick = () => { closePanels(); if (brain.sel != null) brain.select(null); openEditor(null); };

/* arama */
const palIn = $('#palIn');
function renderPalette() {
  const q = norm(palIn.value);
  const hits = notes().filter((n) => !q || norm(n.title + ' ' + (n.tags || []).join(' ') + ' ' + (n.summary || '')).includes(q))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 9);
  $('#palList').innerHTML = hits.map((n) => `<button type="button" data-node="${n.id}"><i style="background:${TOPICS[topicIdx(n.topic)].color}"></i><span>${esc(n.title)}</span><em>${TYPE_UP[n.type] || ''}</em></button>`).join('') || '<div class="none">SONUÇ YOK</div>';
}
palIn.addEventListener('input', renderPalette);
palIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = $('#palList [data-node]'); if (b) openNote(b.dataset.node); } });
$('#palette').addEventListener('click', (e) => { const b = e.target.closest('[data-node]'); if (b) openNote(b.dataset.node); else if (e.target.id === 'palette') closePanels(); });
function openSearch() { if (toggle('palette')) { palIn.value = ''; renderPalette(); setTimeout(() => palIn.focus(), 50); } }

/* profil */
function renderProfile(force) {
  const f = $('#profileForm');
  if (f.dataset.dirty && !force) return;
  const p = profile();
  $('#pInterests').value = p.interests || ''; $('#pGoals').value = p.goals || ''; $('#pProjects').value = p.projects || ''; $('#pCollections').value = p.collections || '';
  $('#learned').innerHTML = p.learned ? `<b>SİNAPS'IN SENDEN ÖĞRENDİKLERİ</b>${esc(p.learned)}` : '';
}
$('#profileForm').addEventListener('input', (e) => (e.currentTarget.dataset.dirty = '1'));
$('#profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await save({ ...profile(), id: 'profile', kind: 'profile', interests: $('#pInterests').value.trim(), goals: $('#pGoals').value.trim(), projects: $('#pProjects').value.trim(), collections: $('#pCollections').value.trim() });
  delete e.currentTarget.dataset.dirty;
  toast('PROFİL KAYDEDİLDİ');
});

/* ---------- fikir ağacı ---------- */
function radar(s) {
  const R = 78, cx = 110, cy = 104, ax = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
  const pt = (i, v) => `${(cx + Math.cos(ax[i]) * R * v).toFixed(1)},${(cy + Math.sin(ax[i]) * R * v).toFixed(1)}`;
  const grid = [0.33, 0.66, 1].map((k) => `<polygon points="${[0, 1, 2].map((i) => pt(i, k)).join(' ')}"/>`).join('');
  const names = ['YENİLİK', 'UYGULANABİLİRLİK', 'POTANSİYEL'];
  const lab = [0, 1, 2].map((i) => { const [x, yy] = pt(i, 1.2).split(','); return `<text x="${x}" y="${+yy + 3}" text-anchor="${i === 0 ? 'middle' : i === 1 ? 'start' : 'end'}">${names[i]} ${s[i]}</text>`; }).join('');
  return `<svg class="radar" viewBox="-110 0 440 200"><g class="grid">${grid}${[0, 1, 2].map((i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1).split(',')[0]}" y2="${pt(i, 1).split(',')[1]}"/>`).join('')}</g><polygon class="val" points="${[0, 1, 2].map((i) => pt(i, Math.max(0.05, s[i] / 10))).join(' ')}"/>${lab}</svg>`;
}
function ideaDetailHTML(i) {
  const s = [i.novelty || 0, i.feasibility || 0, i.potential || 0];
  const from = (i.fromNotes || []).map(noteById).filter(Boolean);
  return `
    <div class="note-kicker">${esc(up(i.type))} · ${ideaScore(i)}/30${i.status === 'liked' ? ' · BEĞENİLDİ' : i.status === 'disliked' ? ' · REDDEDİLDİ' : ''}</div>
    <h2>${esc(up(i.title))}</h2>
    ${radar(s)}
    <p class="serif">${esc(i.body)}</p>
    <h3 class="sec">DAYANDIĞI NOTLAR</h3>
    <div class="links">${from.map((n) => `<button type="button" class="linkrow" data-open="${n.id}"><div>${esc(n.title)}</div></button>`).join('') || '<div class="empty">—</div>'}</div>
    <div class="row">
      <button class="ghost small ${i.status === 'liked' ? 'on' : ''}" data-iact="like" type="button">BEĞEN</button>
      <button class="ghost small ${i.status === 'disliked' ? 'on' : ''}" data-iact="dislike" type="button">REDDET</button>
      <button class="ghost small" data-iact="plan" type="button">EYLEM PLANI</button>
      <button class="ghost small" data-iact="market" type="button">PAZAR KONTROLÜ</button>
      <button class="ghost small ${state.openIdea === i.id ? 'on' : ''}" data-iact="chat" type="button">GELİŞTİR</button>
      <button class="ghost small danger" data-iact="del" type="button">SİL</button>
    </div>
    ${i.plan ? `<div class="idea-extra"><h3 class="sec">EYLEM PLANI</h3><div class="note-body">${renderMarkdown(i.plan)}</div></div>` : ''}
    ${i.market ? `<div class="idea-extra"><h3 class="sec">PAZAR / RAKİP KONTROLÜ</h3><div class="note-body">${renderMarkdown(i.market)}</div></div>` : ''}
    ${state.openIdea === i.id ? `<div class="idea-extra"><h3 class="sec">FİKRİ GELİŞTİR</h3>
      <div class="chat">${(i.chat || []).map((m) => `<div class="msg ${m.role}">${m.role === 'assistant' ? renderMarkdown(m.content) : esc(m.content)}</div>`).join('')}</div>
      <form class="chatform" data-chatform="${i.id}"><input class="field" type="text" name="m" placeholder="Bu fikri nasıl geliştirelim?" autocomplete="off"><button class="ghost small solid">GÖNDER</button></form></div>` : ''}`;
}
let ideaSig = '';
function renderIdeas() {
  const f = state.ideaFilter;
  $('#ideaChips').innerHTML = [['all', 'HEPSİ'], ['liked', 'BEĞENDİKLERİM'], ['disliked', 'REDDEDİLENLER']].map(([k, v]) => `<button type="button" class="chip ${f === k ? 'on' : ''}" data-ifilter="${k}">${v}</button>`).join('');
  const list = ideas().filter((i) => (f === 'all' ? i.status !== 'disliked' : i.status === f));
  const det = $('#ideaDetail');
  if (!list.length) {
    $('#tree').innerHTML = ''; ideaSig = '';
    det.innerHTML = `<div class="empty">${ideas().length ? 'Bu filtrede fikir yok.' : 'Henüz fikir yok. Veri ekledikçe Sinaps fikir üretir; en az üç notun olunca “Arşivden sentez üret” ile de isteyebilirsin.'}</div>`;
    return;
  }
  if (!list.some((i) => i.id === state.selIdea)) state.selIdea = [...list].sort((a, b) => ideaScore(b) - ideaScore(a))[0].id;
  const branches = IDEA_TYPES.map((t) => ({ type: t, items: list.filter((i) => i.type === t).sort((a, b) => ideaScore(b) - ideaScore(a)) })).filter((b) => b.items.length);
  const total = list.length;
  const W = 700, H = Math.max(520, total * 50 + 90), rootX = 50, bx = 196, lx = 318;
  let row = 0, paths = '', nodes = '';
  const y = (r) => 46 + (r + 0.5) * ((H - 92) / total);
  const curve = (x1, y1, x2, y2) => `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
  for (const b of branches) {
    const start = row;
    const ys = b.items.map(() => y(row++));
    const by = (ys[0] + ys[ys.length - 1]) / 2;
    paths += `<path d="${curve(rootX, H / 2, bx, by)}"/>`;
    nodes += `<g class="tb" transform="translate(${bx},${by})"><circle r="7"/><text x="-14" y="-14" text-anchor="end">${esc(up(b.type))}</text></g>`;
    b.items.forEach((it, k) => {
      const sum = ideaScore(it), on = it.id === state.selIdea;
      paths += `<path d="${curve(bx, by, lx, ys[k])}" class="${on ? 'on' : ''}"/>`;
      const ttl = it.title.length > 40 ? it.title.slice(0, 39) + '…' : it.title;
      nodes += `<g class="leaf ${on ? 'on' : ''} ${it.status || ''}" data-idea="${it.id}" transform="translate(${lx},${ys[k]})"><rect class="hit" x="-26" y="-22" width="${W - lx}" height="44" fill="transparent"/><circle class="ring" r="${9 + sum * 0.38}"/><circle class="dot" r="5"/><text x="${24 + sum * 0.3}" y="5">${sum}</text><text class="ttl" x="${62 + sum * 0.3}" y="5">${esc(ttl)}</text></g>`;
    });
    void start;
  }
  const sig = list.map((i) => i.id + i.status + ideaScore(i)).join() + state.selIdea + f;
  if (sig !== ideaSig) {
    ideaSig = sig;
    $('#tree').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid meet"><g class="paths">${paths}</g><g class="root" transform="translate(${rootX},${H / 2})"><circle r="13"/><circle r="22" class="halo"/><text y="46" text-anchor="middle">ARŞİV</text></g>${nodes}</svg>`;
  }
  const keep = det.dataset.id === state.selIdea ? det.scrollTop : 0;
  det.dataset.id = state.selIdea;
  det.innerHTML = ideaDetailHTML(state.docs.get(state.selIdea));
  det.scrollTop = keep;
}
$('#ideas').addEventListener('click', async (e) => {
  const c = e.target.closest('[data-ifilter]'); if (c) { state.ideaFilter = c.dataset.ifilter; return renderIdeas(); }
  const g = e.target.closest('[data-idea]'); if (g) { state.selIdea = g.dataset.idea; sfx.click(); return renderIdeas(); }
  if (e.target.closest('[data-close]')) return closePanels();
  const b = e.target.closest('[data-iact]');
  if (b) {
    sfx.click();
    const i = state.docs.get(state.selIdea);
    if (!i) return;
    const slow = b.dataset.iact === 'plan' || b.dataset.iact === 'market';
    if (slow) { b.disabled = true; b.textContent = 'HAZIRLANIYOR…'; }
    await ideaAction(i, b.dataset.iact);
    renderIdeas();
  }
});
$('#synthBtn').onclick = async (e) => { e.currentTarget.disabled = true; await synthesize(); e.currentTarget.disabled = false; renderIdeas(); };
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-chatform]');
  if (!f) return;
  e.preventDefault();
  const msg = f.m.value.trim();
  const i = state.docs.get(f.dataset.chatform);
  if (msg && i) ideaChat(i, msg);
});

/* ---------- ekle akışı ---------- */
const add = $('#add'), addIn = $('#addIn');
const pendingFiles = [];
function renderFiles() {
  $('#fileList').innerHTML = pendingFiles.map((f, i) => `<span>${esc(f.name)}<button type="button" data-rm="${i}" aria-label="Kaldır">✕</button></span>`).join('');
  if (pendingFiles.length) add.classList.add('big');
}
$('#fileList').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { pendingFiles.splice(+b.dataset.rm, 1); renderFiles(); } });
$('#addFile').addEventListener('change', (e) => { pendingFiles.push(...e.target.files); e.target.value = ''; renderFiles(); });
function resetForm() { addIn.value = ''; $('#addUrl').value = ''; $('#addWhy').value = ''; pendingFiles.length = 0; renderFiles(); add.classList.remove('big'); }

function caption(text, frac) {
  const cap = $('#caption');
  cap.textContent = text; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  if (frac != null) $('#progress i').style.width = frac * 100 + '%';
}
async function typeOut(text) {
  const el = $('#stream'); el.textContent = '';
  const t = String(text || '').slice(0, 260);
  for (let i = 0; i < t.length; i += 2) { el.textContent = t.slice(0, i + 2); await wait(14); }
}

async function ingest(raw) {
  if (state.busy) return;
  if (!state.sample) return toast('YAPAY ZEKA BU GÖRÜNÜMDE KULLANILAMIYOR');
  state.busy = true; state.hold = true;
  closePanels(); if (brain.sel != null || brain.lobe != null) brain.select(null);
  add.classList.remove('big'); addIn.blur();
  document.body.classList.add('working');
  $('#stream').textContent = ''; $('#progress i').style.width = '0%';
  brain.think(true); sfx.open();
  let done = null;
  try {
    caption('OKUNUYOR', 0.1);
    const inp = await collectInput(raw);
    if (!inp.content && !inp.url && !inp.images.length) throw new Error('Boş veri gönderilemez.');
    if (inp.images.length && !state.sampleImages) throw new Error('Bu görünümde yapay zeka görsel okuyamıyor.');

    const dup = findDuplicate(inp);
    let mergeInto = null;
    if (dup) {
      const choice = await modal(`<h2>BU VERİ ZATEN VAR GİBİ</h2><p>“${esc(dup.title)}” notuna çok benziyor (${fmtDate(dup.createdAt)}).</p>
        <div class="row"><button class="ghost small" data-choice="merge">MEVCUT NOTA EKLE</button><button class="ghost small" data-choice="new">AYRI NOT</button><button class="ghost small" data-choice="cancel">VAZGEÇ</button></div>`);
      if (!choice || choice === 'cancel') return;
      if (choice === 'merge') mergeInto = dup;
    }

    if (mergeInto) {
      caption('ANALİZ EDİLİYOR', 0.5);
      const addText = await ask(`Aşağıdaki mevcut nota yeni gelen veriyi ekleyeceğiz. Yeni verinin getirdiği YENİ bilgileri Türkçe, madde madde, kısa özetle (mevcut notta olanı tekrarlama).\n\nMEVCUT NOT: ${mergeInto.title}\n${mergeInto.summary}\n\nYENİ VERİ:\n${inp.content || inp.url}`, { modelTier: 'default', images: inp.images.length ? inp.images : undefined });
      await typeOut(addText.replace(/[#*_-]/g, ''));
      const n = { ...mergeInto };
      n.body = (n.body || '') + `\n\n## Ek veri (${fmtDate(now())})\n${addText}\n`;
      n.content = ((n.content || '') + '\n\n---\n\n' + (inp.content || '')).slice(0, MAX_CONTENT);
      n.updatedAt = now();
      caption('NÖRON GÜNCELLENİYOR', 0.9);
      await save(n);
      done = n.id;
      return;
    }

    caption('ANALİZ EDİLİYOR', 0.3);
    const a = await askJSON(analysisPrompt(inp), { modelTier: 'default', images: inp.images.length ? inp.images : undefined });
    a.title = String(a.title || 'Başlıksız').slice(0, 160);
    if (!TOPICS.some((t) => t.key === a.topic)) a.topic = 'Diğer';
    a.tags = (a.tags || []).map((t) => norm(t)).filter(Boolean).slice(0, 6);
    a.concepts = (a.concepts || []).filter((c) => c && c.name).slice(0, 6);
    a.people = (a.people || []).filter((p) => p && p.name).slice(0, 5);
    const typing = typeOut(a.summary);

    caption('BAĞLANIYOR', 0.6);
    const noteId = newId('n');
    let lr = { links: [], ideas: [], projectHints: [] };
    try { lr = await askJSON(linkPrompt(a, candidateNotes(a, noteId)), { modelTier: 'default' }); } catch (e) { console.warn('bağlantı adımı', e); }
    const validLinks = (lr.links || []).filter((l) => noteById(l.id) && l.id !== noteId);
    await typing;

    caption('NÖRONLAR OLUŞUYOR', 0.85);
    const note = {
      id: noteId, kind: 'note', type: 'source', title: a.title, topic: a.topic, sourceType: a.sourceType || '', language: a.language || '',
      summary: a.summary || '', tags: a.tags, credibility: clamp(a.credibility?.score, 0, 5),
      concepts: a.concepts.map((c) => c.name), people: a.people.map((p) => p.name), events: (a.events || []).slice(0, 12),
      url: inp.url, why: inp.why, content: inp.content, fileNames: inp.fileNames, collections: [],
      projectHints: (lr.projectHints || []).filter((p) => p && p.project).slice(0, 4), body: buildBody(a, inp), createdAt: now(), updatedAt: now(),
    };
    const writes = [note];
    const entity = (name, type, text) => {
      let e = writes.find((w) => w.kind === 'note' && norm(w.title) === norm(name)) || noteByTitle(name);
      if (e && e.id === note.id) return;
      const line = `- [[${a.title}]]: ${text}`;
      if (e && (e.type === 'concept' || e.type === 'person')) e = { ...e, body: (e.body || '') + '\n' + line, updatedAt: now() };
      else if (!e) e = { id: newId('n'), kind: 'note', type, title: name, topic: a.topic, summary: text, tags: [], concepts: [], people: [], body: `${text}\n\n## Geçtiği kaynaklar\n${line}`, createdAt: now(), updatedAt: now(), collections: [] };
      writes.push(e);
      writes.push({ id: newId('l'), kind: 'link', a: note.id, b: e.id, type: type === 'concept' ? 'kavram' : 'kişi', reason: String(text).slice(0, 160), strength: 1, createdAt: now() });
    };
    for (const c of a.concepts) entity(c.name, 'concept', c.explanation || '');
    for (const p of a.people) entity(p.name, 'person', p.role || '');
    for (const l of validLinks) writes.push({ id: newId('l'), kind: 'link', a: note.id, b: l.id, type: LINK_TYPES[l.type] ? l.type : 'aynı konu', reason: String(l.reason || '').slice(0, 300), strength: clamp(l.strength, 1, 3), createdAt: now() });
    for (const i of (lr.ideas || []).slice(0, 4)) writes.push({
      id: newId('i'), kind: 'idea', title: String(i.title || '').slice(0, 160), body: i.body || '', type: IDEA_TYPES.includes(i.type) ? i.type : 'sentez',
      novelty: clamp(i.novelty, 0, 10), feasibility: clamp(i.feasibility, 0, 10), potential: clamp(i.potential, 0, 10),
      fromNotes: [note.id, ...(i.fromNotes || []).filter((x) => noteById(x))].slice(0, 6), status: 'new', createdAt: now(),
    });
    for (const w of writes) await save(w);
    done = note.id;
    maybeLearnInterests();
    resetForm();
  } catch (e) {
    console.error(e);
    caption('OLMADI', 0);
    $('#stream').textContent = aiError(e);
    await wait(3200);
  } finally {
    brain.think(false);
    state.hold = false;
    graphSig = ''; syncGraph();
    if (done) {
      const n = brain.byKey.get(done);
      if (n) { brain.controls.autoRotate = false; brain.flyToNode(n); brain.fire(n, 2); }
      caption('BAĞLANTI KURULDU', 1);
      await wait(2600);
    }
    document.body.classList.remove('working');
    state.busy = false;
    if (done) brain.select(done);
  }
}
$('#addForm').addEventListener('submit', (e) => { e.preventDefault(); ingest({ text: addIn.value.trim(), url: $('#addUrl').value.trim(), why: $('#addWhy').value.trim(), files: [...pendingFiles] }); });
addIn.addEventListener('focus', () => add.classList.add('big'));
addIn.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('#addForm').requestSubmit(); });
addIn.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); pendingFiles.push(...fs); renderFiles(); } });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#add, #bar') && !addIn.value && !pendingFiles.length && !$('#addUrl').value) add.classList.remove('big'); });
['dragenter', 'dragover'].forEach((ev) => window.addEventListener(ev, (e) => { e.preventDefault(); document.body.classList.add('drag'); }));
window.addEventListener('dragleave', (e) => { e.preventDefault(); if (!e.relatedTarget) document.body.classList.remove('drag'); });
window.addEventListener('drop', (e) => {
  e.preventDefault(); document.body.classList.remove('drag');
  const fs = [...(e.dataTransfer?.files || [])];
  const text = e.dataTransfer?.getData('text/plain');
  if (fs.length) { pendingFiles.push(...fs); renderFiles(); }
  else if (text) { addIn.value = text; add.classList.add('big'); }
});

/* ---------- alt bar ve kısayollar ---------- */
const QN = ['DÜŞÜK', 'ORTA', 'YÜKSEK'];
const q0 = store.get('sinaps-quality');
if (q0 != null && QN[+q0]) brain.setQuality(+q0);
$('#btnQuality').textContent = QN[brain.quality];
$('#bar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  sfx.click();
  if (b.id === 'btnList') toggle('list');
  if (b.id === 'btnIdeas') toggle('ideas');
  if (b.id === 'btnProfile') toggle('profile');
  if (b.id === 'btnSearch') openSearch();
  if (b.id === 'btnAdd') { closePanels(); if (brain.sel != null || state.editing) { state.editing = false; brain.select(null); document.body.classList.remove('split'); } add.classList.add('big'); addIn.focus(); }
  if (b.id === 'btnTheme') { mode = mode === 'dark' ? 'light' : 'dark'; store.set('sinaps-mode', mode); applyTheme(); brain.setMode(mode); }
  if (b.id === 'btnSound') toggleSound();
  if (b.id === 'btnQuality') { brain.setQuality((brain.quality + 1) % 3); b.textContent = QN[brain.quality]; store.set('sinaps-quality', brain.quality); }
});
window.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openSearch(); }
  if (e.key === 'Escape') {
    if (!$('#modal').hidden) return $('#modal').click();
    if (PANELS.some((id) => $('#' + id).classList.contains('open'))) return closePanels();
    if (state.editing) { state.editing = false; if (state.selectedNote) renderNote(true); else document.body.classList.remove('split'); return; }
    if (brain.sel != null || brain.lobe != null) return brain.select(null);
    add.classList.remove('big'); document.activeElement?.blur();
  }
  if (e.key === 'n' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); $('#btnAdd').click(); }
});

setTimeout(() => document.body.classList.add('ready'), 300);
initRuntime().then(() => { if (!state.col) { state.loaded = true; scheduleRender(); } });
