#!/usr/bin/env python3
"""uygulama/ klasörünü tek bir HTML dosyasına gömer.

Artifact önizlemesi için: dış dosya çekilemediğinden stil, betik ve örnek veri
satır içine alınır. Gerçek uygulama uygulama/index.html'dir; bu dosya yalnızca
telefonda hızlı denemek içindir.
"""
import json, os, re

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
U = os.path.join(KOK, "uygulama")


def oku(ad):
    with open(os.path.join(U, ad), encoding="utf-8") as f:
        return f.read()


html = oku("index.html")
css = oku("stil.css")
js = oku("uygulama.js")
ornek = json.load(open(os.path.join(U, "ornek.json"), encoding="utf-8"))

fetch_blogu = '''  const dosya = Y.ornek ? "ornek.json" : "data.json";
  try {
    const r = await fetch(dosya + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch (err) {
    D = { hedefler: [], veriler: [], arsiv: [], raporlar: [], uretim: "" };
    toast(dosya + " okunamadı");
  }'''
assert fetch_blogu in js, "fetch bloğu bulunamadı — uygulama.js değişmiş olabilir"
js = js.replace(fetch_blogu,
    '  D = Y.ornek ? window.ORNEK : { hedefler: [], veriler: [], arsiv: [], raporlar: [], uretim: "" };')

# service worker kaydı önizlemede anlamsız — dosyanın sonundaki blok kesilir
isaret = 'if ("serviceWorker" in navigator)'
if isaret in js:
    js = js[:js.index(isaret)].rstrip() + "\n"
js = js.replace("  ornek: false,", "  ornek: true,")

govde = html.split("<body>", 1)[1].split("</body>")[0]
govde = govde.replace('<script src="uygulama.js"></script>', "")

cikti = (
    # charset ilk 1024 baytta olmalı: dosya tek başına servis edildiğinde
    # sunucu charset göndermezse tarayıcı bunu okur.
    '<meta charset="utf-8">\n'
    "<title>Beyin Sistemi — Cetvel</title>\n"
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    "family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&"
    "family=IBM+Plex+Mono:wght@400;500&"
    'family=IBM+Plex+Sans:wght@400;500;600&display=swap">\n'
    "<style>\n" + css + "\n"
    "/* önizleme: sayfayı telefon genişliğinde ortala */\n"
    "body{max-width:430px;margin:0 auto;border-left:1px solid var(--rule);"
    "border-right:1px solid var(--rule);min-height:100vh}\n"
    ".hdr{max-width:430px;margin:0 auto}\n"
    ".fab{right:max(16px,calc(50vw - 199px))}\n"
    ".toast,.sheet,.story{max-width:430px;margin-left:auto;margin-right:auto}\n"
    "</style>\n" + govde + "\n"
    "<script>window.ORNEK = " + json.dumps(ornek, ensure_ascii=False) + ";</script>\n"
    "<script>\n" + js + "\n</script>\n"
)

yol = os.path.join(KOK, "tasarim", "onizleme.html")
with open(yol, "w", encoding="utf-8") as f:
    f.write(cikti)
print("tasarim/onizleme.html —", len(cikti), "bayt")
