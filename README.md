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
| `DATABASE_URL` | evet | Çalışma anı bağlantısı. Supabase'de havuzlanmış adres (port 6543) + `?pgbouncer=true` |
| `DIRECT_URL` | evet | Şema işlemleri için doğrudan bağlantı (port 5432) |
| `OTURUM_ANAHTARI` | evet | Oturum çerezini imzalar. En az 32 karakter: `openssl rand -base64 48` |
| `DEPO` | hayır | Belge deposu: `yerel` (varsayılan) ya da `supabase` |
| `YUKLEME_DIZINI` | hayır | `DEPO=yerel` iken dosyaların dizini (varsayılan `./yuklemeler`) |
| `SUPABASE_URL` · `SUPABASE_SERVIS_ANAHTARI` · `SUPABASE_KOVA` | `DEPO=supabase` ise | Supabase projesi, `service_role` anahtarı ve kova adı |

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

İki yol var:

1. **Elle** — İrsaliye formu çok kalemli; her satırın miktarı, birimi ve
   birim fiyatı ayrı girilir, tutar kendiliğinden hesaplanır. İrsaliyenin
   ya da faturanın **PDF'i** kayda eklenir ve her ekrandan açılabilir.
2. **Toplu içe aktarma** — CSV ya da XLSX. Notion dışa aktarımı doğrudan
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

## Belge depolama

İrsaliye ve faturaların taranmış hali `Belge` kaydına bağlanır. **Yalnızca
PDF kabul edilir** (en çok 20 MB): dosyanın uzantısına ya da tarayıcının
bildirdiği türe güvenilmez, ilk baytları okunup gerçekten PDF olduğu
doğrulanır. Aynı dosya iki kez yüklenirse (sha256 aynıysa) tekrar yazılmaz.

İki sürücü var, `DEPO` ile seçilir:

- **`yerel`** — dosyalar `YUKLEME_DIZINI` altına yazılır. Kalıcı diski olan
  bir sunucuda (VPS, kendi makineniz) çalışır. **Vercel gibi sunucusuz
  ortamlarda kullanmayın:** disk her dağıtımda sıfırlanır.
- **`supabase`** — dosyalar Supabase Storage'a yazılır. Kova **private**
  olmalı; `service_role` anahtarı yalnızca sunucuda kalır.
  - **Yükleme** tarayıcıdan doğrudan depoya yapılır: sunucu imzalı bir
    yükleme adresi açar (2 saat geçerli), dosya oraya gider, forma yalnızca
    yol bilgisi girer. Böylece **Vercel'in 4,5 MB istek gövdesi sınırı**
    devreye girmez — o sınır altyapı seviyesinde olup ayarla aşılamaz.
  - **Görüntüleme** sırasında uygulama önce yetkiyi kontrol eder, sonra kısa
    ömürlü (120 sn) imzalı bağlantıya yönlendirir.
  - Dosya sunucuya bir kez indirilip PDF olduğu doğrulanır ve sha256'sı
    hesaplanır; aynı içerik zaten varsa yeni nesne silinip mevcut kayıt
    kullanılır.

> **Depo değiştirirken:** `DEPO` değerini sonradan değiştirirseniz eski
> `Belge` kayıtları eski depodaki dosyaları gösterir. Geçişte mevcut
> dosyaları yeni depoya aynı yollarla (`YYYY/AA/<uuid>.pdf`) kopyalayın.

Başka bir sağlayıcı (Cloudflare R2, S3, MinIO) gerekirse `lib/depo.ts`
içine aynı arayüzü uygulayan bir sürücü eklemek yeterli; uygulamanın geri
kalanı depolamayı bilmez.

## Vercel + Supabase'e kurulum

### 1. Supabase projesi

Yeni proje açın — **bölge olarak Frankfurt (eu-central-1)** seçin; Vercel
tarafını da Frankfurt'a alacağız, veritabanı gidiş-dönüşü kısalır.

