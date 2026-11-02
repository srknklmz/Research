// Evrak uygulaması — 10 tasarım maketi üretici.
// Kullanım: node build.js  → html/*.html ve png/*.png üretir.
const fs = require('fs');
const path = require('path');

const ICON_DIR = process.env.ICON_DIR;
const OUT_HTML = path.join(__dirname, 'html');
const OUT_PNG = path.join(__dirname, 'png');
fs.mkdirSync(OUT_HTML, { recursive: true });
fs.mkdirSync(OUT_PNG, { recursive: true });

// ---------- yardımcılar ----------
const iconCache = {};
function ic(name, size = 16, sw = 1.75) {
  if (!iconCache[name]) {
    const f = path.join(ICON_DIR, name + '.svg');
    if (!fs.existsSync(f)) throw new Error('icon yok: ' + name);
    iconCache[name] = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim();
  }
  return iconCache[name]
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/stroke-width="2"/, `stroke-width="${sw}"`);
}

const PROJ = {
  KÇK: { ad: 'Kartal Konutları', c: '#2563eb' },
  ATŞ: { ad: 'Ataşehir Ofis', c: '#0d9488' },
  BYL: { ad: 'Beylikdüzü Okul', c: '#d97706' },
  MRM: { ad: 'Marmara Yolu', c: '#7c3aed' },
  GBZ: { ad: 'Gebze Fabrika', c: '#16a34a' },
  MRK: { ad: 'Merkez', c: '#64748b' },
};

const DOCS = [
  ['2026/0148', '02.11.2026', 'Yapı ruhsatı eksik evrak bildirimi', 'KÇK'],
  ['2026/0147', '30.10.2026', 'Hakediş No:7 onayı hk.', 'ATŞ'],
  ['2026/0146', '29.10.2026', 'İş güvenliği denetim tutanağı', 'BYL'],
  ['2026/0145', '28.10.2026', 'Kazı izni süre uzatımı', 'MRM'],
  ['2026/0144', '27.10.2026', 'Elektrik alt yüklenici sözleşmesi', 'GBZ'],
  ['2026/0143', '24.10.2026', 'Zemin etüdü raporu teslimi', 'KÇK'],
  ['2026/0142', '23.10.2026', 'Fiyat farkı talebine cevap', 'ATŞ'],
  ['2026/0141', '21.10.2026', 'Geçici kabul tutanağı', 'BYL'],
  ['2026/0140', '20.10.2026', 'SGK işyeri tescil yazısı', 'MRK'],
  ['2026/0139', '17.10.2026', 'Yol kapama izni', 'MRM'],
  ['2026/0138', '16.10.2026', 'C30 beton malzeme onayı', 'KÇK'],
  ['2026/0137', '15.10.2026', 'Teminat mektubu iadesi', 'GBZ'],
  ['2026/0136', '14.10.2026', 'İskele kontrol raporu', 'BYL'],
  ['2026/0135', '10.10.2026', 'Kira sözleşmesi yenileme', 'MRK'],
  ['2026/0134', '09.10.2026', 'Altyapı deplase talebi', 'MRM'],
  ['2026/0133', '08.10.2026', 'Asansör montaj protokolü', 'ATŞ'],
  ['2026/0132', '06.10.2026', 'Su abonelik başvurusu cevabı', 'KÇK'],
  ['2026/0130', '03.10.2026', 'Yangın tesisatı onay yazısı', 'GBZ'],
  ['2026/0129', '02.10.2026', 'Hakediş No:6 kesinti bildirimi', 'ATŞ'],
  ['2026/0128', '01.10.2026', 'Personel giriş bildirimi', 'MRK'],
  ['2026/0127', '29.09.2026', 'İş programı revizyonu', 'BYL'],
  ['2026/0126', '26.09.2026', 'Çevre düzenleme onayı', 'KÇK'],
];
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const AYU = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const kisaTarih = (t) => { const [g, a] = t.split('.'); return `${+g} ${AY[+a - 1]}`; };

