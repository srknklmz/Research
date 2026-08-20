# Uygulama — Cetvel

Beyin sisteminin mobil arayüzü. Kurulabilir bir PWA'dır; telefonda ana ekrana
eklenir ve tam ekran açılır.

## Nasıl çalışır

```
hedefler/*.md  ─┐
veri/*.md       ├─→ araclar/derle.py ─→ uygulama/data.json ─→ uygulama
arsiv/*.md      │
raporlar/*.md  ─┘
```

Markdown kartları **tek gerçek kaynaktır**. Uygulama onları doğrudan okumaz;
`araclar/derle.py` kartları `data.json` dosyasına çevirir. Her 09:00 ve 10:00
turu, işini bitirdikten sonra bu betiği çalıştırıp sonucu commit'ler.

Elle derlemek için:

```bash
python3 araclar/derle.py
```

## Yerel olarak açmak

```bash
python3 -m http.server 8000 --directory uygulama
# tarayıcıda http://localhost:8000
```

`file://` ile açma — `data.json` çekilemez.

## Yayına almak

Depo ayarlarından **GitHub Pages**'i `main` dalı / kök klasör olarak aç.
Uygulama şu adreste yayınlanır:

```
https://srknklmz.github.io/Research/uygulama/
```

Telefonda o adresi aç → tarayıcı menüsünden **Ana ekrana ekle**.

## Dosyalar

| Dosya | İşi |
|---|---|
| `index.html` | Kabuk: üst bar, beş sekme, görünüm kapları |
| `stil.css` | Cetvel tasarım dili — ölçek şeridi, mürekkep paleti, açık + koyu tema |
| `uygulama.js` | Görünümler, paneller, story raporu, ekleme akışı, yerel eşleştirme |
| `sw.js` | Kabuk önbelleği (kurulabilirlik için; veri dosyaları önbelleğe alınmaz) |
| `manifest.webmanifest` | PWA tanımı, paylaşım hedefi, kısayollar |
| `data.json` | Derlenmiş gerçek veri |
| `ornek.json` | Örnek veri — Ayarlar'dan açılır, arayüzü dolu görmek için |

## İlerleme nasıl hesaplanıyor

Hedef kartındaki cevaplanmış açık soru + test edilmiş varsayım sayısının
toplama oranı. Uydurma bir yüzde değil, kartın kendi içeriğinden türer:

```
ilerleme = (cevaplanan soru + test edilmiş varsayım) / (toplam soru + toplam varsayım)
```

## Sınırlar

Uygulamanın arka ucu yok. Bunun iki sonucu var:

1. **Ekleme kutusu yerelde durur.** Yazdığın bilgi `localStorage`'a düşer ve
   aktif hedeflerle *kaba* bir kelime eşleştirmesi yapılır — hangi hedefe
   yakın durduğunu hemen gösterir. Gerçek derinleştirme (kaynak doğrulama,
   karşı görüş, mekanizma) 09:00 turunda Claude tarafından yapılır.
   Ayarlar → **Dışa aktar** ile bekleyenleri kopyalayıp Claude'a verebilirsin.
2. **Bildirimi uygulama göndermez.** Günlük 10:00 raporu bildirimi Claude'un
   kendi zamanlayıcısından gelir; uygulama kapalıyken de düşer.
