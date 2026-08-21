/* ==========================================================================
   Beyin Sistemi — uygulama mantığı
   Veri kaynağı: data.json (araclar/derle.py tarafından markdown'dan üretilir).
   Yerel durum (gelen kutusu, soru işaretleri, öneri kararları) localStorage'da.
   ========================================================================== */
"use strict";

const ANAHTAR = "beyin-v1";
const TURLER = ["doğrular", "çürütür", "yöntem", "açık-soru", "risk", "fırsat"];

let D = { hedefler: [], veriler: [], arsiv: [], raporlar: [], uretim: "" };
let Y = {                       // yerel durum
  kutu: [],                     // gelen kutusu
  taslaklar: [],                // Claude'a gönderilmeyi bekleyen hedef taslakları
  sorular: {},                  // "H-01|S2" -> true
  kararlar: {},                 // "2026-08-21|0" -> "y" | "n"
  tema: "sistem",
  ornek: false,
};
let aktif = "bugun";
let sonUyari = null;            // son işlemden kalan uyarı (Bugün ekranında gösterilir)
let arama = { q: "", tur: "" };

/* ---------------------------------------------------------------- depolama */
function yukleYerel() {
  try { Object.assign(Y, JSON.parse(localStorage.getItem(ANAHTAR) || "{}")); }
  catch (e) { /* bozuk kayıt: varsayılanla devam */ }
}
function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(Y)); } catch (e) {}
}

