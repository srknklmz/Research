# Video 1 — "What a p-value actually means (and what it doesn't)"

**Seri:** What the numbers don't say (1/5) · **Hedef süre:** 8–10 dk
**Ana araç:** Manim (simülasyon) + Remotion (başlık, alt bant, geçişler)

---

## 1. Projeyi kurma promptu

Claude Code'u proje klasöründe aç (`cd ~/Projeler/ilk-video && claude`), plan moduna geç (`Shift+Tab`), sonra bunu yapıştır:

> Bu klasörü bir YouTube videosu üretim projesine dönüştürmeni istiyorum. Ben kod bilmiyorum, her adımı tek cümleyle sade Türkçe anlat.
>
> Kurmanı istediklerim:
> 1. Manim Community Edition (matematik animasyonu için) — uv kullanarak, sanal ortamda
> 2. Kokoro TTS (İngilizce seslendirme için) — yerel çalışacak
> 3. faster-whisper (otomatik altyazı için)
> 4. Klasör yapısı: `script/`, `scenes/`, `audio/`, `out/`, `assets/`
> 5. `lexicon.json` adında boş bir telaffuz sözlüğü dosyası
>
> Önce ne yapacağını ve ne kadar disk alanı gerektiğini anlat. Onayımı almadan kurulumu başlatma. Kurulum sırasında hata çıkarsa dur ve bana sade Türkçe açıkla.

Kurulum bitince ikinci prompt:

> CLAUDE.md dosyasına şu kuralları ekle:
> - Videolar 1920x1080, 30fps. Çıktılar `out/` klasörüne.
> - Seslendirme metinleri şu kurallara uymak zorunda: cümleler en fazla 15 kelime, sayılar yazıyla ("zero point zero five"), kısaltma yok ("standard deviation" yaz, "SD" yazma), yan cümle yok, vurgulanacak kelime cümlenin sonunda.
> - Seslendirme tek parça sentezlenmeyecek. Her cümle ayrı sentezlenip aralarına sessizlik konacak: virgül 250 ms, nokta 500 ms, paragraf 900 ms. Sonra FFmpeg ile birleştirilecek.
> - Sentezden önce metindeki terimler `lexicon.json` sözlüğüne göre değiştirilecek.
> - Ses son işlem: hafif kompresyon + loudnorm ile -14 LUFS.

---

## 2. Telaffuz sözlüğünün çekirdeği

`lexicon.json`'a ilk girecekler. Her videodan sonra yanlış okunanları ekle — beş videoda olgunlaşır.

`Bayes` · `Bayesian` · `Bernoulli` · `Poisson` · `Gaussian` · `heteroscedasticity` · `kurtosis` · `quantile` · `quartile` · `chi-square` · `Tukey` · `Bonferroni` · `Šidák` · `a priori` · `a posteriori` · `i.i.d.` · `ANOVA` · `R-squared` · `t-test` · `z-score` · `p-hacking` · `Fisher`

---

## 3. Senaryo (İngilizce, TTS kurallarına uygun)

> Sahne numaraları animasyon planıyla eşleşiyor. Köşeli parantezler seslendirilmez.

**[S1 — Hook]**

Here is a sentence you have read many times.
The result was statistically significant.
p was less than zero point zero five.
Most people read that as: the finding is probably true.
That reading is wrong.
Not slightly wrong. Backwards.
Let me show you what that number actually measures.

**[S2 — The experiment]**

Imagine you run a simple test.
You change a button from blue to green.
You show each version to one hundred people.
The green button gets fifty five clicks.
The blue button gets forty five.
Green looks better. But is it?
Ten extra clicks could easily be luck.

**[S3 — Building the null world]**

So we ask a strange question.
Suppose the color changes nothing at all.
Suppose every click was pure chance.
What would that world look like?
We do not have to imagine it. We can build it.
Flip a fair coin one hundred times.
Count how many land on green.
Then do it again. And again.

**[S4 — The simulation]**

Here is that world, ten thousand times over.
Every dot is one imaginary experiment.
No real effect. Only randomness.
Watch the shape that forms.
Most experiments land near fifty.
Some drift out to fifty five.
A few reach sixty, purely by accident.
This pile is everything chance alone can produce.

**[S5 — Locating the result]**

Now place your real result on this pile.
Fifty five clicks. Right here.
Count every imaginary experiment that reached fifty five or more.
That fraction is your p-value.
That is the entire definition.
It is the chance of seeing data this extreme, in a world where nothing is happening.

**[S6 — Why "or more"]**

One detail people skip.
We counted fifty five or more, not exactly fifty five.
Exactly fifty five is almost meaningless on its own.
What we care about is the tail.
How far out did we land, compared to pure noise?

**[S7 — Mistake one]**

