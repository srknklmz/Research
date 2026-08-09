# Kanal Planı — Uygulamalı İstatistik / Veri Okuryazarlığı

**Dil:** İngilizce · **Seslendirme:** Kokoro TTS (AI) · **Animasyon:** Manim + Remotion
**Format:** 8–14 dk, ilk 6 video arama odaklı, 5'erli seriler halinde
**RPM aralığı:** $7–15 · **Rekabet:** Düşük-orta · **Arama niyeti:** En yüksek

---

## 1. Konumlandırma

Kanal, "bilim popülerleştirme" değil **karar verme aracı** olarak konumlanıyor. Hedef izleyici: veri analisti, ürün yöneticisi, doktora öğrencisi, A/B testi çalıştıran herkes. Bu kitle:

- Belirli soruları **arıyor** ("what does a p-value actually mean") — yeni kanal için tek öngörülebilir trafik kaynağı
- Profesyonel, yani reklam veren için değerli
- Konuyu bilenden öğrenmek istiyor — yani her video aynı zamanda portföy

**Ayırt edici koz:** Bu nişteki içeriğin çoğu formül anlatıyor. Sen **simülasyon** göstereceksin. p-değerinin ne olduğunu tanımlamak yerine, aynı deneyi 10.000 kez çalıştırıp dağılımın oluşmasını izleteceksin. Manim'in var oluş sebebi bu ve statik grafikle yapılamaz.

---

## 2. İlk 10 video

