# İmalat Takip

Şantiyelerdeki bitmemiş imalatların hedef bitiş tarihlerini takip eder.

- **Şantiye** kendi imalatlarını girer, gecikme olursa tarihi **nedeniyle** günceller, biteni "Bitti" diye işaretler.
- **Merkez** üç şantiyeyi tek ekranda görür: gecikenler kırmızı, bu hafta bitmesi gerekenler sarı,
  her imalatın ilk hedefi ve kaç gün kaydığı, son değişiklikler listesi.
- İlk hedef hiç kaybolmaz; her tarih değişikliği eski/yeni tarih, neden, yapan kişi ve zamanla saklanır.
  Biten imalat için "ilk hedefte / revize hedefte / geç" sonucu görünür.

## Telefonda

Uygulama telefon için tasarlandı: altta İmalatlar / Değişiklikler / Hesap menüsü, sağ altta
"Yeni imalat" düğmesi, tarih için "+1 hafta", "+2 hafta" gibi hızlı seçimler ve hazır gecikme
nedenleri. Tarayıcıda açıp **Ana ekrana ekle** denince kendi simgesiyle, tam ekran açılır
(iPhone: Safari → Paylaş → Ana Ekrana Ekle; Android: Chrome → ⋮ → Uygulamayı yükle).

## Giriş

Şantiye başına bir ortak şifre ve merkez için bir şifre vardır. Kaydı kimin yaptığı, formlardaki
"Adınız" alanından gelir (cihazda hatırlanır). Merkez, **Ayarlar**'dan şantiye adlarını ve
şifreleri değiştirebilir; şifre değişince o hesapla açık olan cihazlardan çıkış yapılır.

## Yapı

| Parça | Nerede |
|---|---|
| Arayüz | Vite + React + TypeScript, `src/` — Vercel'de statik site; telefonda ana ekrana eklenebilir (PWA) |
| Veri | Supabase **santiye-personel** projesi, `imalat_` önekli tablolar — şema ve fonksiyonlar `supabase/imalat.sql` |

Tarayıcı tablolara doğrudan erişemez; her okuma/yazma `imalat_*` fonksiyonlarından geçer ve her
fonksiyon oturumu ve şantiye yetkisini kontrol eder. Şifreler bcrypt özeti olarak saklanır; 15
dakikada 8 hatalı denemeden sonra hesap bekletilir.

Ortam değişkeni gerekmez: Supabase adresi ve publishable anahtar herkese açık bilgilerdir ve
`src/api.ts` içindedir. Başka bir projeye bağlamak için `VITE_SUPABASE_URL` ve `VITE_SUPABASE_KEY`
verilebilir.

## Geliştirme

Gerekenler: Node.js 20+ ve git.

```bash
git clone https://github.com/srknklmz/Research.git
cd Research
git checkout claude/kind-tesla-08stg6
npm install
npm run dev     # http://localhost:5173 — kaydedince ekran anında yenilenir
npm test        # tarih hesapları
npm run build
```

**Claude Code masaüstü uygulamasında:** klasörü açın; `.claude/launch.json` sayesinde
uygulama önizleme panelinde kendiliğinden çalışır, Claude kodu değiştirdikçe ekran yenilenir.

Geliştirme sunucusu da **canlı veritabanına** bağlanır: denemede eklenen imalatlar şantiyelere de
görünür. Deneme kayıtlarını işiniz bitince silin.

Şema değişikliği: `supabase/imalat.sql` dosyasını güncelleyip Supabase SQL Editor'de çalıştırın
(dosya tekrar çalıştırılabilir; mevcut veriye dokunmaz).