Now the mistakes. There are three.
First. People say p is the probability the effect is fake.
It is not.
Look again at what we computed.
We assumed nothing was going on.
Then we asked how surprising our data looked.
We never asked how likely that assumption was.
A p-value is a statement about data.
It is not a statement about truth.

**[S8 — Mistake two]**

Second. People say p is the probability the result was luck.
Same error, wearing a different coat.
A p-value of zero point zero four does not mean four percent chance of luck.
It means something narrower.
In a world of pure luck, four percent of experiments look like yours.
Those two sentences sound identical. They are not.
One is about your result. The other is about an imaginary world.

**[S9 — Mistake three]**

Third. People treat a tiny p-value as a big effect.
Watch what happens when the sample grows.
Same tiny difference. One thousand people. The p-value drops.
Ten thousand people. It collapses.
The effect never changed. Only our ability to detect it did.
A small p-value means detectable.
It does not mean important.

**[S10 — The threshold]**

One more thing about that famous cutoff.
Zero point zero five is not a law of nature.
Ronald Fisher offered it as a convenience.
He expected researchers to use judgment alongside it.
Instead we built an industry around a cliff edge.
Zero point zero four nine gets published.
Zero point zero five one gets buried in a drawer.
Nothing in the mathematics justifies that line.

**[S11 — Consequence]**

This matters more than it sounds.
When a threshold decides what gets published, results bend toward it.
Whole fields have struggled to reproduce their own findings.
The number was never the problem.
What we believed it said was the problem.

**[S12 — The honest summary]**

So here is what a p-value actually does.
It answers exactly one question.
If nothing were going on, how strange would my data look?
That is genuinely useful. It is also very narrow.
It cannot tell you the effect is real.
It cannot tell you the effect is large.
It cannot tell you the study was designed well.

**[S13 — Outro]**

There is a companion number that people misread just as badly.
The confidence interval.
Almost everyone believes ninety five percent refers to the true value.
It does not.
That is the next video in this series.

---

## 4. Sahne planı (Manim)

| Sahne | Animasyon | Not |
|---|---|---|
| S1 | Ekranda tek cümle, `p < 0.05` büyür ve kırmızıya döner | Remotion ile başlık kartı |
| S2 | İki buton yan yana, tıklama sayaçları 55 / 45'e doğru sayar | Basit, hızlı |
| S3 | Bir madeni para, 100 kez atılır, yeşil sayacı dolar | Tek deney görünsün |
| S4 | **Ana an.** 10.000 deney hızlanarak birikir, histogram oluşur | Videonun en uzun sessiz anı — ~15 sn nefes bırak |
| S5 | Histogram üzerinde 55 çizgisi, sağ kuyruk taranır ve oran yazılır | p-değerinin görsel tanımı |
| S6 | Tek çubuk vs. kuyruk karşılaştırması | Kısa |
| S7 | Ok, "veri" kutusundan "gerçek" kutusuna gitmeye çalışır ve kırılır | Kavramsal görsel |
| S8 | İki cümle yan yana, kelimeler eşleşir ama anlamlar ayrılır | Tipografi ağırlıklı — Remotion |
| S9 | Aynı fark, üç örneklem boyutu; p-değeri düşerken etki sabit kalır | İkinci en güçlü an |
| S10 | 0.05 çizgisi, iki nokta çizginin iki yanında — biri parlar, biri söner | |
| S11 | Yayın kutusu dolar, başarısız tekrarlar soluklaşır | Kısa, sade tut |
| S12 | Üç "cannot" satırı sırayla belirir | |
| S13 | Bir sonraki videonun görseli | End screen için 20 sn yer bırak |

**Süre notu:** Seslendirme metni ~950 kelime, yaklaşık 6 dakika. S4 ve S9'daki sessiz animasyon anları toplam süreyi 8–9 dakikaya çıkarır. Sekiz dakika mid-roll reklam eşiği — altına inme.

---

## 5. Thumbnail

Tek, açıklanmamış görsel + en fazla üç kelime. Öneri: histogramın sağ kuyruğu taranmış halde, üzerinde `p = 0.04` ve altında `NOT what you think`. **Kararı 320×180 boyutunda ver** — mobilde okunmuyorsa çalışmıyordur.

---

## 6. Yayın kontrolü

- Başlık: `What a p-value actually means (and what it doesn't)` — arama niyetiyle birebir eşleşiyor
- Açıklama: ilk iki satırda videonun cevapladığı soru, sonra zaman damgaları, sonra seri playlist linki
- Playlist: "What the numbers don't say" — ilk günden oluştur
- End screen: 2. videoya (confidence intervals) yönlendir, o çıkana kadar playlist'e
- AI açıklama toggle'ı: **işaretleme** (gerçek bir kişinin sesi klonlanmıyor)
- Yayından 48 saat sonra: tıklanma oranı düşükse thumbnail'ı değiştir, farkı gözle
