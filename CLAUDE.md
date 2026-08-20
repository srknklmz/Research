# Beyin Sistemi — İşletim Kuralları

Bu depo bir **ikinci beyin**dir. Amacı: kullanıcının hedeflerini takip etmek, ona
gelen ve kendi bulduğu bilgiyi bu hedeflerle eşleştirmek ve her gün "nerede
duruyoruz, ne öğrendik, nasıl ilerleriz" sorusuna cevap vermek.

Bu dosyayı her oturumun başında oku. Otomatik (cron) oturumlar için tek
yönlendirme kaynağı budur.

---

## 1. Klasörler

| Klasör | İçerik | Kim yazar |
|---|---|---|
| `hedefler/` | Hedef kartları (`H-01.md`, `H-02.md` …) | Claude, kullanıcının anlattığı projelerden |
| `ham/` | Kullanıcının paylaştığı işlenmemiş bilgi | Kullanıcı ya da Claude (yapıştırma) |
| `veri/` | İşlenmiş + en az bir hedefle eşleşmiş bilgi (`V-0001.md` …) | Claude |
| `arsiv/` | İşlendi ama hiçbir hedefle eşleşmedi | Claude |
| `raporlar/` | Günlük raporlar (`2026-08-21.md`) | Claude |
| `sistem/` | Şablonlar, protokoller, kaynak defteri | Claude |
| `uygulama/` | Mobil arayüz (PWA) — markdown'dan derlenen veriyi okur | Claude |
| `araclar/` | Derleme betikleri | Claude |
| `tasarim/` | Arayüz tercihleri ve tasarım yönleri | Claude |

Kimlik şeması: hedef `H-01`, veri `V-0001`, ham girdi `ham/YYYY-AA-GG-konu.md`.
Numaralar asla geri kullanılmaz; silinen kayıt `durum: iptal` ile durur.

---

## 2. Dört çalışma modu

### Mod A — Hedef oluşturma
Kullanıcı kafasındaki bir projeyi anlattığında:

1. Anlattığını **hedef noktalarına** böl. Bir proje genelde 2–5 hedef üretir.
   Hedef = ölçülebilir bir varış noktası, yapılacaklar listesi değil.
2. Her hedef için `sistem/sablonlar/hedef.md` şablonuyla bir kart aç.
3. Kartın en kritik iki alanı:
   - **Varsayımlar** — bu hedefin doğru olması için doğru olması gereken şeyler.
   - **Açık sorular** — cevabını bilmediğimiz, cevabı hedefi değiştirecek sorular.
   Bunlar boş kalırsa sistem çalışmaz: 09:00 araştırması bu iki alandan beslenir.
4. `hedefler/README.md` indeksini güncelle.
5. Kullanıcıya hedefleri özetle ve "eksik/yanlış olan var mı" diye sor.

### Mod B — Kullanıcı yeni bilgi paylaştığında
Kullanıcı bir şey öğrendiğini söylediğinde (link, not, fikir, sohbet çıktısı):

1. Ham hâlini `ham/` altına düşür (kaynağıyla birlikte).
2. **Derinleştir** — bu adım atlanamaz. Ham bilgiyi olduğu gibi kaydetmek işe
   yaramaz. Yap:
   - İddiaları ayrıştır: hangisi olgu, hangisi yorum, hangisi tahmin?
   - Her önemli iddiayı bağımsız kaynakla doğrula (WebSearch/WebFetch).
   - Bir seviye derine in: bunun arkasındaki mekanizma ne? Kim yapıyor?
     Maliyeti ne? Karşı görüş ne diyor? Ne zaman yanlış olur?
   - Çelişki bulursan bunu **sakla ve raporla**, sessizce bir tarafı seçme.
3. **Eşleştir** (bkz. bölüm 3).
4. En az bir hedefle eşleşiyorsa `veri/` altına `V-XXXX.md` olarak yaz,
   eşleşmiyorsa `arsiv/` altına at (ileride bir hedefle eşleşebilir).
5. Eşleşen hedef kartlarını güncelle: durum, açık sorular, varsayımlar.
6. `veri/indeks.md` ve `sistem/kaynak-defteri.md` satırlarını ekle.

### Mod C — Her gün 09:00, otonom araştırma
Kendi başına internetten veri toplama turu. Rastgele arama yapma — **hedef
kartlarındaki açık sorulardan ve varsayımlardan** yürü:

1. Tüm hedefleri oku, `durum: aktif` olanları al.
2. Her aktif hedef için en az bir açık soru veya doğrulanmamış varsayım seç.
   Öncelik: (a) cevabı hedefi en çok değiştirecek soru, (b) en uzun süredir
   dokunulmamış hedef.
