/* Beyin Sistemi — hedefler, problemler, çözümler.
   Veri: data.json (araclar/derle.py markdown kartlarından üretir).
   Yerel: masa/arşiv değişiklikleri ve eklenen problemler localStorage'da bekler;
   uygulama depoya yazamaz, bu yüzden değişiklikler dışa aktarılıp Claude'a verilir. */
"use strict";

const ANAHTAR = "beyin-v2";
let D = { hedefler: [], veriler: [], raporlar: [] };
let Y = { masa: {}, yeniProblemler: [], acikProblem: null };
let aktif = "hedefler";

const $ = (s, k = document) => k.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function yukleYerel() {
  try { Object.assign(Y, JSON.parse(localStorage.getItem(ANAHTAR) || "{}")); } catch (e) {}
}
function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(Y)); } catch (e) {}
}
function bildir(metin) {
  const eski = $(".bildirim"); if (eski) eski.remove();
  const el = document.createElement("div");
  el.className = "bildirim"; el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* Masa durumu: yerel değişiklik varsa o, yoksa kartın kendi durumu. */
function masada(h) {
  return Y.masa[h.kimlik] !== undefined ? Y.masa[h.kimlik] : h.durum === "masada";
}
function bekleyenler() {
  return D.hedefler.filter(h => Y.masa[h.kimlik] !== undefined &&
    Y.masa[h.kimlik] !== (h.durum === "masada"));
}
function problemleri(h) {
  const eklenen = Y.yeniProblemler
    .filter(p => p.hedef === h.kimlik)
    .map(p => ({ baslik: p.metin, durum: "gönderilmedi", cozum: "", kaynak: "", arac: "" }));
  return (h.problemler || []).concat(eklenen);
}

/* ------------------------------------------------------ hedef listesi */
function hedefKarti(h) {
  const pr = problemleri(h);
  const coz = pr.filter(p => p.durum === "çözüldü").length;
  const acik = pr.length - coz;
  return `<button class="hedef ${masada(h) ? "masada" : "arsivde"}" data-hedef="${esc(h.kimlik)}">
    <div class="ad">${esc(h.baslik)}</div>
    <div class="alt">
      ${coz ? `<span class="rozet c">${coz} çözüldü</span>` : ""}
      ${acik ? `<span class="rozet k">${acik} açık problem</span>` : ""}
      ${!pr.length ? `<span class="rozet">problem yok</span>` : ""}
      <span class="rozet">${(h.ogrenilenler || []).length} bulgu</span>
    </div>
  </button>`;
}

function cizHedefler() {
  const masaListe = D.hedefler.filter(masada);
  const arsiv = D.hedefler.filter(h => !masada(h));
  let g = "";

  if (!D.hedefler.length) {
    g = `<div class="bos" style="margin-top:22px"><b>Henüz hedef yok</b>
      Claude'a bir hedef anlat; buraya düşsün.</div>`;
  } else {
    if (masaListe.length) {
      g += `<div class="bolum">Çalışma masasında — araştırılıyor</div>`;
      g += masaListe.map(hedefKarti).join("");
    }
    if (arsiv.length) {
      g += `<div class="bolum">Arşivde — durdu</div>`;
      g += arsiv.map(hedefKarti).join("");
    }
  }
  $("#v-hedefler").innerHTML = g;
}

/* ------------------------------------------------------ çalışma masası */
function cizMasa() {
  const liste = D.hedefler.filter(masada);
  let g = "";

  if (!liste.length) {
    g = `<div class="bos" style="margin-top:22px"><b>Masa boş</b>
      Hiçbir hedef araştırılmıyor. Bir hedefi masaya al, her sabah üstünde çalışayım.</div>`;
  } else {
    g += `<p class="aciklama" style="padding-top:20px">Her sabah bu hedeflerin
      açık problemleri araştırılıyor. Arşive kaldırdığın hedef bırakılıyor.</p>`;
    for (const h of liste) {
      const acik = problemleri(h).filter(p => p.durum !== "çözüldü");
      g += `<button class="hedef masada" data-hedef="${esc(h.kimlik)}">
        <div class="ad">${esc(h.baslik)}</div>
        <div class="alt">
          ${acik.length
            ? `<span class="rozet k">sırada: ${esc(acik[0].baslik.slice(0, 42))}${acik[0].baslik.length > 42 ? "…" : ""}</span>`
            : `<span class="rozet c">açık problem kalmadı</span>`}
        </div>
      </button>`;
    }
  }

  const bek = bekleyenler();
  if (bek.length) {
    g += `<div class="bolum">Claude'a bildirilmeyi bekliyor</div>`;
    g += bek.map(h => `<div class="oneri"><p>${esc(h.baslik)} →
      ${Y.masa[h.kimlik] ? "masaya alındı" : "arşive kaldırıldı"}</p></div>`).join("");
    g += `<button class="dugme dolu" data-eylem="disa">Değişiklikleri kopyala
      <small>Claude'a yapıştır, kartlara işlensin</small></button>`;
  }
  $("#v-masa").innerHTML = g;
}

/* ------------------------------------------------------ hedef sayfası */
function sayfaAc(kimlik) {
  const h = D.hedefler.find(x => x.kimlik === kimlik);
  if (!h) return;
  const pr = problemleri(h);
  const acikMi = masada(h);

  let g = `<div class="sayfa"><div class="sayfa-ust">
      <button class="geri" data-eylem="kapat" aria-label="Geri">‹</button>
      <span class="yer">Hedef</span></div>
    <div class="sayfa-ic">
      <h2>${esc(h.baslik)}</h2>

      <div class="anahtar">
        <button data-masa="1|${esc(kimlik)}" aria-pressed="${acikMi}">Çalışma masası</button>
        <button data-masa="0|${esc(kimlik)}" aria-pressed="${!acikMi}">Arşiv</button>
      </div>
      <p class="aciklama">${acikMi
        ? "Her sabah bu hedefin açık problemleri araştırılıyor."
        : "Bu hedefin araştırması durdu."}</p>`;

  g += `<div class="bolum">Problemler</div>`;
  if (!pr.length) {
    g += `<div class="bos">Bu hedefin altında henüz problem yok.
      Yaşadığın sıkıntıyı anlat, araştırıp çözümü buraya ekleyeyim.</div>`;
  } else {
    g += pr.map((p, i) => {
      const cozuldu = p.durum === "çözüldü";
      const acik = Y.acikProblem === kimlik + "|" + i;
      return `<div class="problem ${acik ? "acik" : ""}">
        <button data-problem="${esc(kimlik)}|${i}">
          <span class="ad">${esc(p.baslik)}</span>
          <span class="im">${cozuldu ? "›" : "•"}</span>
        </button>
        ${acik ? `<div class="govde">
          ${p.cozum ? `<p>${esc(p.cozum)}</p>` : `<p>${p.durum === "gönderilmedi"
            ? "Henüz Claude'a iletilmedi. Aşağıdan kopyalayıp ver."
            : "Araştırılıyor — çözüm henüz yok."}</p>`}
          ${p.arac ? `<span class="arac">${esc(p.arac)}</span>` : ""}
        </div>` : ""}
      </div>`;
    }).join("");
  }
  g += `<button class="dugme dolu" data-yeni-problem="${esc(kimlik)}">Problem ekle
    <small>Yaşadığın sıkıntıyı yaz</small></button>`;

  const og = h.ogrenilenler || [];
  const TUR_ADI = { "çürütür":"çürüttü", "doğrular":"doğruladı", "yöntem":"yöntem",
                    "risk":"risk", "fırsat":"fırsat", "açık-soru":"cevap" };
  if (og.length) {
    g += `<div class="bolum">Öğrenilenler</div>`;
    g += og.map(o => `<div class="satir">
      <span class="nokta ${o.tur === "çürütür" || o.tur === "risk" ? "k"
        : o.tur === "doğrular" || o.tur === "fırsat" ? "c" : ""}"></span>
      <div><p>${esc(o.metin)}</p><div class="kaynak">${esc(TUR_ADI[o.tur] || o.tur)}</div></div>
    </div>`).join("");
  }

  const on = h.oneriler || [];
  if (on.length) {
    g += `<div class="bolum">Öneriler</div>`;
    g += on.map(o => `<div class="oneri"><p>${esc(o)}</p></div>`).join("");
  }

  g += `</div></div>`;
  $("#sayfa").innerHTML = g;
  document.body.style.overflow = "hidden";
}

function sayfaKapat() {
  $("#sayfa").innerHTML = "";
  document.body.style.overflow = "";
  ciz();
}

/* ------------------------------------------------------ problem ekleme */
function problemFormu(kimlik) {
  $("#katman").innerHTML = `<div class="ortu" data-eylem="ortu-kapat">
    <div class="kutu">
      <h3>Problem ekle</h3>
      <p>Ne yaşıyorsun? Tek cümle yeter — gerisini araştırırım.</p>
      <textarea id="pmetin" placeholder="Örnek: Karakterlerin yürüme animasyonu takılıyor"></textarea>
      <div class="sirala">
        <button data-eylem="ortu-kapat">Vazgeç</button>
        <button class="dolu" data-kaydet="${esc(kimlik)}">Kaydet</button>
      </div>
    </div></div>`;
  setTimeout(() => { const t = $("#pmetin"); if (t) t.focus(); }, 60);
}

function disaAktar() {
  const parcalar = [];
  for (const h of bekleyenler()) {
    parcalar.push(`${h.kimlik} — ${h.baslik}\n  durum: ${Y.masa[h.kimlik] ? "masada" : "arsivde"}`);
  }
  for (const p of Y.yeniProblemler) {
    const h = D.hedefler.find(x => x.kimlik === p.hedef);
    parcalar.push(`${p.hedef} — yeni problem\n  ${p.metin}` + (h ? `\n  (hedef: ${h.baslik})` : ""));
  }
  return parcalar.join("\n\n");
}

/* ------------------------------------------------------ olaylar */
document.addEventListener("click", async e => {
  const t = e.target;

  const sekme = t.closest(".sekmeler button");
  if (sekme) {
    aktif = sekme.dataset.v;
    document.querySelectorAll(".sekmeler button").forEach(b =>
      b.setAttribute("aria-selected", String(b === sekme)));
    document.querySelectorAll(".gorunum").forEach(s => { s.hidden = s.id !== "v-" + aktif; });
    $("#baslik").textContent = aktif === "masa" ? "Çalışma masası" : "Hedefler";
    ciz(); window.scrollTo(0, 0);
    return;
  }

  if (t.closest("[data-eylem='kapat']")) return sayfaKapat();
  if (t.closest("[data-eylem='ortu-kapat']") && !t.closest(".kutu")) {
    return ($("#katman").innerHTML = "");
  }
  if (t.matches("[data-eylem='ortu-kapat']")) return ($("#katman").innerHTML = "");

  const hedef = t.closest("[data-hedef]");
  if (hedef) return sayfaAc(hedef.dataset.hedef);

  const masaDug = t.closest("[data-masa]");
  if (masaDug) {
    const [deger, kimlik] = masaDug.dataset.masa.split("|");
    Y.masa[kimlik] = deger === "1";
    kaydet();
    bildir(Y.masa[kimlik] ? "masaya alındı" : "arşive kaldırıldı");
    return sayfaAc(kimlik);
  }

  const prob = t.closest("[data-problem]");
  if (prob) {
    const k = prob.dataset.problem;
    Y.acikProblem = Y.acikProblem === k ? null : k;
    kaydet();
    return sayfaAc(k.split("|")[0]);
  }

  const yeni = t.closest("[data-yeni-problem]");
  if (yeni) return problemFormu(yeni.dataset.yeniProblem);

  const kay = t.closest("[data-kaydet]");
  if (kay) {
    const metin = ($("#pmetin").value || "").trim();
    if (!metin) return bildir("önce bir şey yaz");
    Y.yeniProblemler.push({ hedef: kay.dataset.kaydet, metin, tarih: new Date().toISOString().slice(0, 10) });
    kaydet();
    $("#katman").innerHTML = "";
    bildir("eklendi — Claude'a göndermeyi unutma");
    return sayfaAc(kay.dataset.kaydet);
  }

  if (t.closest("[data-eylem='disa']")) {
    try { await navigator.clipboard.writeText(disaAktar()); bildir("kopyalandı — Claude'a yapıştır"); }
    catch (err) { bildir("kopyalanamadı"); }
    return;
  }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if ($("#katman").innerHTML) return ($("#katman").innerHTML = "");
  if ($("#sayfa").innerHTML) sayfaKapat();
});

/* ------------------------------------------------------ açılış */
function ciz() { (aktif === "masa" ? cizMasa : cizHedefler)(); }

async function yukle() {
  try {
    const r = await fetch("data.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch (err) { bildir("data.json okunamadı"); }
  ciz();
}

yukleYerel();
yukle();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