/* ------------------------------------------------------------- yardımcılar */
const $ = (s, k = document) => k.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function bugunTarih() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
         "-" + String(d.getDate()).padStart(2, "0");
}
function gunFarki(iso) {
  if (!iso) return null;
  const t = Date.parse(iso + "T00:00:00");
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
function alanAdi(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch (e) { return (url || "").replace(/^https?:\/\//, "").split("/")[0] || "—"; }
}
function yildiz(guven) {
  const n = guven === "yuksek" || guven === "yüksek" ? 3 : guven === "dusuk" || guven === "düşük" ? 1 : 2;
  return "★".repeat(n) + "☆".repeat(3 - n);
}
function halka(yuzde) {
  const off = (97.39 * (1 - Math.max(0, Math.min(100, yuzde)) / 100)).toFixed(1);
  return `<span class="ring-w"><svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
    <circle class="rb" cx="18" cy="18" r="15.5"/>
    <circle class="rf" cx="18" cy="18" r="15.5" style="stroke-dashoffset:${off}"/>
  </svg><span class="ring-n">${yuzde}</span></span>`;
}
function turSinifi(tur) {
  if (tur === "çürütür" || tur === "risk") return "k";
  if (tur === "doğrular" || tur === "fırsat") return "g";
  return "";
}
function toast(metin) {
  const eski = $(".toast"); if (eski) eski.remove();
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function titret(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

/* ------------------------------------------------------- hedef sınıflaması */
function hedefKumeleri() {
  const aktifler = D.hedefler.filter(h => h.durum === "aktif");
  const dikkat = [], normal = [], sessiz = [];
  for (const h of aktifler) {
    const gun = gunFarki(h.son_hareket);
    const acik = (h.sorular || []).filter(s => !s.cevaplandi && !Y.sorular[h.kimlik + "|" + s.metin]).length;
    h._acik = acik;
    h._gun = gun;
    if (gun !== null && gun >= 14) sessiz.push(h);
    else if (acik >= 4 || (h.varsayimlar || []).some(v => v.durum === "çürütüldü")) dikkat.push(h);
    else normal.push(h);
  }
  return { dikkat, normal, sessiz, hepsi: aktifler };
}

/* =========================================================== GÖRÜNÜM: BUGÜN */
function cizBugun() {
  const rapor = D.raporlar[0];
  const son = D.veriler.slice(0, 4);
  const k = hedefKumeleri();
  let h = "";

  if (rapor) {
    const ozet = (rapor.bolumler.find(b => /eklenen/i.test(b.baslik)) || rapor.bolumler[0] || {});
    h += `<button class="strip" data-rapor="${esc(rapor.tarih)}">
      <span class="cap"><span>${esc(rapor.tarih)} · Rapor</span><span>10:00</span></span>
      <h2>${esc(baslikCikar(ozet.icerik) || "Günlük rapor hazır")}</h2>
      <span class="go">Raporu aç →</span>
    </button>`;
  } else {
    h += `<div class="empty">
      <h3>Henüz rapor yok</h3>
      <p>İlk rapor, hedef tanımlandıktan sonraki ilk sabah 10:00'da gelir.</p>
    </div>`;
  }

  h += `<div class="sec"><span>Yeni bilgi</span><b>${Y.kutu.length ? Y.kutu.length + " bekliyor" : ""}</b></div>`;
  h += kutuHtml();

  if (D.hedefler.length) {
    h += `<div class="sec"><span>Durum</span><b>${k.hepsi.length} aktif hedef</b></div>`;
    h += `<div class="kv"><span>toplam veri</span><b>${D.veriler.length}</b></div>`;
    h += `<div class="kv"><span>arşivde</span><b>${D.arsiv.length}</b></div>`;
    h += `<div class="kv"><span>açık soru</span><b>${k.hepsi.reduce((a, x) => a + x._acik, 0)}</b></div>`;
  }

  if (son.length) {
    h += `<div class="sec"><span>Son eklenenler</span><b>${D.veriler.length}</b></div>`;
    h += son.map(satirVeri).join("");
  }

  if (!D.hedefler.length && !Y.kutu.length) {
    h += `<div class="empty">
      <h3>Sistem kurulu, hedef yok</h3>
      <p>Hedef olmadan eşleştirme çalışmaz. <b>Hedefler</b> sekmesinden bir
      taslak yaz, kopyala, Claude'a ver — kart açılsın.</p>
      <p class="hint">Ayarlar → Örnek veriyi göster, arayüzü dolu görmek için</p>
    </div>`;
  }
  $("#v-bugun").innerHTML = h;
}

function baslikCikar(md) {
  if (!md) return "";
  const s = md.split("\n").map(x => x.trim()).find(x => x && !x.startsWith("<") && !x.startsWith("|") && !x.startsWith("#"));
  const t = (s || "").replace(/[*_`]/g, "");
  if (t.length <= 88) return t;
  return t.slice(0, 88).replace(/\s+\S*$/, "") + "…";
}

function kutuHtml() {
  let h = `<div class="comp">
    <textarea id="giris" placeholder="Ne öğrendin? Link, not ya da fikir…" rows="3"></textarea>
    <div class="bar">
      <button data-yol="link">Yapıştır</button>
      <button data-yol="ses">Sesli</button>
      <button data-yol="foto">Fotoğraf</button>
      <button data-yol="gonder" id="btn-gonder">İşle</button>
    </div>
  </div>
  <input type="file" accept="image/*" capture="environment" id="dosya" hidden>
  <div id="islem"></div>`;

  if (sonUyari && sonUyari.tur === "hedefsiz") {
    h += `<div class="uyari">
      <b>Bu bir hedef mi?</b>
      <p>Henüz tanımlı hedef olmadığı için eşleştirme yapılamadı — yazdığın
      gelen kutusunda duruyor. Hedefin kendisini yazdıysan taslak olarak kaydet;
      Claude ondan kart açar.</p>
      <div class="ar">
        <button class="y" id="uyari-hedef">Hedef taslağı yap</button>
        <button id="uyari-kapat">Bilgiydi, kalsın</button>
      </div>
    </div>`;
  }

  if (Y.kutu.length) {
    h += `<div class="sec"><span>Bekleyenler</span><b>${Y.kutu.length} bilgi · ${Y.taslaklar.length} taslak</b></div>`;
    h += Y.kutu.map((it, i) => `
      <div class="row" data-kutu="${i}">
        <div class="t">
          <span class="ttl">${esc(it.metin.slice(0, 68))}${it.metin.length > 68 ? "…" : ""}</span>
          <span class="sub">${esc(it.tarih)} · ${esc(it.yol)}${it.hedef ? " · " + esc(it.hedef) : " · eşleşme yok"}</span>
        </div>
        <span class="bdg ${it.hedef ? "" : "u"}">${it.hedef ? "EŞLEŞTİ" : "ARŞİV"}</span>
      </div>`).join("");
    // Dürüstlük: bu kayıtlar tarayıcının yerel hafızasında durur. Claude oraya
    // erişemez — kullanıcı dışa aktarmadan hiçbir şey depoya ulaşmaz.
    h += `<p class="kv" style="border-top:1px solid var(--rule-soft);margin-top:6px;
      display:block;line-height:1.55;color:var(--ink-3)">
      Bunlar <b>yalnızca bu telefonda</b> duruyor; Claude göremez.
      Ayarlar → Dışa aktar ile kopyalayıp ver, veri kartına çevirsin.</p>`;
  }
  return h;
}

/* ======================================================== GÖRÜNÜM: HEDEFLER */
function satirHedef(h) {
  const alt = [h.kimlik, h._acik + " açık soru", (h.veriler || []).length + " veri"];
  if (h._gun !== null && h._gun >= 14) alt[1] = h._gun + " gündür veri yok";
  return `<button class="row ${h._gun !== null && h._gun >= 14 ? "faded" : ""}" data-hedef="${esc(h.kimlik)}">
    ${halka(h.ilerleme)}
    <span class="t"><span class="ttl">${esc(h.baslik)}</span><span class="sub">${esc(alt.join(" · "))}</span></span>
    <span class="chev">›</span>
  </button>`;
}

function taslakBolumu() {
  let h = `<div class="sec"><span>Taslaklar</span><b>${Y.taslaklar.length}</b></div>`;
  if (Y.taslaklar.length) {
    h += Y.taslaklar.map((t, i) => `<div class="row" data-taslak="${i}">
      <span class="t"><span class="ttl">${esc(t.baslik)}</span>
      <span class="sub">${esc(t.tarih)} · ${t.sorular.length} açık soru · gönderilmeyi bekliyor</span></span>
      <span class="bdg u">TASLAK</span></div>`).join("");
    h += `<div class="ar" style="margin-top:10px">
      <button class="y" id="taslak-kopyala">Claude'a göndermek için kopyala</button></div>`;
  }
  h += `<div class="ar" style="margin-top:${Y.taslaklar.length ? 7 : 10}px">
    <button id="taslak-yeni">+ Hedef taslağı yaz</button></div>`;
  return h;
}

function cizHedefler() {
  const k = hedefKumeleri();
  if (!D.hedefler.length) {
    $("#v-hedefler").innerHTML = `<div class="empty">
      <h3>Henüz hedef yok</h3>
      <p>Hedef kartlarını <b>Claude açar</b> — uygulama depoya yazamaz.
      Aşağıdan bir taslak yaz, kopyala, Claude'a ver; kart açılıp buraya düşer.</p>
      <p class="hint">Taslakta en önemli iki alan: neyin doğru olduğunu varsaydığın
      ve cevabını bilmediğin sorular. Sabah 09:00 araştırması bunlardan beslenir.</p>
    </div>` + taslakBolumu();
    return;
  }
  let h = "";
  if (k.dikkat.length) {
    h += `<div class="sec"><span>Dikkat gerekiyor</span><b>${k.dikkat.length}</b></div>` +
         k.dikkat.map(satirHedef).join("");
  }
  if (k.normal.length) {
    h += `<div class="sec"><span>Aktif</span><b>${k.normal.length}</b></div>` +
         k.normal.map(satirHedef).join("");
  }
  if (k.sessiz.length) {
    h += `<div class="sec"><span>Sessiz</span><b>${k.sessiz.length}</b></div>` +
         k.sessiz.map(satirHedef).join("");
  }
  const pasif = D.hedefler.filter(x => x.durum !== "aktif");
  if (pasif.length) {
    h += `<div class="sec"><span>${esc(pasif[0].durum)}</span><b>${pasif.length}</b></div>` +
         pasif.map(x => `<button class="row faded" data-hedef="${esc(x.kimlik)}">
           ${halka(x.ilerleme)}<span class="t"><span class="ttl">${esc(x.baslik)}</span>
           <span class="sub">${esc(x.kimlik)} · ${esc(x.durum)}</span></span><span class="chev">›</span></button>`).join("");
  }
  $("#v-hedefler").innerHTML = h + taslakBolumu();
}

/* ========================================================= GÖRÜNÜM: VERİLER */
function satirVeri(v) {
  const es = (v.eslesmeler || [])[0];
  const kaynak = (v.kaynaklar || [])[0];
  const alt = [v.kimlik, kaynak ? alanAdi(kaynak.url) : "kaynak yok",
               v.kaynak_tipi === "otonom" ? "otonom" : "senden"];
  return `<button class="row" data-veri="${esc(v.kimlik)}">
    <span class="t">
      <span class="ttl">${esc(v.ozet || v.baslik)}</span>
      <span class="sub">${esc(alt.join(" · "))}</span>
    </span>
    ${es ? `<span class="bdg ${turSinifi(es.tur)}">${esc(es.tur)}</span>` : ""}
    <span class="stars" title="güven">${yildiz(v.guven)}</span>
  </button>`;
}

function cizVeriler() {
  const q = arama.q.toLocaleLowerCase("tr");
  const liste = D.veriler.filter(v => {
    if (arama.tur && !(v.eslesmeler || []).some(e => e.tur === arama.tur)) return false;
    if (!q) return true;
    return (v.baslik + " " + v.ozet + " " + (v.kaynaklar || []).map(k => k.url).join(" "))
      .toLocaleLowerCase("tr").includes(q);
  });

  let h = `<div class="search">
    <span class="ic" aria-hidden="true">⌕</span>
    <input id="q" type="search" placeholder="veri ara" value="${esc(arama.q)}" autocomplete="off">
  </div>
  <div class="filters">
    <button class="chip" data-tur="" aria-pressed="${arama.tur === ""}">hepsi</button>
    ${TURLER.map(t => `<button class="chip" data-tur="${esc(t)}" aria-pressed="${arama.tur === t}">${esc(t)}</button>`).join("")}
  </div>`;

  if (!D.veriler.length) {
    h += `<div class="empty"><h3>Veri yok</h3>
      <p>Bir bilgi en az bir hedefle eşleştiğinde veri olur. Eşleşmeyenler arşive gider.</p></div>`;
  } else if (!liste.length) {
    h += `<div class="empty"><h3>Sonuç yok</h3><p>Arama ya da filtre eşleşmedi.</p></div>`;
  } else {
    const gruplar = {};
    for (const v of liste) (gruplar[v.tarih || "tarihsiz"] ||= []).push(v);
    for (const tarih of Object.keys(gruplar).sort().reverse()) {
      h += `<div class="sec"><span>${esc(tarih)}</span><b>${gruplar[tarih].length}</b></div>`;
      h += gruplar[tarih].map(satirVeri).join("");
    }
  }
  $("#v-veriler").innerHTML = h;
}

/* =========================================================== GÖRÜNÜM: ARŞİV */
function cizArsiv() {
  const el = $("#v-arsiv");
  if (!D.arsiv.length) {
    el.innerHTML = `<div class="empty"><h3>Arşiv boş</h3>
      <p>Hiçbir hedefle eşleşmeyen bilgiler burada durur. Yeni hedef açıldığında
      arşiv yeniden taranır — eski bir bilgi yeni hedefle eşleşirse veriye terfi eder.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="sec"><span>Eşleşmemiş</span><b>${D.arsiv.length}</b></div>` +
    D.arsiv.map(satirVeri).join("");
}

/* ========================================================= GÖRÜNÜM: AYARLAR */
function cizAyarlar() {
  const temalar = [["sistem", "Sistem"], ["light", "Açık"], ["dark", "Koyu"]];
  $("#v-ayarlar").innerHTML = `
    <div class="sec"><span>Görünüm</span><b></b></div>
    <div class="set">
      <div><div class="nm">Tema</div><div class="ds">Varsayılan: telefonun ayarı</div></div>
      <div class="seg">${temalar.map(([v, ad]) =>
        `<button data-tema="${v}" aria-pressed="${Y.tema === v}">${ad}</button>`).join("")}</div>
    </div>
    <div class="set">
      <div><div class="nm">Örnek veri</div><div class="ds">Arayüzü dolu görmek için</div></div>
      <div class="seg">
        <button data-ornek="0" aria-pressed="${!Y.ornek}">Kapalı</button>
        <button data-ornek="1" aria-pressed="${Y.ornek}">Açık</button>
      </div>
    </div>

    <div class="sec"><span>Veri kaynağı</span><b></b></div>
    <div class="kv"><span>derlenme</span><b>${esc((D.uretim || "—").slice(0, 16).replace("T", " "))}</b></div>
    <div class="kv"><span>hedef</span><b>${D.hedefler.length}</b></div>
    <div class="kv"><span>veri</span><b>${D.veriler.length}</b></div>
    <div class="kv"><span>arşiv</span><b>${D.arsiv.length}</b></div>
    <div class="kv"><span>rapor</span><b>${D.raporlar.length}</b></div>
    <div class="set"><div><div class="nm">Yenile</div>
      <div class="ds">data.json'u yeniden oku</div></div>
      <div class="seg"><button id="yenile">Yenile</button></div></div>

    <div class="sec"><span>Bekleyenler</span><b>${Y.kutu.length} bilgi · ${Y.taslaklar.length} taslak</b></div>
    <div class="set"><div><div class="nm">Dışa aktar</div>
      <div class="ds">Taslakları ve bekleyen bilgileri kopyala</div></div>
      <div class="seg"><button id="disa" ${Y.kutu.length || Y.taslaklar.length ? "" : "disabled"}>Kopyala</button></div></div>
    <div class="set"><div><div class="nm">Kutuyu temizle</div>
      <div class="ds">Yerel kayıtları siler</div></div>
      <div class="seg"><button id="temizle">Temizle</button></div></div>

    <div class="sec"><span>Bildirim</span><b></b></div>
    <p class="kv" style="display:block;color:var(--ink-2);line-height:1.6">
      Günlük 10:00 raporu bildirimi <b>Claude tarafından</b> gönderilir, uygulama
      tarafından değil. Bu yüzden uygulamayı açmasan da telefonuna düşer.
    </p>

    <div class="sec"><span>Hakkında</span><b></b></div>
    <p class="kv" style="display:block;color:var(--ink-2);line-height:1.6">
      Tasarım yönü <b>Cetvel</b>. Veri kaynağı deponun markdown kartlarıdır;
      <span class="mono">araclar/derle.py</span> onları bu uygulamanın okuduğu
      data.json dosyasına çevirir.
    </p>`;
}

/* ============================================================== ALT PANEL */
function panel(icerik) {
  kapat(false);
  const k = $("#katman");
  k.innerHTML = `<div class="sheet-bg" data-kapat="1"></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      <div class="sheet-body">${icerik}</div>
    </div>`;
  document.body.style.overflow = "hidden";
}
function kapat(yenidenCiz = true) {
  $("#katman").innerHTML = "";
  document.body.style.overflow = "";
  // Panelde soru işaretlemek açık soru sayısını değiştirir; arkadaki liste tazelensin.
  if (yenidenCiz) ciz();
}

function ciz() {
  ({ bugun: cizBugun, hedefler: cizHedefler, veriler: cizVeriler,
     arsiv: cizArsiv, ayarlar: cizAyarlar }[aktif])();
}

function panelHedef(kimlik) {
  const h = D.hedefler.find(x => x.kimlik === kimlik);
  if (!h) return;
  const varsayimRozet = d =>
    d === "çürütüldü" ? "k" : d === "destekleniyor" ? "g" : d === "kısmen" ? "u" : "";

  let c = `<span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--ink-3)">
      ${esc(h.kimlik)} · ${esc(h.durum)} · ${esc(h.oncelik)} öncelik</span>
    <h3>${esc(h.baslik)}</h3>`;
  if (h.varis) c += `<p class="lead">${esc(h.varis)}</p>`;

  c += `<div class="prog"><span class="nm">belirsizlik kapandı</span>
    <span class="tr"><i style="width:${h.ilerleme}%"></i></span>
    <span class="pc">${h.ilerleme}</span></div>`;

  if (h.olcut) c += `<div class="sec"><span>Başarı ölçütü</span><b></b></div><p class="lead">${esc(h.olcut)}</p>`;
  if (h.durum_metni) c += `<div class="sec"><span>Şu anki durum</span><b></b></div><p class="lead">${esc(h.durum_metni)}</p>`;
  if (h.sonraki) c += `<div class="sec"><span>Sonraki adım</span><b></b></div><p class="lead">${esc(h.sonraki)}</p>`;

  if ((h.varsayimlar || []).length) {
    c += `<div class="sec"><span>Varsayımlar</span><b>${h.varsayimlar.length}</b></div>`;
    c += h.varsayimlar.map(v => `<div class="asm">
      <span class="n">${esc(v.n)}</span>
      <span class="m">${esc(v.metin)}${v.dayanak && v.dayanak !== "—" ? `<span class="sub mono" style="display:block;font-size:9.5px;color:var(--ink-3);margin-top:2px">dayanak: ${esc(v.dayanak)}</span>` : ""}</span>
      <span class="bdg ${varsayimRozet(v.durum)}">${esc(v.durum)}</span></div>`).join("");
  }

  if ((h.sorular || []).length) {
    const acik = h.sorular.filter(s => !s.cevaplandi && !Y.sorular[h.kimlik + "|" + s.metin]).length;
    c += `<div class="sec"><span>Açık sorular</span><b>${acik} açık</b></div>`;
    c += h.sorular.map(s => {
      const isaret = s.cevaplandi || Y.sorular[h.kimlik + "|" + s.metin];
      return `<button class="qz ${isaret ? "on" : ""}" data-soru="${esc(h.kimlik)}|${esc(s.metin)}">
        <span class="box">${isaret ? "✓" : ""}</span><span class="m">${esc(s.metin)}</span></button>`;
    }).join("");
  }

  if ((h.veriler || []).length) {
    c += `<div class="sec"><span>Bağlı veriler</span><b>${h.veriler.length}</b></div>`;
    c += h.veriler.map(v => `<button class="row" data-veri="${esc(v.kimlik)}">
      <span class="t"><span class="ttl">${esc(v.etki)}</span>
      <span class="sub">${esc(v.kimlik)}</span></span>
      <span class="bdg ${turSinifi(v.tur)}">${esc(v.tur)}</span></button>`).join("");
  }
  panel(c);
}

function panelVeri(kimlik) {
  const v = D.veriler.find(x => x.kimlik === kimlik) || D.arsiv.find(x => x.kimlik === kimlik);
  if (!v) return;
  let c = `<span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--ink-3)">
      ${esc(v.kimlik)} · ${esc(v.tarih)} · ${v.kaynak_tipi === "otonom" ? "Claude buldu" : "sen paylaştın"}
      · güven ${esc(v.guven)}</span>
    <h3>${esc(v.baslik)}</h3>`;
  if (v.ozet) c += `<p class="lead">${esc(v.ozet)}</p>`;

  if ((v.eslesmeler || []).length) {
    c += `<div class="sec"><span>Hedef eşleşmeleri</span><b>${v.eslesmeler.length}</b></div>`;
    c += v.eslesmeler.map(e => `<button class="row" data-hedef="${esc(e.hedef)}">
      <span class="t"><span class="ttl">${esc(e.etki)}</span>
      <span class="sub">${esc(e.hedef)}</span></span>
      <span class="bdg ${turSinifi(e.tur)}">${esc(e.tur)}</span></button>`).join("");
  }

  const d = v.derinlesme || {};
  if (Object.keys(d).length) {
    c += `<div class="sec"><span>Derinleşme</span><b></b></div>`;
    for (const [k, val] of Object.entries(d)) {
      c += `<div class="asm"><span class="m"><b>${esc(k)}</b> — ${esc(val)}</span></div>`;
    }
  }

  if ((v.iddialar || []).length) {
    c += `<div class="sec"><span>İddialar</span><b>${v.iddialar.length}</b></div>`;
    c += v.iddialar.map(i => `<div class="asm">
      <span class="m">${esc(i.metin)}<span class="sub mono" style="display:block;font-size:9.5px;color:var(--ink-3);margin-top:2px">${esc(i.dogrulama)}</span></span>
      <span class="bdg">${esc(i.tip)}</span></div>`).join("");
  }

  if ((v.kaynaklar || []).length) {
    c += `<div class="sec"><span>Kaynaklar</span><b>${v.kaynaklar.length}</b></div>`;
    c += v.kaynaklar.map(k => `<a class="row" href="${esc(k.url)}" target="_blank" rel="noopener noreferrer">
      <span class="t"><span class="ttl">${esc(alanAdi(k.url))}</span>
      <span class="sub">erişim ${esc(k.erisim)}</span></span><span class="chev">↗</span></a>`).join("");
  }
  if (v.eylem) c += `<div class="sec"><span>Buradan çıkan eylem</span><b></b></div><p class="lead">${esc(v.eylem)}</p>`;
  panel(c);
}

/* ================================================================== STORY */
let story = { rapor: null, i: 0 };

function storyAc(tarih) {
  const r = D.raporlar.find(x => x.tarih === tarih);
  if (!r) return;
  story = { rapor: r, i: 0 };
  storyCiz();
}

function storyCiz() {
  const r = story.rapor;
  const bolumler = r.bolumler;
  const b = bolumler[story.i];
  const son = story.i === bolumler.length - 1;

  const oneriBolumu = /ilerleriz|öneri/i.test(b.baslik) && r.oneriler.length;
  let govde = `<h2>${esc(b.baslik)}</h2>`;
  if (!oneriBolumu) govde += mdParagraf(b.icerik);

  if (/verilerimiz/i.test(b.baslik)) govde += grafikVeri();
  if (/hedef/i.test(b.baslik)) govde += grafikHedef();

  if (oneriBolumu) {
    govde += r.oneriler.map((o, i) => {
      const k = Y.kararlar[r.tarih + "|" + i];
      return `<div style="border-top:1px solid var(--rule-soft);padding-top:10px;margin-top:12px">
        <p style="color:var(--ink);font-weight:500">${esc(o)}</p>
        <div class="ar">${k
          ? `<span class="karar ${k}">${k === "y" ? "✓ onaylandı" : "✕ reddedildi"}</span>`
          : `<button class="y" data-karar="${i}|y">Onayla</button>
             <button data-karar="${i}|n">Reddet</button>`}</div>
      </div>`;
    }).join("");
  }

  $("#katman").innerHTML = `<div class="story" role="dialog" aria-modal="true">
    <div class="segs">${bolumler.map((_, i) =>
      `<i class="${i <= story.i ? "on" : ""}"></i>`).join("")}</div>
    <div class="story-top">
      <span>${esc(r.tarih)} · ${story.i + 1}/${bolumler.length}</span>
      <button data-kapat="1" aria-label="Kapat">✕</button>
    </div>
    <div class="story-body" id="sb">${govde}</div>
    <div class="story-nav">
      <button data-adim="-1" ${story.i === 0 ? "disabled" : ""}>← Geri</button>
      <button class="pri" data-adim="1">${son ? "Bitir" : "İleri →"}</button>
    </div>
  </div>`;
  document.body.style.overflow = "hidden";
}

function mdParagraf(md) {
  return (md || "").split("\n").map(s => s.trim())
    .filter(s => s && !s.startsWith("<") && !/^\|[\s\-:|]+\|$/.test(s))
    .map(s => {
      if (s.startsWith("|")) {
        const h = s.replace(/^\||\|$/g, "").split("|").map(x => x.trim());
        return `<div class="kv"><span>${esc(h[0])}</span><b>${esc(h.slice(1).join(" · "))}</b></div>`;
      }
      const t = esc(s.replace(/^[-*]\s+/, "• ").replace(/^\d+\.\s+/, ""))
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      return `<p>${t}</p>`;
    }).join("");
}

function grafikVeri() {
  const sayac = {};
  for (const v of D.veriler) sayac[v.tarih] = (sayac[v.tarih] || 0) + 1;
  const gunler = Object.keys(sayac).sort().slice(-10);
  if (gunler.length < 2) return "";
  let toplam = 0;
  const birikim = gunler.map(g => (toplam += sayac[g]));
  const enb = Math.max(...birikim, 1);
  return `<div class="chart"><div class="lbl">Veri birikimi · son ${gunler.length} gün</div>
    <div class="bars">${birikim.map(n =>
      `<i style="height:${Math.max(6, n / enb * 100)}%"></i>`).join("")}</div></div>`;
}

function grafikHedef() {
  const k = hedefKumeleri();
  if (!k.hepsi.length) return "";
  return `<div class="chart"><div class="lbl">Hedef ilerleme</div>
    ${k.hepsi.map(h => `<div class="prog">
      <span class="nm">${esc(h.baslik)}</span>
      <span class="tr"><i style="width:${h.ilerleme}%"></i></span>
      <span class="pc">${h.ilerleme}</span></div>`).join("")}</div>`;
}

/* ================================================= HEDEF TASLAĞI */
const TASLAK_ALANLARI = [
  ["baslik", "Hedef", "Ölçülebilir bir varış noktası — yapılacaklar listesi değil", 1],
  ["varis", "Varış noktası", "Ulaşınca ne farklı olacak?", 2],
  ["neden", "Neden", "Hangi daha büyük şeye hizmet ediyor?", 2],
  ["olcut", "Başarı ölçütü", "Ulaştığını nasıl anlarız? Tarih ya da sayı yaz", 2],
  ["sorular", "Açık sorular", "Cevabını bilmediğin, cevabı hedefi değiştirecek sorular — her satıra bir tane", 3],
];

function taslakFormu(onDolgu) {
  panel(`<h3>Hedef taslağı</h3>
    <p class="lead">Sadece ilk alan zorunlu. Alt alanları doldurursan Claude'un
    açacağı kart daha iyi olur — özellikle açık sorular.</p>
    <div class="form">
      ${TASLAK_ALANLARI.map(([ad, etiket, ipucu, satir]) => `
        <label class="fld">
          <span class="fl">${esc(etiket)}</span>
          <textarea data-t="${ad}" rows="${satir}" placeholder="${esc(ipucu)}">${esc(
            ad === "baslik" ? (onDolgu || "") : "")}</textarea>
        </label>`).join("")}
    </div>
    <div class="ar" style="margin-top:14px">
      <button class="y" id="taslak-kaydet">Kaydet</button>
      <button data-kapat="1">Vazgeç</button>
    </div>`);
  const ilk = $('[data-t="baslik"]');
  if (ilk) ilk.focus();
}

function taslakKaydet() {
  const al = ad => ($(`[data-t="${ad}"]`) || {}).value || "";
  const baslik = al("baslik").trim();
  if (!baslik) return toast("hedef başlığı boş olamaz");
  Y.taslaklar.push({
    baslik,
    varis: al("varis").trim(),
    neden: al("neden").trim(),
    olcut: al("olcut").trim(),
    sorular: al("sorular").split("\n").map(x => x.trim()).filter(Boolean),
    tarih: bugunTarih(),
  });
  kaydet();
  kapat(false);
  sekme("hedefler");
  toast("taslak kaydedildi — kopyalayıp Claude'a ver");
}

function taslakMetni() {
  return Y.taslaklar.map(t => {
    const satir = [`## Hedef taslağı — ${t.baslik}`, `tarih: ${t.tarih}`];
    if (t.varis) satir.push(`varış noktası: ${t.varis}`);
    if (t.neden) satir.push(`neden: ${t.neden}`);
    if (t.olcut) satir.push(`başarı ölçütü: ${t.olcut}`);
    if (t.sorular.length) satir.push("açık sorular:", ...t.sorular.map(q => `  - ${q}`));
    return satir.join("\n");
  }).join("\n\n");
}

/* ============================================== EKLEME + YEREL EŞLEŞTİRME */
const DURAK = new Set(("ve ile için bir bu şu o da de ki mi ne çok daha en gibi olarak olan " +
  "var yok ama ancak ise the a an of to in is are and or for on at by").split(" "));

function kokler(metin) {
  return (metin || "").toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !DURAK.has(w))
    .map(w => w.slice(0, 6));           // kaba gövdeleme: Türkçe ekleri kırpar
}

function hedefKokleri(h) {
  return new Set(kokler([h.baslik, h.varis, h.olcut,
    ...(h.sorular || []).map(s => s.metin),
    ...(h.varsayimlar || []).map(v => v.metin)].join(" ")));
}

function eslestir(metin) {
  const g = new Set(kokler(metin));
  if (!g.size) return [];
  const aktifler = D.hedefler.filter(h => h.durum === "aktif");
  const kokler_ = aktifler.map(hedefKokleri);

  // Bir kelime kaç hedefte geçiyor? Tek hedefte geçen kelime ayırt edicidir;
  // birden çok hedefte geçen kelime (ör. "ürün") neredeyse hiçbir şey söylemez.
  const yaygin = new Map();
  for (const w of g) {
    let n = 0;
    for (const k of kokler_) if (k.has(w)) n++;
    if (n) yaygin.set(w, n);
  }

  return aktifler
    .map((h, i) => {
      let puan = 0;
      for (const [w, n] of yaygin) {
        if (!kokler_[i].has(w)) continue;
        puan += n === 1 ? 2 : 1;
      }
      return { hedef: h, puan };
    })
    .filter(x => x.puan >= 2)
    .sort((a, b) => b.puan - a.puan);
}

const ADIMLAR = ["kaydedildi", "hedeflerle karşılaştırılıyor", "eşleşme aranıyor", "sonuç"];

async function isle(metin, yol, gorsel) {
  const el = $("#islem");
  const ciz = (i, sonuc) => {
    el.innerHTML = `<div class="proc">${ADIMLAR.map((a, j) => `
      <div class="step ${j < i ? "done" : j === i ? "on" : ""}">
        <span class="dot"></span><span>${j === 3 && sonuc ? sonuc : a}</span>
      </div>`).join("")}</div>`;
  };
  for (let i = 0; i < 3; i++) { ciz(i); await new Promise(r => setTimeout(r, 380)); }

  const adaylar = eslestir(metin);
  let secilen = null;

  if (adaylar.length === 1 || (adaylar.length > 1 && adaylar[0].puan >= adaylar[1].puan * 1.5)) {
    secilen = adaylar[0].hedef;                       // net → sorma (44a)
  } else if (adaylar.length > 1) {
    secilen = await sor(adaylar);                     // belirsiz → sor
  }

  const hedefsiz = !D.hedefler.some(h => h.durum === "aktif");
  const sonuc = secilen ? "eşleşti: " + secilen.kimlik
              : hedefsiz ? "hedef yok — eşleştirme yapılamadı"
              : "eşleşme yok — arşive gitti";
  ciz(3, sonuc);
  Y.kutu.unshift({
    metin, yol, gorsel: gorsel || null,
    tarih: bugunTarih(),
    hedef: secilen ? secilen.kimlik : null,
  });
  // Hiç hedef yokken eşleştirme anlamsızdır; kullanıcı büyük ihtimalle
  // hedefin kendisini yazmıştır. Sessizce arşivlemek yerine bunu söyle.
  sonUyari = hedefsiz ? { metin, tur: "hedefsiz" } : null;
  kaydet();
  titret(secilen ? 18 : 8);
  setTimeout(() => { cizBugun(); }, 900);
}

function sor(adaylar) {
  return new Promise(coz => {
    panel(`<h3>Hangi hedefe bağlanıyor?</h3>
      <p class="lead">Birden fazla hedefe yakın duruyor. Sen seç.</p>
      ${adaylar.slice(0, 4).map((a, i) => `<button class="row" data-sec="${i}">
        ${halka(a.hedef.ilerleme)}
        <span class="t"><span class="ttl">${esc(a.hedef.baslik)}</span>
        <span class="sub">${esc(a.hedef.kimlik)} · yakınlık ${a.puan}</span></span>
        <span class="chev">›</span></button>`).join("")}
      <button class="row" data-sec="-1"><span class="t">
        <span class="ttl">Hiçbiri — arşive at</span></span><span class="chev">›</span></button>`);
    $("#katman").addEventListener("click", e => {
      const b = e.target.closest("[data-sec]");
      if (!b) return;
      const i = +b.dataset.sec;
      kapat();
      coz(i < 0 ? null : adaylar[i].hedef);
    }, { once: false });
  });
}

/* ================================================================ OLAYLAR */
function sekme(v) {
  if (v !== aktif) sonUyari = null;
  aktif = v;
  document.querySelectorAll(".tab").forEach(t =>
    t.setAttribute("aria-selected", String(t.dataset.v === v)));
  document.querySelectorAll(".view").forEach(s => { s.hidden = s.id !== "v-" + v; });
  ciz();
  window.scrollTo(0, 0);
}

document.addEventListener("click", async e => {
  const t = e.target;

  const tab = t.closest(".tab");
  if (tab) return sekme(tab.dataset.v);

  if (t.closest("[data-kapat]")) return kapat();

  const strip = t.closest("[data-rapor]");
  if (strip) return storyAc(strip.dataset.rapor);

  const adim = t.closest("[data-adim]");
  if (adim) {
    const yeni = story.i + Number(adim.dataset.adim);
    if (yeni < 0) return;
    if (yeni >= story.rapor.bolumler.length) return kapat();
    story.i = yeni;
    return storyCiz();
  }

  const karar = t.closest("[data-karar]");
  if (karar) {
    const [i, k] = karar.dataset.karar.split("|");
    Y.kararlar[story.rapor.tarih + "|" + i] = k;
    kaydet(); titret(12);
    return storyCiz();
  }

  const soru = t.closest("[data-soru]");
  if (soru) {
    const k = soru.dataset.soru;
    Y.sorular[k] = !Y.sorular[k];
    if (!Y.sorular[k]) delete Y.sorular[k];
    kaydet(); titret(10);
    return panelHedef(k.split("|")[0]);
  }

  const hedef = t.closest("[data-hedef]");
  if (hedef) return panelHedef(hedef.dataset.hedef);

  const veri = t.closest("[data-veri]:not(a)");
  if (veri) return panelVeri(veri.dataset.veri);

  const chip = t.closest("[data-tur]");
  if (chip) { arama.tur = chip.dataset.tur; return cizVeriler(); }

  const tema = t.closest("[data-tema]");
  if (tema) { Y.tema = tema.dataset.tema; kaydet(); temaUygula(); return cizAyarlar(); }

  const ornek = t.closest("[data-ornek]");
  if (ornek) { Y.ornek = ornek.dataset.ornek === "1"; kaydet(); return yukle(); }

  if (t.closest("#yenile")) { toast("yenileniyor…"); return yukle(); }

  if (t.closest("#taslak-yeni")) return taslakFormu("");
  if (t.closest("#taslak-kaydet")) return taslakKaydet();

  if (t.closest("#uyari-hedef")) {
    const metin = sonUyari ? sonUyari.metin : "";
    sonUyari = null;
    return taslakFormu(metin);
  }
  if (t.closest("#uyari-kapat")) { sonUyari = null; return cizBugun(); }

  if (t.closest("#taslak-kopyala")) {
    try { await navigator.clipboard.writeText(taslakMetni()); toast("kopyalandı — Claude'a yapıştır"); }
    catch (err) { toast("kopyalanamadı"); }
    return;
  }

  const taslak = t.closest("[data-taslak]");
  if (taslak) {
    const i = +taslak.dataset.taslak, tt = Y.taslaklar[i];
    return panel(`<span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--ink-3)">
        TASLAK · ${esc(tt.tarih)} · gönderilmeyi bekliyor</span>
      <h3>${esc(tt.baslik)}</h3>
      ${tt.varis ? `<div class="sec"><span>Varış noktası</span><b></b></div><p class="lead">${esc(tt.varis)}</p>` : ""}
      ${tt.neden ? `<div class="sec"><span>Neden</span><b></b></div><p class="lead">${esc(tt.neden)}</p>` : ""}
      ${tt.olcut ? `<div class="sec"><span>Başarı ölçütü</span><b></b></div><p class="lead">${esc(tt.olcut)}</p>` : ""}
      ${tt.sorular.length ? `<div class="sec"><span>Açık sorular</span><b>${tt.sorular.length}</b></div>` +
        tt.sorular.map(q => `<div class="asm"><span class="m">${esc(q)}</span></div>`).join("") : ""}
      <div class="ar" style="margin-top:14px">
        <button class="y" id="taslak-kopyala">Kopyala</button>
        <button data-taslak-sil="${i}">Sil</button>
      </div>`);
  }

  const sil = t.closest("[data-taslak-sil]");
  if (sil) {
    Y.taslaklar.splice(+sil.dataset.taslakSil, 1);
    kaydet(); kapat(false); sekme("hedefler");
    return toast("taslak silindi");
  }

  if (t.closest("#temizle")) {
    Y.kutu = []; kaydet(); cizAyarlar(); return toast("gelen kutusu temizlendi");
  }

  if (t.closest("#disa")) {
    const md = [taslakMetni(), Y.kutu.map(it =>
      `## ${it.tarih} · ${it.yol}\n${it.metin}\n\n> eşleşme: ${it.hedef || "yok"}\n`).join("\n")]
      .filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(md); toast("kopyalandı — Claude'a yapıştır"); }
    catch (err) { toast("kopyalanamadı"); }
    return;
  }

  const yol = t.closest("[data-yol]");
  if (yol) return yolIsle(yol.dataset.yol);

  if (t.closest("#fab")) {
    if (aktif !== "bugun") sekme("bugun");
    const g = $("#giris"); if (g) { g.focus(); g.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return;
  }
});

async function yolIsle(yol) {
  const g = $("#giris");
  if (yol === "gonder") {
    const metin = (g.value || "").trim();
    if (!metin) return toast("önce bir şey yaz");
    g.value = "";
    return isle(metin, "yazı");
  }
  if (yol === "link") {
    try {
      const p = await navigator.clipboard.readText();
      if (p) { g.value = (g.value ? g.value + "\n" : "") + p; g.focus(); toast("panodan alındı"); }
      else toast("pano boş");
    } catch (err) { toast("panoya erişilemedi — elle yapıştır"); g.focus(); }
    return;
  }
  if (yol === "foto") return $("#dosya").click();
  if (yol === "ses") return dinle(g);
}

function dinle(g) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("bu tarayıcı sesli girişi desteklemiyor");
  const r = new SR();
  r.lang = "tr-TR"; r.interimResults = true; r.continuous = false;
  const btn = document.querySelector('[data-yol="ses"]');
  btn.classList.add("on"); btn.textContent = "Dinliyor";
  let son = "";
  r.onresult = ev => {
    son = Array.from(ev.results).map(x => x[0].transcript).join("");
    g.value = son;
  };
  r.onerror = () => toast("ses alınamadı");
  r.onend = () => {
    btn.classList.remove("on"); btn.textContent = "Sesli";
    if (son.trim()) g.focus();
  };
  r.start();
  toast("konuş…");
}

document.addEventListener("change", e => {
  if (e.target.id !== "dosya") return;
  const f = e.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const g = $("#giris");
    isle((g.value || "").trim() || "[fotoğraf] " + f.name, "fotoğraf", fr.result);
    g.value = "";
  };
  fr.readAsDataURL(f);
});

document.addEventListener("input", e => {
  if (e.target.id === "q") {
    arama.q = e.target.value;
    const el = $("#v-veriler");
    const yer = el.scrollTop;
    cizVeriler();
    const yeni = $("#q");
    if (yeni) { yeni.focus(); yeni.setSelectionRange(arama.q.length, arama.q.length); }
    el.scrollTop = yer;
  }
});

/* kaydırarak silme — yalnız gelen kutusu satırlarında (47b) */
let kaydir = null;
document.addEventListener("touchstart", e => {
  const r = e.target.closest("[data-kutu]");
  if (r) kaydir = { el: r, x: e.touches[0].clientX, i: +r.dataset.kutu };
}, { passive: true });
document.addEventListener("touchmove", e => {
  if (!kaydir) return;
  const dx = e.touches[0].clientX - kaydir.x;
  if (dx < 0) {
    kaydir.el.style.transform = `translateX(${Math.max(dx, -110)}px)`;
    kaydir.el.style.opacity = String(Math.max(0.25, 1 + dx / 160));
  }
}, { passive: true });
document.addEventListener("touchend", () => {
  if (!kaydir) return;
  const dx = parseFloat((kaydir.el.style.transform.match(/-?\d+(\.\d+)?/) || [0])[0]) || 0;
  if (dx <= -80) {
    Y.kutu.splice(kaydir.i, 1); kaydet(); titret(14); cizBugun(); toast("silindi");
  } else {
    kaydir.el.style.transform = ""; kaydir.el.style.opacity = "";
  }
  kaydir = null;
});

document.addEventListener("keydown", e => { if (e.key === "Escape") kapat(); });

/* ================================================================= AÇILIŞ */
function temaUygula() {
  const r = document.documentElement;
  if (Y.tema === "sistem") r.removeAttribute("data-theme");
  else r.setAttribute("data-theme", Y.tema);
}

async function yukle() {
  const dosya = Y.ornek ? "ornek.json" : "data.json";
  try {
    const r = await fetch(dosya + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch (err) {
    D = { hedefler: [], veriler: [], arsiv: [], raporlar: [], uretim: "" };
    toast(dosya + " okunamadı");
  }
  $("#stamp").textContent = D.hedefler.length
    ? D.hedefler.filter(h => h.durum === "aktif").length + " aktif · " + D.veriler.length + " veri"
    : "kurulum";
  sekme(aktif);
}

/* paylaş menüsünden gelen içerik (manifest share_target) */
function paylasilani(al) {
  const p = new URLSearchParams(location.search);
  const parcalar = [p.get("baslik"), p.get("metin"), p.get("adres")].filter(Boolean);
  if (p.get("sekme") === "rapor") aktif = "bugun";
  if (!parcalar.length) return;
  history.replaceState(null, "", location.pathname);
  setTimeout(() => {
    const g = $("#giris");
    if (g) { g.value = parcalar.join("\n"); g.focus(); toast("paylaşımdan alındı"); }
  }, 60);
}

yukleYerel();
temaUygula();
yukle().then(paylasilani);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js").catch(() => {}));
}
