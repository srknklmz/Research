#!/usr/bin/env python3
"""hedefler/, veri/, arsiv/ ve raporlar/ altındaki markdown kartlarını
uygulama/data.json dosyasına derler.

Uygulama bu JSON'u okur; markdown dosyaları tek gerçek kaynak olarak kalır.
Her 09:00 ve 10:00 turunun sonunda çalıştırılır:

    python3 araclar/derle.py
"""
import json, os, re, sys
from datetime import datetime, timezone

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def onbilgi(metin):
    """--- ... --- bloğundaki key: value satırlarını sözlüğe çevirir."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", metin, re.S)
    if not m:
        return {}, metin
    alanlar = {}
    for satir in m.group(1).split("\n"):
        if ":" not in satir:
            continue
        k, _, v = satir.partition(":")
        v = v.split("#")[0].strip()
        if v.startswith("[") and v.endswith("]"):
            v = [p.strip() for p in v[1:-1].split(",") if p.strip()]
        alanlar[k.strip()] = v
    return alanlar, metin[m.end():]


def bolumler(govde):
    """## başlıklarına göre metni parçalar."""
    parcalar, ad, biriken = {}, None, []
    for satir in govde.split("\n"):
        b = re.match(r"^##\s+(.+?)\s*$", satir)
        if b:
            if ad:
                parcalar[ad] = "\n".join(biriken).strip()
            ad, biriken = b.group(1).strip(), []
        elif ad:
            biriken.append(satir)
    if ad:
        parcalar[ad] = "\n".join(biriken).strip()
    return parcalar


def tablo(metin):
    """Markdown tablosunu satır listesine çevirir. Ayraç ve boş satırlar atılır."""
    satirlar = []
    for s in (metin or "").split("\n"):
        s = s.strip()
        if not s.startswith("|"):
            continue
        if re.match(r"^\|[\s\-:|]+\|$", s):
            continue
        hucreler = [h.strip() for h in s.strip("|").split("|")]
        if any(h and h != "—" for h in hucreler):
            satirlar.append(hucreler)
    return satirlar[1:] if satirlar else []


def kutular(metin):
    """- [ ] / - [x] satırlarını okur."""
    cikti = []
    for s in (metin or "").split("\n"):
        m = re.match(r"^\s*-\s*\[([ xX])\]\s*(.+?)\s*$", s)
        if m:
            cikti.append({"cevaplandi": m.group(1).lower() == "x", "metin": m.group(2)})
    return cikti


def duzmetin(metin):
    """Yer tutucu <...> satırlarını ve boş satırları temizler."""
    satirlar = [s for s in (metin or "").split("\n")
                if s.strip() and not re.match(r"^\s*<.*>\s*$", s.strip())]
    return " ".join(satirlar).strip()


def oku(yol):
    with open(yol, encoding="utf-8") as f:
        return f.read()


def hedef_kartlari():
    klasor = os.path.join(KOK, "hedefler")
    cikti = []
    for ad in sorted(os.listdir(klasor)):
        if not re.match(r"^H-\d+.*\.md$", ad):
            continue
        on, govde = onbilgi(oku(os.path.join(klasor, ad)))
        b = bolumler(govde)

        varsayimlar = [
            {"n": r[0], "metin": r[1], "durum": r[2], "dayanak": r[3] if len(r) > 3 else ""}
            for r in tablo(b.get("Varsayımlar")) if len(r) >= 3
        ]
        sorular = kutular(b.get("Açık sorular"))
        veriler = [
            {"kimlik": r[0], "tur": r[1], "etki": r[2]}
            for r in tablo(b.get("Bağlı veriler")) if len(r) >= 3
        ]

        # İlerleme: cevaplanan soru + test edilmiş varsayım oranı.
        toplam = len(sorular) + len(varsayimlar)
        tamam = (sum(1 for s in sorular if s["cevaplandi"])
                 + sum(1 for v in varsayimlar if v["durum"] not in ("test edilmedi", "", "—")))
        ilerleme = round(tamam / toplam * 100) if toplam else 0

        cikti.append({
            "kimlik": on.get("kimlik", ad[:-3]),
            "baslik": on.get("baslik") or re.sub(r"^H-\S+\s*—\s*", "", (b.get("__ad__") or ad[:-3])),
            "proje": on.get("proje", ""),
            "durum": on.get("durum", "aktif"),
            "oncelik": on.get("oncelik", "orta"),
            "acildi": on.get("acildi", ""),
            "son_hareket": on.get("son_hareket", ""),
            "ilerleme": ilerleme,
            "varis": duzmetin(b.get("Varış noktası")),
            "neden": duzmetin(b.get("Neden")),
            "olcut": duzmetin(b.get("Başarı ölçütü")),
            "durum_metni": duzmetin(b.get("Şu anki durum")),
            "sonraki": duzmetin(b.get("Sonraki adım")),
            "varsayimlar": varsayimlar,
            "sorular": sorular,
            "veriler": veriler,
        })
    return cikti