// ---------- taranmış evrak (PDF sayfası) ----------
function letter({ hl = [] } = {}) {
  const m = (s) => hl.reduce((acc, w) => acc.replace(new RegExp(`(${w})`, 'gi'), '<mark>$1</mark>'), s);
  return `
<div class="sheet"><div class="scan"><div class="ink">
  <div class="lh">
    <svg class="emb" viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="#333" stroke-width="2"/><circle cx="40" cy="40" r="28" fill="none" stroke="#333" stroke-width="1"/><path d="M40 18 L52 40 L40 62 L28 40 Z" fill="none" stroke="#333" stroke-width="2"/><circle cx="40" cy="40" r="5" fill="#333"/></svg>
    <div class="lh-t">T.C.<br>KARATEPE BELEDİYE BAŞKANLIĞI<br><span>İmar ve Şehircilik Müdürlüğü</span></div>
  </div>
  <div class="meta"><div>Sayı &nbsp;: E-34521877-310.01-4521</div><div>30.10.2026</div></div>
  <div class="konu">Konu : ${m('Yapı Ruhsatı Eksik Evrak Bildirimi')}</div>
  <div class="to">ÖRNEK İNŞAAT TAAHHÜT SANAYİ VE TİCARET A.Ş.<br>(Kartal Konutları Proje Müdürlüğü)</div>
  <div class="ilgi"><span>İlgi</span><span>:</span><span>a) 12.10.2026 tarihli ve 2026/0131 sayılı yazınız.<br>b) 3194 sayılı İmar Kanunu ve ilgili yönetmelik hükümleri.</span></div>
  <p>${m('İlgi (a) yazınız ile Müdürlüğümüze iletilen, ilçemiz Yeşiltepe Mahallesi 1245 ada 7 parselde inşa edilecek konut projesine ait yapı ruhsatı başvurunuz incelenmiştir.')}</p>
  <p>${m('Yapılan inceleme sonucunda, ilgi (b) mevzuat hükümleri gereğince başvuru dosyanızda aşağıda belirtilen belgelerin eksik olduğu tespit edilmiştir:')}</p>
  <ol>
    <li>Zemin etüdü raporunun onaylı aslı,</li>
    <li>Statik proje hesap raporu ve müellif taahhütnamesi,</li>
    <li>Yapı denetim kuruluşu hizmet sözleşmesi,</li>
    <li>Isı yalıtım projesi ve enerji kimlik belgesi ön raporu.</li>
  </ol>
  <p>${m('Söz konusu eksikliklerin bu yazının tebliğinden itibaren 15 (onbeş) gün içerisinde tamamlanarak Müdürlüğümüze teslim edilmesi, aksi halde ruhsat başvurunuzun işlemden kaldırılacağı hususunda;')}</p>
  <p>Bilgilerinizi ve gereğini rica ederim.</p>
  <div class="sign">
    <svg viewBox="0 0 220 70" class="imza"><path d="M8 48 C 30 10, 40 70, 58 34 S 84 20, 92 44 S 118 58, 128 30 C 136 12, 146 52, 160 38 S 190 26, 212 30" fill="none" stroke="#1b2a6b" stroke-width="2.4" stroke-linecap="round"/></svg>
    <div>Mehmet YILDIRIM<br>İmar ve Şehircilik Müdürü V.</div>
    <svg viewBox="0 0 120 120" class="muhur"><defs><path id="cp" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><circle cx="60" cy="60" r="56" fill="none" stroke="#2a4bb0" stroke-width="3"/><circle cx="60" cy="60" r="34" fill="none" stroke="#2a4bb0" stroke-width="1.5"/><text font-size="11.5" fill="#2a4bb0" font-family="Liberation Sans" font-weight="700" letter-spacing="1.6"><textPath href="#cp">KARATEPE BELEDİYESİ • İMAR MÜD. •</textPath></text><text x="60" y="64" text-anchor="middle" font-size="12" fill="#2a4bb0" font-family="Liberation Sans" font-weight="700">T.C.</text></svg>
  </div>
  <div class="ek">Ek : Eksik Evrak Listesi (1 Sayfa)</div>
  <div class="foot">Cumhuriyet Mah. Atatürk Cad. No:1 Karatepe &nbsp;·&nbsp; Tel: (0262) 000 00 00 &nbsp;·&nbsp; Bu belge güvenli elektronik imza ile imzalanmıştır.</div>
</div>
  <div class="regstamp"><b>ÖRNEK İNŞAAT A.Ş.</b><span>GELEN EVRAK</span><i>Tarih: 02.11.2026</i><i>Sayı: 2026/0148</i></div>
</div></div>`;
}

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;font-size:13px;-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01";color:var(--fg,#1d1d1f);background:var(--view-bg)}
svg{display:block;flex:none}
.app{display:flex;height:100vh;width:100vw}
.main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.row-flex{display:flex;flex:1;min-height:0}
/* sidebar */
.sb{width:var(--sb-w,200px);flex:none;display:flex;flex-direction:column;background:var(--sb-bg);color:var(--sb-fg);border-right:1px solid var(--sb-border);position:relative;z-index:2}
.sb-top{padding:12px 10px 8px;display:flex;flex-direction:column;gap:8px}
.brand{display:flex;align-items:center;gap:7px;font-weight:650;font-size:13.5px;padding:2px 2px 4px;letter-spacing:-.01em}
.brand .lg{width:20px;height:20px;border-radius:6px;background:var(--accent);color:#fff;display:grid;place-items:center}
.ctl{display:flex;align-items:center;gap:6px;height:28px;padding:0 8px;border-radius:var(--r,7px);background:var(--sb-ctl);font-size:12.5px;color:var(--sb-fg)}
.ctl .chev{margin-left:auto;opacity:.5}
.ctl.muted{color:var(--sb-muted)}
.seg{display:flex;background:var(--sb-ctl);border-radius:calc(var(--r,7px) + 1px);padding:2px}
.seg span{flex:1;height:24px;border-radius:calc(var(--r,7px) - 1px);font-size:12px;font-weight:550;color:var(--sb-muted);display:flex;align-items:center;justify-content:center;gap:5px}
.seg span.on{background:var(--seg-on);color:var(--sb-fg);box-shadow:0 1px 2px rgba(0,0,0,.10)}
.seg em{font-style:normal;font-weight:500;opacity:.6;font-size:11px}
.newb{display:flex;align-items:center;justify-content:center;gap:6px;height:28px;border-radius:var(--r,7px);background:var(--accent);color:#fff;font-size:12.5px;font-weight:550}
.list{flex:1;overflow:hidden;padding:2px 6px}
.grp{font-size:11px;font-weight:600;color:var(--sb-muted);padding:10px 8px 4px}
.it{padding:7px 8px 8px;border-radius:var(--r,7px);margin-bottom:1px;position:relative}
.it .r1{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--sb-muted);font-variant-numeric:tabular-nums}
.it .no{font-weight:600;color:var(--sb-fg)}
.it .dt{margin-left:auto}
.it .r2{font-size:12.5px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:14px;color:var(--sb-fg);opacity:.86}
.dot{width:8px;height:8px;border-radius:50%;background:var(--c);flex:none}
.it.sel{background:var(--sb-sel-bg)}
.it.sel .no,.it.sel .r1,.it.sel .r2{color:var(--sb-sel-fg)}
.it.sel .r2{opacity:1}
.sb-bot{display:flex;align-items:center;gap:2px;padding:8px 8px;border-top:1px solid var(--sb-border);color:var(--sb-muted)}
.sb-bot .ib{width:28px;height:28px}
.av{width:24px;height:24px;border-radius:50%;background:var(--av,var(--accent));color:#fff;font-size:10px;font-weight:650;display:grid;place-items:center;margin-left:auto;flex:none}
/* toolbar */
.tb{height:var(--tb-h,40px);flex:none;display:flex;align-items:center;gap:4px;padding:0 10px 0 16px;background:var(--tb-bg);color:var(--tb-fg);border-bottom:1px solid var(--tb-border);position:relative;z-index:1}
.tb .ttl{display:flex;align-items:center;gap:10px;min-width:0;font-size:13px}
.tb .ttl b{font-weight:650;font-variant-numeric:tabular-nums}
.tb .ttl .k{color:var(--tb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:999px;font-size:11px;font-weight:600;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}
.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--c)}
.tools{display:flex;align-items:center;gap:2px;margin-left:auto}
.ib{width:30px;height:30px;display:inline-grid;place-items:center;border-radius:6px;color:inherit;opacity:.82}
.ib.on{background:var(--tb-on);opacity:1;color:var(--accent)}
.sep{width:1px;height:18px;background:var(--tb-border);margin:0 6px}
.zv{font-size:12px;min-width:46px;text-align:center;font-variant-numeric:tabular-nums;font-weight:500}
.pg{font-size:12px;color:var(--tb-muted);font-variant-numeric:tabular-nums;padding:0 6px}
/* viewer */
.view{flex:1;overflow:hidden;position:relative;background:var(--view-bg);padding:var(--pad-y,20px) var(--pad-x,28px) 0}
.sheet{width:794px;height:1123px;margin:0 auto 24px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.12),0 8px 28px rgba(0,0,0,.10);position:relative;overflow:hidden}
.scan{position:absolute;inset:0;background:#fbfaf6;font-family:"Liberation Serif",serif;color:#222;font-size:15.5px;line-height:1.5}
.scan::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.07;pointer-events:none}
.ink{position:absolute;inset:0;padding:54px 74px 0 80px;transform:rotate(-.28deg);filter:blur(.15px)}
.lh{display:flex;flex-direction:column;align-items:center;text-align:center;font-weight:700;font-size:15.5px;line-height:1.35;margin-bottom:22px}
.lh .emb{width:60px;height:60px;margin-bottom:8px;opacity:.85}
.lh-t span{font-weight:400}
.meta{display:flex;justify-content:space-between;margin-bottom:4px}
.konu{margin-bottom:26px}
.to{text-align:center;font-weight:700;margin:0 0 22px;line-height:1.4}
.ilgi{display:grid;grid-template-columns:36px 14px 1fr;margin-bottom:18px}
.scan p{text-indent:48px;text-align:justify;margin-bottom:10px}
.scan ol{margin:2px 0 12px 64px}
.scan mark{background:#ffe066;color:inherit;box-shadow:0 0 0 2px #ffe066;border-radius:1px}
.scan mark.cur{background:#ff9f1c;box-shadow:0 0 0 2px #ff9f1c}
.sign{position:relative;margin:26px 0 0 auto;width:300px;text-align:center;font-weight:700;line-height:1.35}
.sign .imza{width:190px;height:58px;margin:0 auto -6px}
.sign .muhur{position:absolute;width:118px;height:118px;left:-70px;top:-30px;opacity:.72;transform:rotate(-14deg)}
.ek{margin-top:40px;font-size:14px}
.foot{position:absolute;left:80px;right:74px;bottom:34px;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555;text-align:center}
.regstamp{position:absolute;top:40px;right:46px;border:2.5px solid #6a2bb3;color:#6a2bb3;padding:6px 12px;font-family:"Liberation Sans",sans-serif;font-size:11px;line-height:1.35;transform:rotate(-5deg);opacity:.78;display:flex;flex-direction:column;align-items:center;letter-spacing:.03em}
.regstamp span{font-weight:700;font-size:13px;letter-spacing:.12em;border-top:1.5px solid #6a2bb3;border-bottom:1.5px solid #6a2bb3;margin:2px 0;padding:1px 4px}
.regstamp i{font-style:normal}
/* popover / drawer */
.pop{position:absolute;background:var(--pop-bg,#fff);color:var(--pop-fg,#1d1d1f);border-radius:12px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 12px 40px rgba(0,0,0,.18);z-index:5}
.drawer{position:absolute;right:0;top:var(--tb-h,40px);bottom:0;width:360px;background:var(--dr-bg,#fff);border-left:1px solid var(--tb-border);box-shadow:-12px 0 40px rgba(0,0,0,.10);z-index:4;display:flex;flex-direction:column;color:var(--fg,#1d1d1f)}
.dr-h{display:flex;align-items:center;gap:8px;padding:14px 16px 12px;border-bottom:1px solid #eceef2}
.dr-h b{font-size:15px;font-weight:650;font-variant-numeric:tabular-nums}
.dr-b{padding:4px 16px 16px;overflow:hidden;flex:1}
.fl{display:grid;grid-template-columns:96px 1fr;gap:6px 12px;padding:12px 0;border-bottom:1px solid #f0f1f4;font-size:12.5px;align-items:start}
.fl>label{color:#8a8f98;font-size:12px;padding-top:2px}
.fl .v{color:#1d1d1f;line-height:1.45}
.sec{font-size:11px;font-weight:650;color:#8a8f98;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px}
.tag{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;background:#f1f3f7;font-size:11.5px;margin:0 4px 4px 0;color:#444}
.lnk{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:#f5f7fb;color:#1d1d1f;font-size:12.5px;margin-bottom:6px}
.lnk b{font-variant-numeric:tabular-nums;font-weight:600}
.lnk .a{color:var(--accent);margin-left:auto}
.per{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px}
.per .av{margin:0;width:22px;height:22px;font-size:9.5px}
.per small{color:#8a8f98;margin-left:auto;font-size:11.5px}
.log{font-size:12px;color:#555;display:grid;grid-template-columns:72px 1fr;gap:6px 10px}
.log span:nth-child(odd){color:#8a8f98;font-variant-numeric:tabular-nums}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border-radius:8px;font-size:12.5px;font-weight:550;background:#f1f3f7;color:#1d1d1f}
.btn.pri{background:var(--accent);color:#fff}
`;

// ---------- bileşenler ----------
function rows(list, { sel = '2026/0148', groups = false, date = 'kisa', max = 30 } = {}) {
  let out = '', lastM = '';
  list.slice(0, max).forEach(([no, t, k, p]) => {
    const m = +t.split('.')[1];
    if (groups && m !== lastM) { out += `<div class="grp">${AYU[m - 1]} 2026</div>`; lastM = m; }
    const d = date === 'kisa' ? kisaTarih(t) : date === 'uzun' ? t : t.slice(0, 5);
    out += `<div class="it${no === sel ? ' sel' : ''}" style="--c:${PROJ[p].c}"><div class="r1"><span class="dot"></span><span class="no">${no}</span><span class="dt">${d}</span></div><div class="r2">${k}</div></div>`;
  });
  return out;
}

function sidebar(o = {}) {
  return `<aside class="sb">
  <div class="sb-top">
    ${o.brand === false ? '' : `<div class="brand"><span class="lg">${ic('layers', 12, 2.2)}</span>Evrak</div>`}
    ${o.proj === false ? '' : `<div class="ctl">${o.projDot ? `<span class="dot" style="--c:${o.projDot}"></span>` : ic('folder', 14)}<span>${o.projName || 'Tüm projeler'}</span><span class="chev">${ic('chevron-down', 14)}</span></div>`}
    <div class="seg"><span class="on">${ic('arrow-down-left', 13, 2)}Gelen <em>148</em></span><span>${ic('arrow-up-right', 13, 2)}Giden <em>96</em></span></div>
    <div class="ctl muted">${ic('search', 14)}<span>Ara…</span>${o.filterIcon ? `<span class="chev" style="opacity:.8">${ic('list-filter', 14)}</span>` : ''}</div>
    ${o.chips || ''}
    ${o.newBtn === false ? '' : `<div class="newb">${ic('plus', 14, 2.2)}Yeni evrak</div>`}
  </div>
  <div class="list">${rows(o.docs || DOCS, o)}</div>
  <div class="sb-bot"><span class="ib">${ic('trash-2', 15)}</span><span class="ib">${ic('settings', 15)}</span><span class="ib">${ic(o.dark ? 'sun' : 'moon', 15)}</span><span class="av">AD</span></div>
</aside>`;
}

function toolbar(o = {}) {
  const on = (k) => (o.on || []).includes(k) ? ' on' : '';
  return `<div class="tb">
  ${o.title === false ? '' : `<div class="ttl"><b>2026/0148</b><span class="k">Yapı ruhsatı eksik evrak bildirimi</span><span class="chip" style="--c:${PROJ['KÇK'].c}">KÇK</span></div>`}
  <div class="tools">
    <span class="ib${on('thumbs')}">${ic('gallery-vertical', 16)}</span>
    <span class="sep"></span>
    <span class="ib">${ic('zoom-out', 16)}</span><span class="zv">${o.zoom || '204%'}</span><span class="ib">${ic('zoom-in', 16)}</span>
    <span class="ib on">${ic('move-horizontal', 16)}</span>
    <span class="ib">${ic('rotate-cw', 16)}</span>
    <span class="ib${on('contrast')}">${ic('contrast', 16)}</span>
    <span class="ib${on('find')}">${ic('text-search', 16)}</span>
    <span class="sep"></span>
    <span class="pg">1 / 2</span>
    <span class="sep"></span>
    <span class="ib">${ic('download', 16)}</span><span class="ib">${ic('printer', 16)}</span>
    <span class="sep"></span>
    <span class="ib${on('info')}">${ic('panel-right', 16)}</span>
    <span class="ib">${ic('maximize', 16)}</span>
  </div>
</div>`;
}

function viewer(o = {}) {
  return `<div class="view" data-fit="${o.fit || 'width'}">${o.before || ''}${letter(o)}${o.after || ''}</div>`;
}

function detailsDrawer() {
  return `<div class="drawer">
  <div class="dr-h"><span class="chip" style="--c:${PROJ['KÇK'].c}">Kartal Konutları</span><span style="margin-left:auto;color:#8a8f98" class="ib">${ic('x', 16)}</span></div>
  <div class="dr-b">
    <div style="padding:14px 0 6px"><div style="font-size:12px;color:#8a8f98;display:flex;gap:6px;align-items:center">${ic('arrow-down-left', 13, 2)}Gelen evrak</div>
      <div style="font-size:20px;font-weight:650;letter-spacing:-.01em;margin-top:4px;font-variant-numeric:tabular-nums">2026/0148</div>
      <div style="font-size:14px;margin-top:4px;line-height:1.4">Yapı ruhsatı eksik evrak bildirimi</div></div>
    <div class="fl"><label>Evrak tarihi</label><div class="v">30.10.2026</div><label>Kayıt</label><div class="v">02.11.2026 · Ali Demir</div><label>Etiketler</label><div class="v"><span class="tag">ruhsat</span><span class="tag">belediye</span><span class="tag">acil</span></div><label>Not</label><div class="v">15 gün içinde eksikler tamamlanacak. Zemin etüdü aslı arşivde.</div></div>
    <div class="sec">İlgi yazıları</div>
    <div class="lnk">${ic('arrow-up-right', 14, 2)}<b>2026/0131</b><span style="color:#666">Ruhsat başvurusu</span><span class="a">${ic('link-2', 14)}</span></div>
    <div class="lnk" style="background:none;border:1px dashed #d5d9e0;color:#8a8f98">${ic('plus', 14)}İlgi ekle</div>
    <div class="sec">Havale</div>
    <div class="per"><span class="av" style="--av:#0d9488">AK</span>Ayşe Kaya<small>${ic('mail-check', 13)}</small></div>
    <div class="sec" style="display:flex;align-items:center;gap:6px">${ic('lock', 12, 2)}Görebilenler</div>
    <div class="per"><span class="av">AD</span>Ali Demir<small>kaydeden</small></div>
    <div class="per"><span class="av" style="--av:#0d9488">AK</span>Ayşe Kaya<small>havale</small></div>
    <div class="per"><span class="av" style="--av:#7c3aed">MŞ</span>Murat Şahin<small>yönetici</small></div>
    <div class="sec">Geçmiş</div>
    <div class="log"><span>02.11 10:40</span><span>Ali Demir kaydetti</span><span>02.11 10:42</span><span>Ayşe Kaya'ya havale edildi, e-posta gönderildi</span><span>02.11 11:05</span><span>Ayşe Kaya görüntüledi</span></div>
  </div>
  <div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid #eceef2"><span class="btn">${ic('trash-2', 14)}Çöpe at</span><span class="btn pri" style="margin-left:auto">Düzenle</span></div>
</div>`;
}

function page(name, css, body) {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${name}</title><style>${BASE_CSS}${css}</style></head><body>${body}
<script>
document.querySelectorAll('.view').forEach(v=>{const cs=getComputedStyle(v);const w=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);const h=v.clientHeight-parseFloat(cs.paddingTop)-20;const z=v.dataset.fit==='page'?h/1123:w/794;v.querySelectorAll('.sheet').forEach(s=>s.style.zoom=z);v.querySelectorAll('.zoomlbl').forEach(e=>e.textContent=Math.round(z*100)+'%')});
document.querySelectorAll('.zv').forEach(e=>{const v=document.querySelector('.view .sheet');if(v)e.textContent=Math.round(parseFloat(v.style.zoom)*100)+'%'});
</script></body></html>`;
  return html;
}

// ---------- 10 tasarım ----------
const designs = [];

// 01 — Sade (Apple Notes)
designs.push({
  id: '01-sade', ad: 'Sade',
  css: `:root{--sb-bg:#f3f3f5;--sb-fg:#1d1d1f;--sb-muted:#86868b;--sb-ctl:#e5e5ea;--seg-on:#fff;--sb-sel-bg:#d6e1f5;--sb-sel-fg:#0b2f6b;--sb-border:#e1e1e6;--view-bg:#e6e6ea;--tb-bg:#f9f9fb;--tb-fg:#3a3a3c;--tb-muted:#86868b;--tb-border:#e1e1e6;--tb-on:#e3e9f6;--accent:#1f4fa8}`,
  body: () => `<div class="app">${sidebar({ groups: true })}<div class="main">${toolbar()}${viewer()}</div></div>`,
});

// 02 — Lacivert kurumsal
designs.push({
  id: '02-lacivert', ad: 'Lacivert',
  css: `:root{--r:5px;--sb-bg:#0f1f3d;--sb-fg:#f3f6fc;--sb-muted:#8c9cbf;--sb-ctl:rgba(255,255,255,.08);--seg-on:rgba(255,255,255,.18);--sb-sel-bg:#1f3a70;--sb-sel-fg:#fff;--sb-border:#1a2b4f;--view-bg:#dce1e9;--tb-bg:#fff;--tb-fg:#24324d;--tb-muted:#6b7895;--tb-border:#e1e5ec;--tb-on:#e8eefb;--accent:#2f63d6}
  .it.sel::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;background:#6f9cff}
  .grp{color:#6f80a6;text-transform:uppercase;letter-spacing:.08em;font-size:10px}
  .brand{color:#fff}.brand .lg{background:#2f63d6}
  .fchip{display:flex;align-items:center;gap:6px;height:24px;padding:0 6px 0 8px;border-radius:5px;background:rgba(111,156,255,.18);color:#bcd0ff;font-size:11.5px}
  .fchip .x{margin-left:auto;opacity:.7}
  .sb-bot{border-top-color:#1a2b4f}`,
  body: () => `<div class="app">${sidebar({ groups: true, date: 'gun', filterIcon: true, chips: `<div class="fchip">${ic('calendar-range', 13)}Ekim – Kasım 2026<span class="x">${ic('x', 13)}</span></div>` })}<div class="main">${toolbar()}${viewer()}</div></div>`,
});

// 03 — Gece (koyu tema) + kontrast ayarı açık
designs.push({
  id: '03-gece', ad: 'Gece',
  css: `:root{--fg:#ececef;--sb-bg:#18181b;--sb-fg:#ececef;--sb-muted:#8a8a93;--sb-ctl:#26262b;--seg-on:#3a3a41;--sb-sel-bg:#22345a;--sb-sel-fg:#fff;--sb-border:#26262b;--view-bg:#0f0f11;--tb-bg:#18181b;--tb-fg:#d4d4d8;--tb-muted:#8a8a93;--tb-border:#26262b;--tb-on:#26314a;--accent:#4f86f7;--pop-bg:#232327;--pop-fg:#ececef}
  .ib.on{color:#8fb3ff}
  .sheet{box-shadow:0 10px 40px rgba(0,0,0,.6)}
  .scan{filter:contrast(1.28) brightness(1.02)}
  .cpop{right:182px;top:46px;width:280px;padding:14px 16px}
  .cpop h4{font-size:12px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .sl{display:grid;grid-template-columns:72px 1fr 34px;align-items:center;font-size:12px;color:#a1a1aa;margin-bottom:12px;gap:8px}
  .sl .tr{height:4px;border-radius:2px;background:#3a3a41;position:relative}
  .sl .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:#4f86f7}
  .sl .tr b{position:absolute;top:-6px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .sl span:last-child{text-align:right;color:#ececef;font-variant-numeric:tabular-nums}
  .pres{display:flex;gap:6px;margin-top:4px}
  .pres span{flex:1;height:26px;border-radius:6px;background:#2d2d32;font-size:11.5px;display:grid;place-items:center;color:#c8c8cf}
  .pres span.on{background:#2b3f6b;color:#fff}`,
  body: () => `<div class="app">${sidebar({ groups: true, dark: true })}<div class="main">${toolbar({ on: ['contrast'] })}${viewer()}
  <div class="pop cpop"><h4>${ic('contrast', 14)}Görüntü ayarları</h4>
    <div class="sl"><span>Parlaklık</span><span class="tr"><i style="width:52%"></i><b style="left:calc(52% - 8px)"></b></span><span>+4</span></div>
    <div class="sl"><span>Kontrast</span><span class="tr"><i style="width:68%"></i><b style="left:calc(68% - 8px)"></b></span><span>+28</span></div>
    <div class="pres"><span>Orijinal</span><span class="on">Soluk tarama</span><span>Sıfırla</span></div>
  </div></div></div>`,
});

// 04 — Linear (ultra minimal) + belge içi arama
designs.push({
  id: '04-cizgi', ad: 'Çizgi',
  css: `:root{--r:6px;--sb-w:196px;--sb-bg:#fbfbfc;--sb-fg:#17171a;--sb-muted:#8b8d98;--sb-ctl:#f0f0f3;--seg-on:#fff;--sb-sel-bg:#eceff6;--sb-sel-fg:#1b3a8a;--sb-border:#ececf0;--view-bg:#f3f3f5;--tb-bg:#fbfbfc;--tb-fg:#4a4b55;--tb-muted:#8b8d98;--tb-border:#ececf0;--tb-on:#eceff6;--accent:#2b4fb5;--tb-h:38px}
  body{font-size:12.5px}
  .dot{border-radius:2px;width:7px;height:7px}
  .it{padding:6px 8px 7px}
  .it .r2{font-size:12px}
  .newb{background:none;color:var(--sb-fg);border:1px solid #e4e4e9;justify-content:flex-start;padding:0 8px;font-weight:500}
  .brand .lg{background:#17171a}
  .seg{background:none;padding:0;gap:4px}
  .seg span{border:1px solid #e9e9ee;height:26px}
  .seg span.on{border-color:#d6dbea;background:#eef1f8;color:#1b3a8a;box-shadow:none}
  .findbar{position:absolute;top:48px;right:20px;display:flex;align-items:center;gap:4px;padding:5px 6px 5px 10px;border-radius:9px;font-size:12.5px;width:320px}
  .findbar .q{flex:1;display:flex;align-items:center;gap:6px}
  .findbar .n{color:#8b8d98;font-variant-numeric:tabular-nums;padding-right:4px}`,
  body: () => `<div class="app">${sidebar({ date: 'gun' })}<div class="main">${toolbar({ on: ['find'] })}${viewer({ hl: ['ruhsat'] })}
  <div class="pop findbar">${ic('text-search', 14)}<span class="q">ruhsat<span style="width:1px;height:14px;background:#2b4fb5"></span></span><span class="n">2 / 3</span><span class="ib">${ic('chevron-up', 15)}</span><span class="ib">${ic('chevron-down', 15)}</span><span class="ib">${ic('x', 15)}</span></div>
  </div></div>`,
});

// 05 — Posta (Apple Mail) + detay paneli açık
designs.push({
  id: '05-posta', ad: 'Posta',
  css: `:root{--sb-bg:#fff;--sb-fg:#1d1d1f;--sb-muted:#8e8e93;--sb-ctl:#f0f0f3;--seg-on:#fff;--sb-sel-bg:#2453b8;--sb-sel-fg:#fff;--sb-border:#e6e6ea;--view-bg:#ebebee;--tb-bg:#fff;--tb-fg:#3a3a3c;--tb-muted:#8e8e93;--tb-border:#e6e6ea;--tb-on:#e6edfa;--accent:#2453b8}
  .it{border-radius:8px}
  .it.sel .dot{box-shadow:0 0 0 2px #fff}
  .it .r2{font-weight:500}`,
  body: () => `<div class="app">${sidebar({ groups: true })}<div class="main">${toolbar({ on: ['info'] })}${viewer()}${detailsDrawer()}</div></div>`,
});

// 06 — Proje rayı
designs.push({
  id: '06-proje-rayi', ad: 'Proje Rayı',
  css: `:root{--sb-w:168px;--sb-bg:#f8f9fb;--sb-fg:#1d2433;--sb-muted:#8790a2;--sb-ctl:#eceff4;--seg-on:#fff;--sb-sel-bg:#dfe7f7;--sb-sel-fg:#173a85;--sb-border:#e4e8ef;--view-bg:#e3e6ec;--tb-bg:#fff;--tb-fg:#2d3445;--tb-muted:#8790a2;--tb-border:#e4e8ef;--tb-on:#e6edfa;--accent:#1f4fa8}
  .rail{width:52px;flex:none;background:#eef1f6;border-right:1px solid #e1e5ec;display:flex;flex-direction:column;align-items:center;padding:12px 0 10px;gap:8px}
  .rail .lg{width:30px;height:30px;border-radius:8px;background:#1f4fa8;color:#fff;display:grid;place-items:center;margin-bottom:8px}
  .pj{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;font-size:10px;font-weight:700;letter-spacing:.02em;color:var(--c);background:color-mix(in srgb,var(--c) 13%,#fff);position:relative}
  .pj.on{background:var(--c);color:#fff;box-shadow:0 2px 8px color-mix(in srgb,var(--c) 45%,transparent)}
  .pj.on::before{content:"";position:absolute;left:-8px;top:8px;bottom:8px;width:3px;border-radius:2px;background:var(--c)}
  .pj.all{color:#5b6477;background:#fff;border:1px solid #dfe3ea}
  .rail .sp{flex:1}
  .rail .ib{color:#7b8496}
  .phead{font-weight:650;font-size:13.5px;display:flex;align-items:center;gap:6px;padding:2px 2px 2px}
  .phead small{display:block;font-weight:500;font-size:11px;color:#8790a2}
  .it .r1 .dot{display:none}.it .r2{padding-left:0}`,
  body: () => {
    const kck = DOCS.filter((d) => d[3] === 'KÇK').concat(DOCS.filter((d) => d[3] !== 'KÇK').map((d) => [d[0], d[1], d[2], 'KÇK'])).slice(0, 0);
    const pj = Object.entries(PROJ).map(([k, v]) => `<div class="pj${k === 'KÇK' ? ' on' : ''}" style="--c:${v.c}">${k}</div>`).join('');
    const docs = [
      ['2026/0148', '02.11.2026', 'Yapı ruhsatı eksik evrak bildirimi', 'KÇK'],
      ['2026/0143', '24.10.2026', 'Zemin etüdü raporu teslimi', 'KÇK'],
      ['2026/0138', '16.10.2026', 'C30 beton malzeme onayı', 'KÇK'],
      ['2026/0132', '06.10.2026', 'Su abonelik başvurusu cevabı', 'KÇK'],
      ['2026/0126', '26.09.2026', 'Çevre düzenleme onayı', 'KÇK'],
      ['2026/0119', '18.09.2026', 'Kazı ve hafriyat izni', 'KÇK'],
      ['2026/0112', '09.09.2026', 'Yapı denetim sözleşmesi', 'KÇK'],
      ['2026/0104', '28.08.2026', 'Şantiye elektrik aboneliği', 'KÇK'],
      ['2026/0097', '19.08.2026', 'İmar durumu belgesi', 'KÇK'],
      ['2026/0090', '07.08.2026', 'Komşu parsel tespit tutanağı', 'KÇK'],
      ['2026/0083', '29.07.2026', 'Proje müellif sözleşmesi', 'KÇK'],
      ['2026/0071', '15.07.2026', 'Ağaç kesim izni', 'KÇK'],
      ['2026/0064', '03.07.2026', 'Arsa payı protokolü', 'KÇK'],
      ['2026/0058', '24.06.2026', 'Hafriyat döküm sahası yazısı', 'KÇK'],
      ['2026/0049', '11.06.2026', 'Avan proje onayı', 'KÇK'],
      ['2026/0041', '29.05.2026', 'Kat irtifakı başvurusu', 'KÇK'],
    ];
    void kck;
    const sb = sidebar({ docs, groups: true, brand: false, proj: false });
    const sb2 = sb.replace('<div class="sb-top">', `<div class="sb-top"><div class="phead"><div>Kartal Konutları<small>38 evrak</small></div></div>`)
      .replace(/<div class="sb-bot">[\s\S]*?<\/div>\n<\/aside>/, '</aside>');
    return `<div class="app"><nav class="rail"><div class="lg">${ic('layers', 15, 2.2)}</div><div class="pj all">Tümü</div>${pj}<div class="sp"></div><span class="ib">${ic('trash-2', 16)}</span><span class="ib">${ic('moon', 16)}</span><span class="av" style="margin:4px 0 0">AD</span></nav>${sb2}<div class="main">${toolbar()}${viewer()}</div></div>`;
  },
});

// 07 — Kurumsal tablo + sayfa küçük resimleri açık
designs.push({
  id: '07-kurumsal', ad: 'Kurumsal',
  css: `:root{--r:3px;--sb-w:208px;--sb-bg:#fff;--sb-fg:#16213a;--sb-muted:#76819a;--sb-ctl:#f1f3f7;--seg-on:#fff;--sb-sel-bg:#e9effb;--sb-sel-fg:#0f2a63;--sb-border:#dfe3ea;--view-bg:#d8dce4;--tb-bg:#f7f8fa;--tb-fg:#2a3550;--tb-muted:#76819a;--tb-border:#dfe3ea;--tb-on:#e3e9f6;--accent:#163a7d;--tb-h:38px}
  .top{height:38px;flex:none;background:#13284f;color:#e8eefc;display:flex;align-items:center;padding:0 14px;gap:10px;font-size:12.5px}
  .top b{font-weight:700;letter-spacing:.14em;font-size:11.5px}
  .top .u{margin-left:auto;display:flex;align-items:center;gap:8px;color:#b9c6e4}
  .top .u .av{margin:0;background:#2f63d6}
  .wrap{display:flex;flex-direction:column;height:100vh}
  .sb .brand{display:none}
  .seg{border:1px solid #dfe3ea;background:#fff;padding:0;border-radius:3px}
  .seg span{border-radius:0;height:26px}.seg span.on{background:#13284f;color:#fff;box-shadow:none}
  .list{padding:0}
  .thd{display:grid;grid-template-columns:70px 1fr;font-size:10px;font-weight:700;letter-spacing:.08em;color:#76819a;padding:6px 12px;border-top:1px solid #dfe3ea;border-bottom:1px solid #dfe3ea;background:#f7f8fa}
  .it{border-radius:0;margin:0;border-bottom:1px solid #eef0f4;padding:7px 12px 8px}
  .it.sel{box-shadow:inset 3px 0 0 #163a7d}
  .newb{background:#163a7d}
  .thumbs{width:116px;flex:none;background:#eef0f4;border-right:1px solid #dfe3ea;padding:14px 0;display:flex;flex-direction:column;align-items:center;gap:14px;font-size:11px;color:#76819a}
  .th{width:72px;height:102px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);position:relative;overflow:hidden}
  .th.on{outline:2px solid #2f63d6;outline-offset:3px}
  .th i{position:absolute;left:10px;right:10px;height:2px;background:#c9ccd2}
  .status{height:26px;flex:none;background:#f7f8fa;border-top:1px solid #dfe3ea;display:flex;align-items:center;gap:16px;padding:0 14px;font-size:11.5px;color:#76819a}
  .status span{display:flex;align-items:center;gap:6px}`,
  body: () => {
    const thumbLines = (n) => Array.from({ length: n }, (_, i) => `<i style="top:${14 + i * 7}px;width:${40 + ((i * 37) % 30)}%"></i>`).join('');
    const sb = sidebar({ date: 'uzun', newBtn: true }).replace('<div class="list">', `<div class="list"><div class="thd"><span>NO</span><span style="text-align:right">TARİH</span></div>`);
    return `<div class="wrap"><div class="top"><span class="lg" style="width:20px;height:20px;border-radius:4px;background:#2f63d6;display:grid;place-items:center">${ic('layers', 12, 2.2)}</span><b>EVRAK KAYIT</b><span class="u">Ali Demir<span class="av">AD</span></span></div>
    <div class="app" style="height:auto;flex:1;min-height:0">${sb}<div class="main">${toolbar({ on: ['thumbs'] })}<div class="row-flex"><div class="thumbs"><div class="th on">${thumbLines(12)}</div>1<div class="th">${thumbLines(6)}</div>2</div>${viewer()}</div></div></div>
    <div class="status"><span>${ic('arrow-down-left', 13)}Gelen 148</span><span>${ic('arrow-up-right', 13)}Giden 96</span><span style="margin-left:auto">${ic('cloud', 13)}Google Drive ile eşitlendi</span><span>${ic('shield-check', 13)}Son yedek: bugün 03:00</span></div></div>`;
  },
});

// 08 — CESUR: Üst şerit (sol panel yok, PDF tam genişlik)
designs.push({
  id: '08-ust-serit', ad: 'Üst Şerit (cesur)',
  css: `:root{--sb-fg:#1d1d1f;--sb-muted:#8e8e93;--sb-ctl:#f0f1f4;--seg-on:#fff;--sb-sel-bg:#e3eafa;--sb-sel-fg:#173a85;--view-bg:#e6e7eb;--tb-bg:#fff;--tb-fg:#3a3a3c;--tb-muted:#8e8e93;--tb-border:#e5e6ea;--tb-on:#e6edfa;--accent:#1f4fa8;--tb-h:48px;--pad-x:24px}
  .tb{gap:8px;padding:0 12px}
  .tb .brand{padding:0 6px 0 0}
  .tb .ctl{background:#f0f1f4}
  .tb .seg{width:170px;background:#f0f1f4}
  .docbtn{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px 0 12px;border-radius:9px;background:#f4f6fa;border:1px solid #dfe5f1;font-size:13px;min-width:460px;margin-left:10px}
  .docbtn b{font-weight:650;font-variant-numeric:tabular-nums}
  .docbtn .chev{margin-left:auto;opacity:.6}
  .nav2{display:flex}
  .tools{margin-left:auto}
  .dd{left:384px;top:52px;width:520px;padding:8px}
  .dd .ctl{margin:2px 2px 8px;background:#f2f3f6;color:#8e8e93}
  .dd .it{display:grid;grid-template-columns:14px 84px 1fr 60px;align-items:center;padding:8px 10px;gap:6px}
  .dd .it .no{font-weight:600;font-size:12.5px;font-variant-numeric:tabular-nums}
  .dd .it .k{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dd .it .d{text-align:right;font-size:12px;color:#8e8e93}
  .dd .it.sel{background:#e3eafa;color:#173a85}`,
  body: () => {
    const items = DOCS.slice(0, 11).map(([no, t, k, p]) => `<div class="it${no === '2026/0148' ? ' sel' : ''}" style="--c:${PROJ[p].c}"><span class="dot"></span><span class="no">${no}</span><span class="k">${k}</span><span class="d">${kisaTarih(t)}</span></div>`).join('');
    return `<div class="app"><div class="main">
    <div class="tb"><div class="brand"><span class="lg">${ic('layers', 12, 2.2)}</span>Evrak</div>
      <div class="ctl" style="width:170px">${ic('folder', 14)}<span>Tüm projeler</span><span class="chev">${ic('chevron-down', 14)}</span></div>
      <div class="seg"><span class="on">Gelen <em>148</em></span><span>Giden <em>96</em></span></div>
      <div class="docbtn"><span class="dot" style="--c:${PROJ['KÇK'].c}"></span><b>2026/0148</b><span style="color:#555">Yapı ruhsatı eksik evrak bildirimi</span><span class="chev">${ic('chevron-down', 15)}</span></div>
      <div class="nav2"><span class="ib">${ic('chevron-up', 16)}</span><span class="ib">${ic('chevron-down', 16)}</span></div>
      <div class="tools"><span class="ib">${ic('zoom-out', 16)}</span><span class="zv">100%</span><span class="ib">${ic('zoom-in', 16)}</span><span class="ib on">${ic('move-horizontal', 16)}</span><span class="ib">${ic('rotate-cw', 16)}</span><span class="ib">${ic('contrast', 16)}</span><span class="ib">${ic('text-search', 16)}</span><span class="sep"></span><span class="ib">${ic('download', 16)}</span><span class="ib">${ic('printer', 16)}</span><span class="ib">${ic('panel-right', 16)}</span><span class="sep"></span><span class="newb" style="padding:0 12px">${ic('plus', 14, 2.2)}Yeni</span><span class="av" style="margin-left:8px">AD</span></div>
    </div>${viewer()}
    <div class="pop dd"><div class="ctl">${ic('search', 14)}<span>Evrak no, konu veya metin…</span></div>${items}</div>
    </div></div>`;
  },
});

// 09 — CESUR: Yüzen cam liste (macOS)
designs.push({
  id: '09-cam', ad: 'Cam (cesur)',
  css: `:root{--sb-fg:#1d1d1f;--sb-muted:#6e6e73;--sb-ctl:rgba(0,0,0,.06);--seg-on:rgba(255,255,255,.95);--sb-sel-bg:rgba(31,79,168,.14);--sb-sel-fg:#0f347a;--view-bg:#cfd1d6;--tb-fg:#3a3a3c;--tb-muted:#6e6e73;--tb-border:rgba(0,0,0,.1);--tb-on:rgba(31,79,168,.12);--accent:#1f4fa8;--pad-x:0px;--pad-y:0px}
  .view{padding:0 40px 0 130px}
  .sheet{margin-top:0}
  .glass{position:absolute;left:14px;top:14px;bottom:14px;width:226px;border-radius:16px;background:rgba(246,246,249,.62);backdrop-filter:blur(28px) saturate(1.6);-webkit-backdrop-filter:blur(28px) saturate(1.6);box-shadow:0 0 0 1px rgba(255,255,255,.6) inset,0 0 0 1px rgba(0,0,0,.07),0 20px 50px rgba(0,0,0,.18);display:flex;flex-direction:column;z-index:3;color:#1d1d1f}
  .glass .sb-top{padding:14px 12px 8px}
  .glass .list{padding:2px 8px}
  .glass .sb-bot{border-top:1px solid rgba(0,0,0,.07);color:#6e6e73;padding:8px 10px}
  .glass .it{border-radius:9px}
  .colbtn{position:absolute;right:10px;top:13px;color:#6e6e73}
  .ftb{position:absolute;top:14px;left:50%;transform:translateX(-30%);height:40px;border-radius:12px;background:rgba(255,255,255,.72);backdrop-filter:blur(24px) saturate(1.6);box-shadow:0 0 0 1px rgba(0,0,0,.07),0 8px 30px rgba(0,0,0,.14);display:flex;align-items:center;padding:0 6px 0 14px;gap:2px;z-index:3;color:#3a3a3c;font-size:13px}
  .ftb b{font-weight:650;font-variant-numeric:tabular-nums;margin-right:8px}
  .ftb .k{color:#6e6e73;margin-right:10px}`,
  body: () => {
    const inner = sidebar({ groups: true }).replace('<aside class="sb">', '<aside class="glass">').replace('<div class="brand">', `<span class="colbtn ib">${ic('panel-left-close', 16)}</span><div class="brand">`);
    return `<div class="app"><div class="main" style="--view-bg:#cfd1d6">${viewer()}${inner}
    <div class="ftb"><b>2026/0148</b><span class="k">Yapı ruhsatı eksik evrak bildirimi</span><span class="chip" style="--c:${PROJ['KÇK'].c};margin-right:10px">KÇK</span><span class="sep"></span><span class="ib">${ic('gallery-vertical', 16)}</span><span class="ib">${ic('zoom-out', 16)}</span><span class="zv">204%</span><span class="ib">${ic('zoom-in', 16)}</span><span class="ib">${ic('rotate-cw', 16)}</span><span class="ib">${ic('contrast', 16)}</span><span class="ib">${ic('text-search', 16)}</span><span class="sep"></span><span class="pg">1 / 2</span><span class="ib">${ic('download', 16)}</span><span class="ib">${ic('printer', 16)}</span><span class="ib">${ic('panel-right', 16)}</span><span class="ib">${ic('maximize', 16)}</span></div>
    </div></div>`;
  },
});

// 10 — CESUR: Arama öncelikli (komut paleti, OCR sonuçları)
designs.push({
  id: '10-arama', ad: 'Arama Öncelikli (cesur)',
  css: `:root{--view-bg:#e4e5e9;--tb-bg:#fff;--tb-fg:#3a3a3c;--tb-muted:#8e8e93;--tb-border:#e5e6ea;--tb-on:#e6edfa;--accent:#1f4fa8}
  .mrail{width:64px;flex:none;background:#f6f7f9;border-right:1px solid #e5e6ea;display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:4px}
  .mrail .lg{width:30px;height:30px;border-radius:8px;background:#1f4fa8;color:#fff;display:grid;place-items:center;margin-bottom:10px}
  .mi{width:54px;padding:7px 0 6px;border-radius:9px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10.5px;color:#6e6e73;font-weight:500}
  .mi.on{background:#e3eafa;color:#1f4fa8}
  .mrail .sp{flex:1}
  .veil{position:absolute;inset:0;background:rgba(17,24,39,.38);z-index:4}
  .pal{left:50%;top:90px;transform:translateX(-50%);width:760px;z-index:5;border-radius:16px;overflow:hidden}
  .pin{display:flex;align-items:center;gap:12px;padding:16px 18px;font-size:18px;border-bottom:1px solid #eceef2}
  .pin .cur{width:2px;height:22px;background:#1f4fa8;margin-left:-8px}
  .flt{display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid #eceef2}
  .flt span{display:flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:7px;background:#f2f4f7;font-size:12px;color:#444}
  .flt span.on{background:#e3eafa;color:#1f4fa8;font-weight:550}
  .rg{font-size:11px;font-weight:650;color:#8a8f98;text-transform:uppercase;letter-spacing:.06em;padding:12px 18px 6px}
  .rs{display:grid;grid-template-columns:10px 84px 1fr auto;gap:4px 10px;align-items:center;padding:9px 18px;font-size:13px}
  .rs.sel{background:#eef3fd}
  .rs .no{font-weight:650;font-variant-numeric:tabular-nums}
  .rs .d{color:#8a8f98;font-size:12px}
  .rs .sn{grid-column:3 / 5;color:#555;font-size:12.5px;line-height:1.45}
  .rs mark{background:#fff0a8;color:#111;border-radius:2px;padding:0 1px}
  .rs .src{font-size:11px;color:#8a8f98;display:inline-flex;align-items:center;gap:4px;margin-left:6px}
  .pf{display:flex;justify-content:space-between;padding:10px 18px;border-top:1px solid #eceef2;font-size:11.5px;color:#8a8f98;background:#fafbfc}`,
  body: () => {
    const r = (no, t, k, p, sn, src, sel) => `<div class="rs${sel ? ' sel' : ''}" style="--c:${PROJ[p].c}"><span class="dot"></span><span class="no">${no}</span><span>${k}</span><span class="d">${t}</span>${sn ? `<span class="sn">${sn}${src ? `<span class="src">${ic('scan-text', 12)}${src}</span>` : ''}</span>` : ''}</div>`;
    return `<div class="app"><nav class="mrail"><div class="lg">${ic('layers', 15, 2.2)}</div>
      <div class="mi on">${ic('search', 18)}Ara</div><div class="mi">${ic('plus', 18)}Yeni</div><div class="mi">${ic('arrow-down-left', 18)}Gelen</div><div class="mi">${ic('arrow-up-right', 18)}Giden</div><div class="mi">${ic('folder', 18)}Projeler</div>
      <div class="sp"></div><div class="mi">${ic('trash-2', 18)}Çöp</div><span class="av" style="margin:6px 0 0">AD</span></nav>
    <div class="main">${toolbar()}${viewer()}<div class="veil"></div>
    <div class="pop pal">
      <div class="pin">${ic('search', 20)}<span>ruhsat eksik</span><span class="cur"></span><span style="margin-left:auto;font-size:12px;color:#8a8f98">4 sonuç</span></div>
      <div class="flt"><span>${ic('folder', 13)}Tüm projeler ${ic('chevron-down', 12)}</span><span class="on">${ic('calendar-range', 13)}Son 3 ay</span><span>${ic('arrow-down-left', 13)}Gelen + Giden ${ic('chevron-down', 12)}</span><span>${ic('tag', 13)}Etiket ${ic('chevron-down', 12)}</span></div>
      <div class="rg">Konu eşleşmesi</div>
      ${r('2026/0148', '02.11.2026', '<b style="font-weight:600">Yapı <mark>ruhsat</mark>ı <mark>eksik</mark> evrak bildirimi</b>', 'KÇK', '', '', true)}
      <div class="rg">PDF içeriği (metin tanıma)</div>
      ${r('2026/0131', '12.10.2026', 'Ruhsat başvurusu (giden)', 'KÇK', '…yapı <mark>ruhsat</mark> başvurumuza ait <mark>eksik</mark> belgeler ekte sunulmuştur…', 's.1')}
      ${r('2026/0143', '24.10.2026', 'Zemin etüdü raporu teslimi', 'KÇK', '…<mark>ruhsat</mark> dosyasındaki <mark>eksik</mark> zemin etüdü raporunun onaylı aslı…', 's.2')}
      ${r('2026/0145', '28.10.2026', 'Kazı izni süre uzatımı', 'MRM', '…kazı <mark>ruhsat</mark>ı kapsamında <mark>eksik</mark> kalan imalatlar için…', 's.1')}
      <div class="pf"><span>Sonuca tıklayınca evrak açılır, aranan kelime sayfada işaretlenir</span><span>Eşleşme: konu, no, etiket, PDF metni</span></div>
    </div></div></div>`;
  },
});

// Bonus — Yeni evrak kaydı akışı (Sade tasarım üzerinde)
designs.push({
  id: '11-kayit-akisi', ad: 'Kayıt akışı (ortak)',
  css: designs[0].css + `
  .fm{padding:6px 18px 16px}
  .ff{margin-top:12px}
  .ff label{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#7a7f88;font-weight:550;margin-bottom:5px}
  .inp{height:34px;border-radius:8px;border:1px solid #dcdfe5;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:13px;background:#fff}
  .inp.ro{background:#f4f5f7;color:#555;font-variant-numeric:tabular-nums;font-weight:600}
  .inp.ai{border-color:#b9c9ee;background:#f6f8fe}
  .ai-b{margin-left:auto;font-size:10.5px;color:#1f4fa8;display:flex;align-items:center;gap:3px;font-weight:600}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .sg2{display:flex;background:#eef0f3;border-radius:8px;padding:2px;height:34px}
  .sg2 span{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:6px;font-size:12.5px;color:#6e6e73;font-weight:550}
  .sg2 span.on{background:#fff;color:#1d1d1f;box-shadow:0 1px 2px rgba(0,0,0,.1)}
  .ta{height:56px;align-items:flex-start;padding-top:8px;color:#9a9ea6}
  .chk{display:flex;align-items:center;gap:8px;font-size:12px;color:#444;margin-top:6px}
  .chk i{width:16px;height:16px;border-radius:4px;background:#1f4fa8;display:grid;place-items:center;color:#fff}
  .q{display:flex;gap:6px;padding:12px 18px;border-bottom:1px solid #eceef2;align-items:center;font-size:12px;color:#6e6e73}
  .q .qi{width:26px;height:34px;border-radius:3px;background:#fff;box-shadow:0 0 0 1px #dcdfe5}
  .q .qi.on{box-shadow:0 0 0 2px #1f4fa8}
  .q .qi.ok{background:#e9f6ee;box-shadow:0 0 0 1px #b6e2c4}
  .dropnote{position:absolute;left:50%;bottom:22px;transform:translateX(-70%);z-index:3;display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;background:rgba(29,29,31,.86);color:#fff;font-size:12.5px}`,
  body: () => `<div class="app">${sidebar({ groups: true, sel: 'none' })}<div class="main">${toolbar({ title: false, on: ['info'] }).replace('<div class="tools">', `<div class="ttl"><b style="color:#1f4fa8">Yeni evrak</b><span class="k">ruhsat_eksik_evrak.pdf · 2 sayfa</span></div><div class="tools">`)}${viewer()}
  <div class="dropnote">${ic('file-up', 15)}Pencereye PDF sürükleyin ya da birden fazla dosyayı birlikte bırakın</div>
  <div class="drawer" style="width:380px">
    <div class="dr-h"><b style="font-size:14px">Yeni evrak kaydı</b><span style="margin-left:auto;color:#8a8f98" class="ib">${ic('x', 16)}</span></div>
    <div class="q"><span>Toplu yükleme</span><span class="qi ok"></span><span class="qi on"></span><span class="qi"></span><span class="qi"></span><span class="qi"></span><span style="margin-left:auto;font-weight:600;color:#1d1d1f">2 / 5</span></div>
    <div class="fm">
      <div class="two"><div class="ff"><label>Evrak no</label><div class="inp ro">2026/0149<span style="margin-left:auto;font-weight:500;font-size:11px;color:#8a8f98">otomatik</span></div></div>
      <div class="ff"><label>Yön</label><div class="sg2"><span class="on">${ic('arrow-down-left', 13, 2)}Gelen</span><span>${ic('arrow-up-right', 13, 2)}Giden</span></div></div></div>
      <div class="two"><div class="ff"><label>Evrak tarihi</label><div class="inp ai">30.10.2026<span class="ai-b">${ic('sparkles', 11)}PDF</span></div></div>
      <div class="ff"><label>Proje</label><div class="inp"><span class="dot" style="--c:${PROJ['KÇK'].c}"></span>Kartal Konutları<span style="margin-left:auto;opacity:.5">${ic('chevron-down', 14)}</span></div></div></div>
      <div class="ff"><label>Konu</label><div class="inp ai">Yapı ruhsatı eksik evrak bildirimi<span class="ai-b">${ic('sparkles', 11)}PDF</span></div></div>
      <div class="ff"><label>Etiketler</label><div class="inp"><span class="tag" style="margin:0">ruhsat</span><span class="tag" style="margin:0">belediye</span><span style="color:#9a9ea6">ekle…</span></div></div>
      <div class="ff"><label>İlgi yazısı</label><div class="inp"><span style="color:#1f4fa8;display:flex;align-items:center;gap:6px">${ic('link-2', 14)}<b style="font-weight:600">2026/0131</b></span><span style="color:#666">Ruhsat başvurusu</span><span style="margin-left:auto;font-size:10.5px;color:#1f4fa8;font-weight:600">PDF'te bulundu</span></div></div>
      <div class="ff"><label>Not</label><div class="inp ta">İsteğe bağlı kısa not…</div></div>
      <div class="two"><div class="ff"><label>Havale</label><div class="inp"><span class="av" style="margin:0;width:20px;height:20px;font-size:9px;--av:#0d9488">AK</span>Ayşe Kaya</div><div class="chk"><i>${ic('check', 11, 3)}</i>E-posta gönder</div></div>
      <div class="ff"><label>${ic('lock', 12, 2)}Görebilenler</label><div class="inp">Proje ekibi (4)<span style="margin-left:auto;opacity:.5">${ic('chevron-down', 14)}</span></div></div></div>
    </div>
    <div style="display:flex;gap:8px;padding:12px 18px;border-top:1px solid #eceef2;margin-top:auto"><span class="btn">Atla</span><span class="btn pri" style="margin-left:auto">Kaydet ve sıradaki ${ic('chevron-right', 14, 2)}</span></div>
  </div></div></div>`,
});

module.exports = { designs, page, OUT_HTML, OUT_PNG };

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const only = process.argv[2];
    for (const d of designs) {
      if (only && !d.id.startsWith(only)) continue;
      const f = path.join(OUT_HTML, d.id + '.html');
      fs.writeFileSync(f, page(d.ad, d.css, d.body()));
      await pg.goto('file://' + f);
      await pg.waitForTimeout(150);
      await pg.screenshot({ path: path.join(OUT_PNG, d.id + '.png') });
      console.log('ok', d.id);
    }
    await browser.close();
  })();
}
