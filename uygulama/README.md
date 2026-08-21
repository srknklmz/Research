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

## Yayına almak — Vercel

Depo kökündeki `vercel.json` gerekli her şeyi tanımlar; Vercel'de tek yapılacak
depoyu içe aktarmaktır.

1. [vercel.com/new](https://vercel.com/new) → GitHub ile giriş yap.
2. `srknklmz/Research` deposunu **Import** et.
3. Hiçbir ayarı değiştirme — Framework "Other", build komutu boş kalsın.
   `vercel.json` çıktı klasörünü `uygulama` olarak zaten belirtiyor.
4. **Deploy**.

Uygulama `https://<proje-adı>.vercel.app/` adresinde açılır. `uygulama/` alt
yolu görünmez; klasörün içi doğrudan kök olarak sunulur.

**Vercel ayarlardan çıktı klasörünü almazsa** (nadiren olur): proje
ayarlarında *Build & Development Settings → Root Directory* alanını
`uygulama` yap ve yeniden dağıt.

### Otomatik güncelleme

Vercel `main` dalına her push'ta yeniden dağıtır. Günlük 09:00 ve 10:00
turları işini bitirince `araclar/derle.py` çalıştırıp `uygulama/data.json`
dosyasını commit'ler — yani **yeni veri ve rapor telefona kendiliğinden
düşer**, elle bir şey yapman gerekmez.

`vercel.json` içindeki header kuralları bunun için kritik: `data.json` ve
`ornek.json` için `no-store` verilir, aksi hâlde CDN dünkü veriyi tutar.

### Telefona kurmak

Yayın adresini telefonda aç → tarayıcı menüsünden **Ana ekrana ekle**.
Tam ekran açılır, adres çubuğu görünmez.

### Alternatif: GitHub Pages

Vercel yerine Pages de olur: depo ayarlarından `main` / kök seç. Adres
`https://srknklmz.github.io/Research/uygulama/` olur — alt yol göründüğü için
Vercel daha temiz.

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

1. **Uygulama depoya yazamaz.** Ekleme kutusuna yazdığın da, hedef taslakları
   da tarayıcının `localStorage` alanında durur — Claude oraya erişemez.
   Depoya ulaşmasının tek yolu **Ayarlar → Dışa aktar** ile kopyalayıp
   Claude'a vermendir.

   Uygulama yine de işe yarar: yazdığın bilgiyi aktif hedeflerle *kaba* bir
   kelime eşleştirmesinden geçirir ve hangi hedefe yakın durduğunu anında
   gösterir. Gerçek derinleştirme (kaynak doğrulama, karşı görüş, mekanizma)
   Claude tarafından yapılır.

   **Hedef oluşturma:** Hedefler sekmesi → *+ Hedef taslağı yaz*. Taslak
   kartın şablonundaki kritik alanları toplar (varış noktası, başarı ölçütü,
   açık sorular), kopyalarsın, Claude `hedefler/H-XX.md` kartını açar.
2. **Bildirimi uygulama göndermez.** Günlük 10:00 raporu bildirimi Claude'un
   kendi zamanlayıcısından gelir; uygulama kapalıyken de düşer.
