# İrsaliye – Fatura Sistemi

Şantiyeye gelen irsaliyelerin faturalarla eşleştirildiği, idari müdür
tarafından kontrol edilip imzalandığı, merkezde onaylanıp müşavire
iletildiği evrak akışı.

## Akış

```
  Şantiye                    İdari müdür              Merkez
─────────────              ─────────────           ─────────────
irsaliye girilir
fatura girilir
      │
      ├─ eşleştirme ──────▶ kontrol + imza ──────▶ onay
      │                          │                    │
      │                          ▼                    ▼
      └◀──── geri gönderim ──────┘              çıktı + müşavire
                                                    gönderim
```

Her fatura tek bir durumda olur:

| Durum | Anlamı | Sıradaki adım |
|---|---|---|
| **Yeni** | Girildi, irsaliyesi bağlanmadı | Şantiye eşleştirir |
| **Eşleşti** | İrsaliye bağlandı ya da irsaliyesiz işaretlendi | İdari müdür imzalar |
| **İmzalandı** | İdari müdür onayladı | Merkez onaylar |
| **Reddedildi** | Geri gönderildi | Şantiye düzeltir |
| **Merkez onaylı** | Gönderime hazır | Müşavire gönderilir |
| **Müşavire gönderildi** | Kapandı | — |

## Roller

| Rol | Yetkisi |
|---|---|
| **Şantiye** | İrsaliye/fatura girer, eşleştirir, içe aktarır |
| **İdari müdür** | Eşleşmeyi kontrol eder, imzalar ya da geri gönderir |
| **Merkez** | Onaylar, çıktı alır, müşavire gönderim paketi oluşturur |
| **Yönetici** | Hepsi + kullanıcı yönetimi ve işlem günlüğü |

## İmza ve denetim izi

İmza, hukuki anlamda nitelikli elektronik imza **değildir**; uygulama içi
onaydır. Ama kayıt şunları tutar ve hiçbir zaman silinmez:

- imzalayan kişi, rolü, e-postası
- tarih–saat, IP adresi, tarayıcı bilgisi
- imza anındaki fatura + irsaliye görüntüsünün tamamı (`anlik`)
- bu görüntünün **sha256 parmak izi** — çıktıya da basılır

Yani bir belge imzalandıktan sonra değişirse, parmak izi tutmaz. İmzalanmış
fatura ve ona bağlı irsaliyeler ayrıca düzenlemeye kapanır; düzeltme
gerekiyorsa idari müdür imzayı geri alır (merkez onayladıktan sonra bu da
mümkün değildir).

İleride nitelikli e-imzaya geçilmek istenirse `Onay` tablosuna imza değeri
alanı eklemek yeterlidir; akışın geri kalanı değişmez.

## Kurulum

Gerekenler: Node.js 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env      # değerleri doldurun
npx prisma db push        # tabloları oluşturur
npm run db:seed           # firmalar, listeler ve 4 kullanıcı
npm run dev
```

### Ortam değişkenleri

| Değişken | Zorunlu | Ne işe yarar |
|---|---|---|
| `DATABASE_URL` | evet | PostgreSQL bağlantısı |
| `OTURUM_ANAHTARI` | evet | Oturum çerezini imzalar. En az 32 karakter: `openssl rand -base64 48` |
| `YUKLEME_DIZINI` | hayır | Yüklenen PDF/fotoğrafların dizini (varsayılan `./yuklemeler`) |
| `ANTHROPIC_API_KEY` | hayır | Belgeden otomatik alan doldurma. Boşsa uygulama çalışır, yalnızca bu özellik kapalı olur. |

### İlk giriş

Tohum verisi dört kullanıcı açar; parola `degistir123`
(`TOHUM_PAROLA` ile değiştirilebilir).

| E-posta | Rol |
|---|---|
| `yonetici@sirket.com` | Yönetici |
| `santiye@sirket.com` | Şantiye |
| `idari@sirket.com` | İdari müdür |
| `merkez@sirket.com` | Merkez |

**İlk iş:** Ayarlar ekranından bu parolaları değiştirin ve şirket/şantiye
adını girin — şirket adı çıktıların başlığında görünür.

## Veri girişi

Üç yol var:

1. **Elle** — İrsaliye formu çok kalemli; her satırın miktarı, birimi ve
   birim fiyatı ayrı girilir, tutar kendiliğinden hesaplanır.
2. **Belgeden okutarak** — İrsaliye ya da faturanın PDF'i / fotoğrafı
   yüklenir, alanlar Claude ile okunup forma yazılır. Kaydetmeden önce
   kontrol edilir. `ANTHROPIC_API_KEY` gerekir.
3. **Toplu içe aktarma** — CSV ya da XLSX. Notion dışa aktarımı doğrudan
   çalışır: aynı firma + irsaliye no + tarih taşıyan satırlar tek
   irsaliyenin kalemleri olarak birleştirilir. Aktarma önce önizlenir,
   sorunlu satırlar tek tek listelenir. Aynı kayıt ikinci kez
   aktarılmaz — dosya tekrar yüklenebilir.

Beklenen sütunlar için içe aktarma ekranının altındaki tabloya bakın.
Tarihler `GG.AA.YYYY`, `GG/AA/YYYY` veya `YYYY-AA-GG`; sayılarda Türkçe
biçim (`1.234,56`) desteklenir.

## Eşleştirme

Eşleştirme ekranı, faturanın firmasına ait ve tarihine yakın irsaliyeleri
olabilirliğe göre sıralar. Puanlama üç sinyale bakar:

- fatura açıklamasında irsaliye numarasının geçmesi (en güçlü sinyal)
- tarih yakınlığı
- irsaliye kalem toplamının fatura tutarıyla örtüşmesi (KDV'li ve KDV'siz
  ihtimallerin ikisi de denenir)

Karar her zaman kullanıcınındır; puan yalnızca sıralama içindir. Seçim
yapıldıkça toplam ve faturayla fark canlı gösterilir — %20 KDV eklenmiş
hali de ayrıca hesaplanır, çünkü irsaliyeler genelde KDV hariçtir.

Yemek, konaklama, kiralama gibi malzeme teslimi olmayan faturalar
**irsaliyesiz** işaretlenir ve eşleştirme adımını atlayarak doğrudan
imzaya düşer.

## Çıktı

- `/cikti/fatura/<id>` — tek fatura föyü: fatura bilgileri, kapsadığı
  irsaliyelerin kalem dökümü, imza/onay blokları ve parmak izleri.
- `/cikti/gonderim/<id>` — müşavir teslim listesi (kapak) + paketteki her
  faturanın föyü.

Her ikisi de A4 için sayfalanır; tarayıcıdan yazdırılır ya da PDF'e
kaydedilir.

## Dizin yapısı

| Dizin | İçerik |
|---|---|
| `app/(uygulama)/` | Oturum gerektiren ekranlar (pano, irsaliye, fatura, eşleştirme, imza, merkez, aktarma, ayarlar) |
| `app/cikti/` | Yazdırılabilir föyler |
| `app/giris/`, `app/belge/`, `app/api/oku/` | Giriş, belge sunumu, belge okuma ucu |
| `components/` | Ortak arayüz parçaları |
| `lib/` | Veritabanı, oturum, yetki, akış, eşleştirme önerisi, içe aktarma, biçimlendirme |
| `prisma/` | Şema ve tohum verisi (192 firma, 1206 malzeme, birim/kategori listeleri) |

## Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi
npm start          # üretim sunucusu
npm run db:push    # şemayı veritabanına uygula
npm run db:seed    # tohum verisi
npm run db:studio  # veritabanı arayüzü
```