3. Ara. Her soru için birden fazla açıdan bak: birincil kaynak, sayısal veri,
   karşı görüş, bu işi zaten yapan biri.
4. `sistem/kaynak-defteri.md`'yi kontrol et — daha önce işlenmiş kaynağı
   tekrar veri yapma. Aynı kaynağın *yeni* bir yönü varsa mevcut veri kartını
   güncelle, yeni kart açma.
5. Bulunanları Mod B'nin 2–6 adımlarıyla işle. Kaynağı `otonom` olarak işaretle.
6. Yeni veri yoksa bunu dürüstçe yaz: "bugün X, Y sorularında yeni bir şey
   çıkmadı". Rapor doldurmak için zayıf bulguyu veri diye sunma.
7. Commit'le ve push'la — 10:00 oturumu bu çıktıyı okuyacak.

### Mod D — Her gün 10:00, günlük rapor
`sistem/sablonlar/rapor.md` şablonuyla `raporlar/YYYY-AA-GG.md` yaz. Bölümler:

1. **Hedeflerde durum** — her aktif hedef: tek satır durum + son 24 saatte ne
   değişti. Değişmediyse "değişiklik yok" yaz, laf kalabalığı yapma.
2. **Verilerimiz** — toplam veri sayısı ve hedef başına dağılım.
3. **Dün eklenenler** — yeni veri kartları, her biri tek cümlede *ne değiştirdiği*
   ile birlikte. "Şu makale bulundu" değil, "şu makale H-02'nin fiyat
   varsayımını çürütüyor".
4. **Senin bulduklerin** — kullanıcının paylaştıklarından çıkan sonuçlar.
5. **Öneriler — nasıl ilerleriz** — en fazla 3 madde, her biri somut bir sonraki
   adım ve neden şimdi olduğu. Genel tavsiye yasak ("araştırmaya devam et" gibi).
6. **Dikkat** — çelişkiler, çürüyen varsayımlar, tıkanan hedefler.

Raporu commit'le, push'la ve kullanıcıya ilet.

---

## 3. Eşleştirme kuralları

Bir bilgi bir hedefle eşleşir *ancak ve ancak* şunlardan birini yapıyorsa:

| Tür | Anlamı |
|---|---|
| `doğrular` | Hedefin bir varsayımını destekliyor |
| `çürütür` | Hedefin bir varsayımını yıkıyor — **en değerli tür** |
| `yöntem` | Hedefe nasıl ulaşılacağına dair somut yol/araç veriyor |
| `açık-soru` | Hedefin açık sorularından birini cevaplıyor |
| `risk` | Hedefi tehdit eden bir şeyi gösteriyor |
| `fırsat` | Hedefi hızlandıracak bir açıklık gösteriyor |

Bunlardan hiçbiri değilse eşleşme **yoktur**. "İlgili görünüyor" eşleşme değildir.
Zorlama eşleştirme sistemi çöpe çevirir; `arsiv/`'e atmaktan çekinme.

Bir veri birden çok hedefle eşleşebilir. Her eşleşme için ayrı satır yaz:
hedef kimliği, tür, ve **tek cümlede ne değiştirdiği**.

---

## 3.5. Uygulama verisi

Markdown kartları tek gerçek kaynaktır. Mobil uygulama onları doğrudan okumaz —
`araclar/derle.py` kartları `uygulama/data.json` dosyasına çevirir.

**Kart ekledikten ya da değiştirdikten sonra her seferinde çalıştır:**

```bash
python3 araclar/derle.py
```

Bu adım atlanırsa telefonda eski veri görünür. Arayüz tercihleri
`tasarim/tercihler.md` dosyasında bağlayıcıdır; arayüzde bir şey değiştirirken
oraya bak.

---

## 4. Kalite kuralları

- **Kaynaksız iddia veri değildir.** Her veri kartında URL + erişim tarihi olur.
- Doğrulanamayan iddiayı sil değil, `güven: düşük` ile işaretle ve nedenini yaz.
- Kullanıcının paylaştığı bilgi de doğrulanır. Yanlışsa nazikçe ama açıkça söyle.
- Kendi bulduğun ile kullanıcının bulduğunu her zaman ayır (`kaynak-tipi` alanı).
- Tarih yaz, "geçenlerde" yazma. Sayı varsa sayıyı yaz, "çok/az" yazma.
- Bir hedef 14 gün boyunca hiç veri almadıysa raporun "Dikkat" bölümünde uyar:
  ya hedef yanlış tanımlı ya da artık öncelik değil.
