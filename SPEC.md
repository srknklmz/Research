# Sinaps — Ürün Tanımı

İnternetten bulunan verileri alan, inceleyen, detaylandıran, önceki verilerle bağlayan
ve yeni fikirler üreten kişisel "ikinci beyin" uygulaması. Obsidian benzeri, 3D sinaps grafı ile.

## Temel kararlar

| Konu | Karar |
|---|---|
| Platform | Web uygulaması (PWA, ana ekrana eklenebilir) |
| Kullanıcı | Sadece ben (tek kullanıcı) |
| Giriş | Google ile giriş, yalnızca sahibin hesabına izin |
| Dil | Arayüz ve analizler Türkçe, kaynak metin orijinal dilinde saklanır |
| Tema | Açık / koyu seçilebilir |
| Ana ekran | Veri atma kutusu |
| Hosting | Vercel |
| Veritabanı | Supabase (Postgres + pgvector + Storage + Auth) |
| AI | Claude (ana analiz), OpenAI / Gemini (embedding, YouTube, yedek) |
| Bütçe | Ayda ~10–20 $ |
| Ölçek | Günde birkaç veri (~1.000 not/yıl) |
| Gizlilik | Normal (bulut + AI API kullanımı uygun) |
| Mevcut veri | İçe aktarma yok, sıfırdan |

## Veri girişi

**Veri türleri:** web linki, düz metin/alıntı, PDF, görsel/ekran görüntüsü, YouTube, tweet/sosyal medya, ses/podcast, akademik makale.

**Giriş yolları:**
- Uygulamadaki kutuya yapıştırma / sürükle-bırak
- Tarayıcı eklentisi: tüm sayfayı gönder, seçili metni gönder, not ekleyerek gönder
- iPhone: iOS Kısayolu ("Sinaps'a gönder") paylaş menüsünde + uygulamaya yapıştırma
- E-posta ile gönderme (özel adres)

**Tekrar eden veri:** Uyar, kullanıcı karar versin (birleştir / ayrı not / vazgeç).

## İşleme hattı (veri atılınca, anında otomatik)

1. **İçerik çıkarma**
   - Link → tam metin kopyası saklanır (sayfa silinse de kalır)
   - Görsel → OCR + görsel yorumlama (grafik/tablo/diyagram) + kaynağını bulma
   - YouTube / podcast → yalnızca özet (transkript saklanmaz)
   - PDF / makale → yöntem ve bulgular, tablo/grafik çıkarımı, sade dille anlatım
2. **Analiz:** özet, ana fikirler, otomatik etiket/kategori, kaynak güvenilirliği değerlendirmesi
3. **Detaylandırma:** hafif otomatik web araştırması (2–3 kaynak), kavram açıklamaları,
   karşıt görüşler, soru-cevap. "Daha derin incele" butonu ile derin araştırma.
4. **Varlık çıkarma:** kavram notları ve kişi notları otomatik oluşur/güncellenir
5. **Bağlantı kurma (otomatik):**
   - Her bağın nedeni yazılır, türü belirtilir (destekler / çelişir / örneğidir / devamıdır…)
   - Yakalanacak ilişkiler: aynı konu/kavram, çelişkiler, kişi/kurum/yer, zaman çizgisi
   - Yeni bilgi eski kavram/kişi notlarını etkiliyorsa eski not güncellenir
6. **Fikir üretme:** sentez, iş/proje fikri, araştırılacak sorular, hipotez/tahmin

## Not yapısı

Her not şu bölümlerden oluşur:
- Özet + ana fikirler
- Bağlantılı notlar (neden + tür)
- Eleştiri / güvenilirlik
- Aksiyon / fikirler

Notlar Markdown editörle düzenlenebilir (`[[bağlantı]]` sözdizimi), kullanıcı kendi notlarını
da yazabilir ve AI çıktılarını düzeltebilir.

**Organizasyon:** otomatik etiketler + klasörler/koleksiyonlar + projeler.

## Fikirler

- Ayrı "Fikirler" bölümü + her notun altında ilgili fikirler
- Günlük/haftalık bülten
- Fikir üzerine AI ile sohbet ederek geliştirme
- Puanlama (yenilik, uygulanabilirlik, potansiyel)
- Beğen / reddet → geri bildirimle sonraki fikirler iyileşir
- Fikir → adım adım eylem planı
- Pazar/rakip kontrolü (fikir daha önce yapılmış mı, web'de bakar)

## Kişiselleştirme

- Kullanıcı profili: ilgi alanları ve hedefler (fikirler buna göre üretilir)
- Aktif projeler: yeni veri hangi projeye yarar, söylenir
- Uygulama atılan verilerden ilgi alanlarını kendisi de öğrenir
- Odak alanları: iş/girişim/pazar, teknoloji/yapay zeka, bilim/sağlık/genel kültür

## 3D Sinaps Grafı

- Three.js tabanlı, hareketli, dönen 3D beyin/nöron ağı
- Bağlantılar boyunca akan ışık darbeleri (sinyal akışı)
- Yeni not geldiğinde ilgili nöronların "ateşlenmesi"
- Konulara göre renkli kümeler (beyin lobları gibi)
- Serbest gezinme: döndür, yakınlaş, düğümlerin içine uç
- Düğüm boyutu = önem (bağlantı sayısı)

## Arşivle sohbet

- "X hakkında ne biliyorum?" gibi sorular
- Arşiv yetersizse web'e bakabilir
- Sohbet geçmişi saklanır

## Bildirimler

- Tarayıcı / telefon push bildirimi (iPhone'da PWA ana ekrana eklendiğinde, iOS 16.4+)

## MVP kapsamı (ilk sürüm)

1. Veri at → analiz → not (temel akış)
2. Otomatik bağlantı + 3D sinaps grafı

Sonraki aşamalar: fikir üretme ve puanlama, arşivle sohbet, tarayıcı eklentisi,
iOS kısayolu, e-posta girişi, bülten, push bildirim, profil/projeler.

## Geliştirme süreci

Adım adım ilerlenir; her aşamadan sonra canlı link paylaşılır ve test edilir.

## Önerilen teknik yapı

- **Ön yüz:** Next.js (App Router) + TypeScript + Tailwind, PWA
- **3D:** `react-force-graph-3d` / Three.js + bloom efekti
- **Arka uç:** Next.js API route'ları + Supabase Edge Functions / kuyruk
- **Veri:** Supabase Postgres, `pgvector` ile anlamsal benzerlik, Storage (PDF/görsel)
- **AI:** Claude (analiz, bağlantı nedeni, fikir, web araştırma aracı),
  OpenAI embedding (benzerlik), Gemini (YouTube özeti)
- **İçerik çıkarma:** Readability (web), PDF ayrıştırıcı, Claude görsel okuma (OCR)
