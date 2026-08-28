# Çalışma notları

Şantiye irsaliye–fatura akışı için Next.js uygulaması. İşleyiş ve kurulum
için `README.md`.

## Yığın

Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL · Tailwind v4.
Mutasyonlar **server action** ile yapılır; ayrı bir REST katmanı yoktur.
Tek istisna belge sunma ucu (`app/belge/[id]`), çünkü dosya akışı ve
yönlendirme gerekiyor.

## Dil

Kod, değişken adları, tablo/sütun adları ve arayüz Türkçedir. Yeni kod da
Türkçe yazılır — `fatura`, `irsaliye`, `eslesme`, `onay`, `gonderim`.
İngilizce/Türkçe karışımı yapılmaz.

## Kurallar

- **Yetki her eylemde kontrol edilir.** Her server action `gerekliKullanici(...)`
  ile başlar; sayfa seviyesindeki kontrole güvenilmez.
- **İmzalı kayıt değişmez.** `IMZALANDI`, `MERKEZ_ONAYLI`, `GONDERILDI`
  durumundaki fatura ve ona bağlı irsaliyeler düzenlenemez/silinemez. Yeni
  bir yazma yolu eklenirse bu kontrol de eklenmelidir.
- **Onay kaydı silinmez.** `Onay` tablosuna yalnızca eklenir. Her kayıt o
  anki görüntüyü (`anlik`) ve sha256 özetini (`ozet`) taşır; `lib/akis.ts`
  içindeki `anlikGoruntu` üretir.
- **Durum geçişleri tek yerden.** `faturaDurumTazele` yalnızca `YENI`,
  `ESLESTI`, `REDDEDILDI` durumlarına dokunur; imzalı akışı imza/merkez
  eylemleri yürütür.
- **Para `Decimal`.** Prisma `Decimal` alanları `Number()`'a çevrilmeden
  toplanmaz; biçimlendirme `lib/bicim.ts` üzerinden yapılır.
- **Tarihler gün bazlıdır** (`@db.Date`), UTC gece yarısı olarak yazılır:
  `new Date(\`${g.tarih}T00:00:00Z\`)`. Yerel saat kaymasına dikkat.
- **Açılır listeler `Secenek` tablosunda.** Serbest girilen yeni değer
  `secenekEkle` ile listeye eklenir; enum kullanılmaz.
- **Dosya sistemine doğrudan dokunulmaz.** Belge okuma/yazma yalnızca
  `lib/depo.ts` üzerinden yapılır; `DEPO` değişkeni yerel diski mi Supabase
  Storage'ı mı kullanacağını belirler.
- **Belge yalnızca PDF.** `lib/belge.ts` içinde ilk baytlar (`%PDF-`)
  kontrol edilir; MIME türü ve uzantı güvenilir sayılmaz.

## Stil

Tailwind v4. Renkler `app/globals.css` içindeki `@theme` altında token
olarak tanımlı (`bg-vurgu`, `text-soluk`, `border-cizgi`…). `@apply` ile
özel sınıf uygulanamaz — yalnızca token'lardan üretilen yardımcı sınıflar
kullanılır. Ortak sınıflar: `kart`, `dugme-birincil`, `alan`, `tablo`,
`rozet`.

Yazdırma: `.yazdirma-gizle` ekranda görünür, çıktıda gizlenir;
`.kagit-sayfa` A4 sayfa sonu verir.

## Kullanıcıya sunum

- **SQL dosyalarının içeriği sohbette metin olarak verilir.** Kullanıcı `.sql`
  dosyalarını açamıyor; kopyala-yapıştır yapabilmesi için içeriği kod bloğu
  hâlinde yaz, yalnızca dosyayı göndermekle yetinme. Bu, `prisma/kurulum.sql`
  ve sonradan üretilecek bütün SQL çıktıları için geçerlidir.
- Uzun SQL'i mantıklı parçalara böl (şema / tohum) ki tek tek kopyalanabilsin.

## Doğrulama

```bash
npx tsc --noEmit          # tip denetimi
npx next build --no-lint  # derleme
```