**Storage:** Storage → New bucket → ad `belgeler`, *Public bucket* **kapalı**.

**Bağlantı adresleri** (Project Settings → Database → Connection string):

- *Transaction pooler* (port 6543) → `DATABASE_URL`, sonuna `?pgbouncer=true`
- *Direct connection* (port 5432) → `DIRECT_URL`

**Anahtar** (Project Settings → API): `service_role` → `SUPABASE_SERVIS_ANAHTARI`.
Bu anahtar tüm yetkilere sahiptir; yalnızca sunucu ortam değişkeni olarak
kullanılır, istemciye verilmez.

### 2. Şemayı ve tohum verisini yükleyin

**En kolayı — tarayıcıdan, hiçbir kurulum gerekmeden:** depodaki
[`prisma/kurulum.sql`](prisma/kurulum.sql) dosyasının tamamını kopyalayın,
Supabase panelinde **SQL Editor → New query** içine yapıştırın ve **Run**
deyin. Tabloları oluşturur, 192 firmayı, açılır liste değerlerini ve dört
kullanıcıyı ekler. Boş veritabanında bir kez çalıştırın.

Şema değişirse dosyayı `npm run db:sql` ile yeniden üretin.

**Alternatif — kendi makinenizden**, `.env` dosyanızda Supabase adresleri
yazılıyken:

```bash
npx prisma db push   # tabloları oluşturur
npm run db:seed      # 192 firma, listeler, 4 kullanıcı
```

### 3. Vercel projesi

Depoyu Vercel'e bağlayın (Add New → Project → GitHub deposunu seçin).
Framework kendiliğinden Next.js olarak algılanır; build komutu
`prisma generate && next build` zaten `package.json` içinde. Bölge
`vercel.json` ile `fra1` sabitlenmiştir.

**Environment Variables** olarak şunları girin:

| Değişken | Değer |
|---|---|
| `DATABASE_URL` | havuzlanmış adres + `?pgbouncer=true` |
| `DIRECT_URL` | doğrudan adres (5432) |
| `OTURUM_ANAHTARI` | `openssl rand -base64 48` çıktısı |
| `DEPO` | `supabase` |
| `SUPABASE_URL` | `https://<proje>.supabase.co` |
| `SUPABASE_SERVIS_ANAHTARI` | `service_role` anahtarı |
| `SUPABASE_KOVA` | `belgeler` |

Deploy edin. Açılan adrese girip **ilk iş olarak dört varsayılan kullanıcının
parolasını değiştirin** ve Ayarlar'dan şirket/şantiye adını girin.

### Sonraki dağıtımlar

`main` dalına her push kendiliğinden dağıtılır. Şema değiştiyse dağıtımdan
önce kendi makinenizden `npx prisma db push` çalıştırın — Vercel derlemesi
şemayı veritabanına uygulamaz, yalnızca istemciyi üretir.

## Dizin yapısı

| Dizin | İçerik |
|---|---|
| `app/(uygulama)/` | Oturum gerektiren ekranlar (pano, irsaliye, fatura, eşleştirme, imza, merkez, aktarma, ayarlar) |
| `app/cikti/` | Yazdırılabilir föyler |
| `app/giris/`, `app/belge/` | Giriş ve belge sunumu |
| `components/` | Ortak arayüz parçaları |
| `lib/` | Veritabanı, oturum, yetki, akış, eşleştirme önerisi, içe aktarma, depolama, biçimlendirme |
| `prisma/` | Şema, tohum verisi (192 firma, 1206 malzeme, listeler) ve `kurulum.sql` |

## Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi
npm start          # üretim sunucusu
npm run db:push    # şemayı veritabanına uygula
npm run db:seed    # tohum verisi
npm run db:sql     # tek dosyalık kurulum SQL'ini yeniden üret
npm run db:studio  # veritabanı arayüzü
```