def veri_kartlari(klasor_adi):
    klasor = os.path.join(KOK, klasor_adi)
    if not os.path.isdir(klasor):
        return []
    cikti = []
    for ad in sorted(os.listdir(klasor), reverse=True):
        if not re.match(r"^V-\d+.*\.md$", ad):
            continue
        on, govde = onbilgi(oku(os.path.join(klasor, ad)))
        b = bolumler(govde)

        kaynaklar = [
            {"ad": r[1], "url": r[2], "erisim": r[3] if len(r) > 3 else ""}
            for r in tablo(b.get("Kaynaklar")) if len(r) >= 3
        ]
        eslesmeler = [
            {"hedef": r[0], "tur": r[1], "etki": r[2]}
            for r in tablo(b.get("Hedef eşleşmeleri")) if len(r) >= 3
        ]
        iddialar = [
            {"metin": r[1], "tip": r[2], "dogrulama": r[3] if len(r) > 3 else ""}
            for r in tablo(b.get("İddialar")) if len(r) >= 3
        ]

        derin = {}
        for s in (b.get("Derinleşme") or "").split("\n"):
            m = re.match(r"^\s*-\s*\*\*(.+?):?\*\*\s*(.+?)\s*$", s)
            if m and not m.group(2).startswith("<"):
                derin[m.group(1).rstrip(":")] = m.group(2)

        cikti.append({
            "kimlik": on.get("kimlik", ad[:-3]),
            "baslik": on.get("baslik", ad[:-3]),
            "tarih": on.get("tarih", ""),
            "kaynak_tipi": on.get("kaynak_tipi", "kullanici"),
            "guven": on.get("guven", "orta"),
            "ozet": duzmetin(b.get("Özet")),
            "kaynaklar": kaynaklar,
            "iddialar": iddialar,
            "derinlesme": derin,
            "eslesmeler": eslesmeler,
            "eylem": duzmetin(b.get("Buradan çıkan eylem")),
        })
    return cikti


def raporlar():
    klasor = os.path.join(KOK, "raporlar")
    if not os.path.isdir(klasor):
        return []
    cikti = []
    for ad in sorted(os.listdir(klasor), reverse=True)[:30]:
        if not re.match(r"^\d{4}-\d{2}-\d{2}\.md$", ad):
            continue
        metin = oku(os.path.join(klasor, ad))
        b = bolumler(metin)
        sirali = [{"baslik": re.sub(r"^\d+\.\s*", "", k), "icerik": v.strip()}
                  for k, v in b.items() if v.strip()]
        oneriler = []
        for k, v in b.items():
            if "ilerleriz" in k.lower() or "öneri" in k.lower():
                for s in v.split("\n"):
                    m = re.match(r"^\s*\d+\.\s+(.+?)\s*$", s)
                    if m and not m.group(1).startswith("<"):
                        oneriler.append(m.group(1))
        cikti.append({"tarih": ad[:-3], "bolumler": sirali, "oneriler": oneriler})
    return cikti


def main():
    hedefler = hedef_kartlari()
    veriler = veri_kartlari("veri")
    data = {
        "uretim": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "hedefler": hedefler,
        "veriler": veriler,
        "arsiv": veri_kartlari("arsiv"),
        "raporlar": raporlar(),
    }
    hedef_yolu = os.path.join(KOK, "uygulama", "data.json")
    os.makedirs(os.path.dirname(hedef_yolu), exist_ok=True)
    with open(hedef_yolu, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"uygulama/data.json yazıldı — {len(data['hedefler'])} hedef, "
          f"{len(data['veriler'])} veri, {len(data['arsiv'])} arşiv, "
          f"{len(data['raporlar'])} rapor")


if __name__ == "__main__":
    sys.exit(main())