İki seri, her biri 5 bölüm. Playlist + end screen ile birbirine bağlı (2026'nın en ağır sinyali *session watch time* — seri bunu doğrudan besliyor).

### Seri 1 — "What the numbers don't say" (yanlış yorumlama)

| # | Başlık | Görsel fikir | Arama niyeti |
|---|---|---|---|
| 1 | What a p-value actually means (and what it doesn't) | Aynı deneyi 10.000 kez çalıştır, p-değeri histogramının oluşmasını izlet | Çok yüksek |
| 2 | Confidence intervals: what "95%" actually refers to | 100 ayrı örneklem, 100 ayrı aralık — kaçının gerçek değeri yakaladığını say | Yüksek |
| 3 | Simpson's Paradox: when every group disagrees with the total | Nokta bulutunu gruplara ayır, eğimin ters dönüşünü animasyonla göster | Yüksek |
| 4 | Why a 99% accurate test can still be wrong most of the time | Bayes'i 10.000 kişilik popülasyonda kutucuklarla göster, formülsüz | Çok yüksek |
| 5 | Correlation, causation, and the variable you didn't measure | Gizli değişkeni ekle, korelasyonun buharlaşmasını izlet | Yüksek |

### Seri 2 — "Designing a test that actually works" (uygulama)

| # | Başlık | Görsel fikir | Arama niyeti |
|---|---|---|---|
| 6 | How many samples do you actually need? | Örneklem büyüdükçe güç eğrisinin dolmasını animasyonla göster | Çok yüksek |
| 7 | p-hacking: how to torture data until it confesses | Aynı veride 20 hipotez dene, birinin "anlamlı" çıkışını canlı göster | Yüksek |
| 8 | Why your A/B test keeps "winning" (the peeking problem) | Testi erken durdurmanın yanlış pozitifi nasıl şişirdiğini simüle et | Çok yüksek |
| 9 | Multiple comparisons: the price of asking many questions | 20 test, beklenen yanlış pozitif sayısı; Bonferroni'nin bedeli | Orta-yüksek |
| 10 | Effect size: the number that matters more than significance | Aynı p-değeri, çok farklı iki etki büyüklüğü — yan yana | Orta-yüksek |

**Neden bu sıra:** 1, 4, 6 ve 8 en yüksek arama hacmine sahip olanlar — ama ilk videoyu en iyi yapamazsın. Bu yüzden 1'i başa koy (öğrenirken), 4/6/8'i sen ustalaştıktan sonra yayınla, çünkü asıl trafiği onlar getirecek.

---

## 3. AI seslendirmeyi çalışır hale getirme planı

Karar: Kokoro TTS ile devam. Risk kabul edildi. Bu riski azaltan somut önlemler:

### 3.1 Telaffuz sözlüğü (en kritik önlem)

İstatistik terimleri Kokoro'nun en çok yanlış vurguladığı yer. Claude'a bir `lexicon.json` yazdır: terim → fonem karşılığı. Sentezden önce metinde otomatik değiştirme yapılır.

Sözlüğe gireceklerin çekirdeği: *Bayes, Bayesian, Bernoulli, Poisson, Gaussian, heteroscedasticity, kurtosis, quantile, quartile, chi-square, Tukey, Bonferroni, Šidák, a priori, a posteriori, i.i.d., ANOVA, R-squared, t-test, z-score, p-hacking.*

Her videodan sonra yeni yanlış okunanları sözlüğe ekle — 5 videoda sözlük olgunlaşır.

### 3.2 Cümle cümle sentez

Tek uzun metni bir kerede seslendirme. Claude'a şunu yaptır: metni cümlelere böl, her cümleyi ayrı sentezle, aralarına kontrollü sessizlik (virgül 250 ms, nokta 500 ms, paragraf 900 ms) koyup FFmpeg ile birleştir. Prozodi kontrolü buradan geliyor — tek geçişte imkânsız.

### 3.3 TTS-dostu senaryo yazımı

Claude'a senaryoyu doğrudan bu kuralla yazdır:
- Cümleler 15 kelimeyi geçmesin
- Sayılar yazıyla ("zero point zero five", "0.05" değil)
- Kısaltmalar açık ("standard deviation", "SD" değil)
- Yan cümle yok, ara cümle yok
- Vurgulanacak kelime cümlenin sonuna

Bu tek başına model değiştirmekten daha çok fark yaratıyor.

### 3.4 Kusuru maskeleme

- Sürekli düşük seviyeli müzik yatağı (−28 dB civarı) düz tonlamayı yumuşatır
- Ekran metnini artır — izleyici okurken sese daha az odaklanır
- Animasyon yoğunluğunu yüksek tut; sessiz geçen 3–4 saniyelik görsel anlar sesin monotonluğunu kırar
- FFmpeg zinciri: hafif kompresyon + `loudnorm` ile −14 LUFS (YouTube standardı)

### 3.5 Ölçüm ve çıkış kuralı

Riski tartışmayla değil, kendi verinle çözeceğiz. İlk 5 videoda şunları izle:

| Metrik | Nereden | Alarm eşiği |
|---|---|---|
| İlk 30 saniye tutma oranı | YouTube Studio → Retention | %50 altı |
| Yorumlarda "AI voice" geçmesi | İlk 20 yorum | 2+ videoda tekrar ediyorsa |
| Abone / izlenme oranı | Studio | Niş ortalamasının belirgin altı |

**Çıkış kuralı:** 5 video sonunda ilk-30-saniye tutma %50'nin altındaysa **ve** yorumlarda AI ses şikâyeti tekrar ediyorsa, 6. videodan itibaren kendi sesine geç. İki koşul birlikte gerçekleşmiyorsa devam et — tek başına düşük tutma, sesin değil kancanın sorunu olabilir.

---

## 4. Tek videonun üretim hattı

| Adım | Araç | Kim yapıyor |
|---|---|---|
| Konu + arama kontrolü | Claude + WebSearch | Claude, sen onaylıyorsun |
| Senaryo (TTS kurallarıyla) | Claude | Claude yazar, **sen editoryal olarak elden geçirirsin** |
| Simülasyon kodu | Claude → Python/Manim | Claude |
| Animasyon | Manim (kavram) + Remotion (başlık, alt bant, geçiş) | Claude |
| Seslendirme | Kokoro + lexicon + cümle cümle sentez | Claude'un yazdığı script |
| Altyazı | faster-whisper → SRT | Otomatik |
| Kurgu + ses mix | FFmpeg (`loudnorm` −14 LUFS) | Claude'un yazdığı script |
| Thumbnail | HTML/CSS → Playwright ile PNG | Claude |
| Başlık / açıklama / etiket | Claude | Claude önerir, sen seçersin |
| Yükleme | Manuel (YouTube Studio) | Sen |

> **Otomasyon kurma.** Haftada 1 video için YouTube Data API + OAuth uğraşı, 10 dakikalık manuel yüklemeye değmez. Haftada 3+ videoya çıkarsan yeniden değerlendir.

**Senin gerçekten yapman gereken tek şey:** senaryonun editoryal denetimi. Özgün analiz, kendi bakış açısı ve doğruluk kontrolü — YouTube'un "inauthentic content" politikasında monetizasyonu koruyan şey tam olarak bu. Wikipedia özeti olursa hem izleyici hem politika ceza veriyor.

---

## 5. Kanal kurulumu kontrol listesi

- Kanal adı: nişi ima etsin, soyut olmasın. Handle'ı aynı anda X ve GitHub'da da al
- Dil: English · Kategori: Education · **"Made for Kids": Hayır** (evet dersen yorumlar ve kişiselleştirilmiş reklam kapanır)
- İlk günden playlist iskeleti: seri başına 1 playlist
- Banner/branding'e ilk ayda vakit harcama — 0 abonede kanal sayfana kimse bakmıyor
- AI açıklama toggle'ı: **işaretleme.** AI seslendirme tek başına "sentetik içerik" bildirimi gerektirmiyor; sadece gerçek bir kişinin sesi klonlanırsa zorunlu
- YPP başvurusu: en özgün 10–15 video yayındayken. "Hakkında" bölümüne araştırma sürecini yaz — inceleyen insan bunu okuyor

---

## 6. Hedefler

| Kilometre taşı | Gerçekçi zaman |
|---|---|
| İlk video yayında | 2 hafta |
| Seri 1 tamamlanmış (5 video) | 2,5 ay |
| 500 abone + 3.000 saat (genişletilmiş YPP: Super Thanks, üyelik) | 6–9 ay |
| 1.000 abone + 4.000 saat (tam YPP) | 10–18 ay |
| İlk sponsorluk (video başına istikrarlı 20–30K izlenme) | 12+ ay, muhtemelen daha geç |

**Asıl eşik abone değil izlenme:** 10 dk video, %40 tutma → izleyici başına 4 dk → 4.000 saat ≈ **60.000 izlenme**.

Beklenen 12 aylık gelir: **$800–2.000** (~900 saat emek karşılığı). Bu iş 12 ayda değil, 2–3. yılda gelir işi. Kanalın asıl erken getirisi portföy değeri.
