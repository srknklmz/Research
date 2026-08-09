# Sadece Claude ile Oyun ve YouTube Animasyonu Üretimi
## Kapsamlı Araştırma Raporu — Ağustos 2026

**Hazırlayan:** 6 uzman araştırma ajanından oluşan ekip
**Kullanıcı profili:** Apple Silicon Mac (M serisi, 16 GB) · kod bilgisi yok · Claude Max $200/ay dışında sıfır bütçe · önce YouTube animasyonu, sonra oyun · Türkçe + İngilizce + konuşmasız içerik

---

## 0. Üç sorunun kısa cevabı

| Soru | Cevap |
|---|---|
| Claude'u Unity vb. programlara entegre edip çok daha kaliteli oyunlar yapabilir miyim? | **Evet — ama Unity ile değil, Godot ile.** Entegrasyon MCP sunucularıyla gerçek ve ücretsiz. Kalite tavanı 2D/kod-yoğun türlerde yüksek, 3D/sanat-yoğun türlerde düşük. |
| Sadece Claude ile YouTube için profesyonel animasyon üretebilir miyim? | **Evet — belirli tarzlarda gerçekten profesyonel.** Motion graphics, explainer, veri görselleştirme: evet. Karakterli hikaye animasyonu: hayır (bu bütçede aylarca manuel sanat işi). |
| Ücretsiz olup Claude ile kullanabileceğim üretici uygulamalar neler? | Remotion, Manim, Motion Canvas, Blender, Godot, FFmpeg, DaVinci Resolve Free, Kokoro/Piper TTS, faster-whisper, Draw Things, Kenney/Quaternius/Poly Haven varlıkları, jsfxr, MuseScore. Detaylar bölüm 4. |

**Tek cümlelik özet:** Kod artık darboğaz değil. Darboğaz **sanat yönü, ses ve "hangi içerik izlenir" kararı**. Plan bunun üzerine kurulmalı.

---

## 1. Kanıta dayalı gerçeklik tablosu

Ekibin en önemli işi iyimser vaatleri gerçek verilerle test etmekti. Bulunanlar:

### Yayınlanmış gerçek vakalar

| Vaka | Ne yapıldı | Sonuç |
|---|---|---|
| **yurukusa** (DEV, mühendis değil) | Claude Max $200 ile 30 günde 5 oyun, 1.079 oturum, 50.000+ satır | **Toplam gelir: $4,99. ROI: −%97,5.** Kendi tanımladığı arıza modu: *"testler geçiyor ama oyun oynanamıyor"* |
| **CODEX MORTIS** (Steam) | "%100 AI" roguelite, 3 ay, kod/shader/animasyon Claude Code | ~$3.700 tahmini gelir; PC Gamer manşeti: *"slop için bir dönüm noktası"* |
| **Catvivors** (Steam) | Claude Code ile solo Vampire Survivors klonu | Early Access ~$5 |
| **Blackholio** | Claude Code + Phaser + SpacetimeDB, çok oyunculu tarayıcı oyunu | Tek detaylı prompt + ~4 iyileştirme, **~30 dakika** |

Bu vakaların hepsi aynı kategoride: **minimum sanat + maksimum kod**. Tesadüf değil.

### Sektör verileri

- Steam'de **medyan indie oyun 2025'te ~$249 brüt / ~$174 net** kazandı. 2025 çıkışlarının yaklaşık yarısı 10'dan az inceleme aldı, ~2.200 tanesi sıfır.
- Steam'de AI beyanı oranı: 2024 %10,9 → 2025 %19,9 → 2026 ilk yarı **%30,8**. Beyan yasak değil, ama etikette görünür.
- YouTube monetizasyon eşiği: 1.000 abone + 4.000 izlenme saati, tipik olarak **6–12 ay**. Shorts RPM'i $0,01–$0,07 — Shorts ile gelir pratikte yok.
- 3Blue1Brown'un referansı: **her 10 dakikalık içerik için ~1 hafta animasyon** (senaryo, ses, kurgu hariç).

### Zaman gerçeği

| İş | Gerçekçi süre |
|---|---|
| Yayınlanabilir küçük oyun (yarı zamanlı, yeni başlayan) | 6–12 ay → AI ile **2–4 ay** |
| 10 dakikalık kaliteli animasyon videosu | 40–80 saat → AI ile **20–40 saat** |
| İlk anlamlı YouTube geliri | 6–12 ay |

> **"AI ile haftada oyun çıkarırım"** iddiası veriyle desteklenmiyor. AI süreyi 2-4 kat kısaltıyor, 50 kat değil.

---

## 2. Karar: neye odaklanmalısın

Sen dört tarzı da işaretledin. Ekibin bulgularına göre bunları **öncelik sırasına** koyuyorum:

### ✅ Sıra 1 — Eğitici / açıklayıcı animasyon (hemen başla)
Claude'un mutlak en güçlü olduğu alan. Çıktı **koddur, sanat değil** — yani Claude'un zayıflığı hiç devreye girmiyor. Kalite tavanı gerçekten profesyonel seviyeye çıkıyor. Telif riski minimum (kendi ürettiğin kod = kendi eserin). Maliyet: $0.

### ✅ Sıra 2 — 2D pixel/vektör oyun (2-3 ay sonra)
Godot + Claude ile itch.io'da yayınlanabilir kalite ulaşılabilir. Tüm başarılı vakalar bu kategoride. Ama sanat ve ses senin sorunun olarak kalır.

### ⚠️ Sıra 3 — Karakterli hikaye animasyonu (6+ ay sonra, ya da hiç)
Blender + Mixamo ile teknik olarak mümkün, ama Claude burada sana sadece `bpy` otomasyonu yazabilir. Asıl iş (keyframe hissi, mimik, timing) tamamen senin elinde ve **aylar** sürer. Kod bilmeyen biri için bu, öğrenme eğrisinin en dik yeri.

### ❌ Sıra 4 — 3D oyun (bu aşamada iptal)
"Erteleme" değil, **iptal**. Claude 3D model, doku, rig veya animasyon üretemiyor. 16 GB Mac'te Blender + Godot 3D pipeline'ı ayrıca donanım sınırına dayanıyor. Buraya harcanan her saat, Sıra 1'den çalınmış saattir.

---

## 3. Neden Godot, neden Unity değil

| | Godot 4 | Unity | Unreal |
|---|---|---|---|
| Lisans / maliyet | **MIT — tamamen ücretsiz, gelir sınırı yok, royalty yok** | Personal ücretsiz, ama yıllık gelir+fon $200k'yı geçerse Pro (~$2.200/koltuk/yıl). Runtime Fee iptal edildi | İlk $1M'a kadar royalty yok, sonrası %5 |
| Claude uyumu | **Yüksek** — `.tscn` sahne dosyaları ve GDScript **düz metin**, Claude doğrudan okur/yazar | **Düşük-orta** — binary asset + sürükle-bırak GUI iş akışı Claude'a opak | Düşük — `.uasset` binary |
| MCP durumu | godot-mcp (5,1k ⭐), GDAI MCP — olgun | MCP for Unity (13,3k ⭐, 47 tool) — olgun ama iş akışı akıcı değil | UE 5.8'de gömülü, **experimental** (Haz 2026) |
| Mac (M serisi) | Hafif, sorunsuz | Ağır | Çok ağır, 16 GB'da zorlanır |

**Karar: Godot 4 + GDScript.** Lisans sıfır, Claude uyumu en yüksek, Mac'te en hafif.

> ⚠️ **Ücretli tuzak:** `godot-mcp-pro` (162 tool) $15 tek seferlik ücretli. Ücretsiz alternatifler (GDAI MCP + Coding-Solo godot-mcp) zaten yeterli.

---

## 4. Ücretsiz araç yığını — 16 GB M serisi Mac için nihai seçim

### 4.1 Animasyon (ana pipeline)

| Araç | Lisans / ticari YouTube | Claude uyumu | Not |
|---|---|---|---|
| **Remotion** | **Birey olarak ÜCRETSİZ ve ticari serbest** (4+ kişilik şirket olursan ücretli) | ⭐ 5/5 | **Ana silahın.** React ile video yazıyorsun |
| **Manim CE** | MIT | ⭐ 5/5 | 3Blue1Brown tarzı matematik/kavram animasyonu |
| **Motion Canvas** | MIT | 4/5 | Seslendirmeyle senkron animasyonda güçlü; ekosistem küçük |
| **p5.js / Three.js / GSAP** | MIT (GSAP artık tamamen ücretsiz) | 4/5 | Playwright + FFmpeg ile frame frame kayıt |
| **Blender** | GPL — çıktılar %100 senin | 3/5 | 3D/2D (Grease Pencil) gerekince. `bpy` scripting iyi, sanatsal kısım manuel |
| **DaVinci Resolve Free** | Ücretsiz, filigransız, ticari serbest | — | 4K 60fps'e kadar export. YouTube için fazlasıyla yeterli |
| **FFmpeg** | LGPL/GPL | ⭐ 5/5 | Kurgu, ses normalizasyonu (`loudnorm` → −14 LUFS), altyazı gömme |
| **faster-whisper / whisper.cpp** | MIT | ⭐ 5/5 | Otomatik SRT altyazı + kelime bazlı zaman kodu |

> ❌ **Rive:** free plan 3 dosya sınırı, ticari iş için $9/ay. Bütçe dışı.

### 4.2 Seslendirme (TTS) — burada ciddi bir lisans tuzağı var

| Model | Türkçe | Lisans | Ticari kullanım | Karar |
|---|---|---|---|---|
| **Kokoro-82M** | ❌ yok | Apache-2.0 | ✅ Serbest | ⭐ **İngilizce için en iyi seçim.** 327 MB, CPU'da hızlı |
| **Piper** (`tr_TR-dfki / fahrettin / fettah`) | ✅ 3 ses | GPL-3.0 | ✅ Serbest (CLI olarak çağır) | ⭐ **Türkçe için tek güvenli yerel seçenek.** Kalite orta |
| **Chatterbox** (Resemble AI) | Kısmen (multilingual) | MIT | ✅ Serbest | En yüksek kalite + ses klonlama. Türkçe'yi kendi metninle test et |
| **Coqui XTTS-v2** | ✅ | CPML | ❌ **TİCARİ YASAK** | **Kullanma.** Coqui kapandı, lisans satın alınamıyor |
| **F5-TTS** | Sınırlı | CC-BY-NC | ❌ **TİCARİ YASAK** | **Kullanma** |

> **Kalite artırma hilesi:** Claude'a metni TTS-dostu yazdır (kısa cümle, noktalama ile duraklama, sayıları yazıyla, kısaltmaları aç). Bu, model değiştirmekten daha çok fark yaratır.

### 4.3 Görsel varlık

**Claude'un kendi ürettiği (yerel, anında, sınırsız, telifsiz):**

| Teknik | Kalite tavanı | Kullan |
|---|---|---|
| SVG (flat vector) | **Yüksek** — UI ikonu, logo, silüet, infografik | ✅ Oyun HUD, YouTube alt bantları |
| Procedural pixel art (Python/PIL) | Orta-yüksek — 16×16/32×32 tile ve item iyi | ✅ Tileset, item, particle |
| p5.js / Canvas generative | **Yüksek** — arka plan, pattern, flow field | ✅ (`algorithmic-art` skill'i mevcut) |
| GLSL shader dokusu | **Yüksek** — noise/ahşap/mermer/su, sonsuz çözünürlük | ✅ Oyun malzemeleri |
| HTML/CSS → PNG (Playwright) | Yüksek — thumbnail, kart, tablo | ✅ YouTube thumbnail şablonları |
| Figüratif illüstrasyon / karakter | **DÜŞÜK** | ❌ Bunu diffüzyon modeline bırak |

**Diffüzyon modelleri (karakter/illüstrasyon için):**
- **Mac'te:** **Draw Things** (Mac App Store, ücretsiz, elle yazılmış Metal shader'lar — ComfyUI'dan ~3× hızlı). 16 GB'da SDXL rahat; FLUX.1-schnell'in GGUF-Q4 sürümü sınırda çalışır.
- **Ağır işler için ücretsiz bulut:** Kaggle **30 GPU-saat/hafta** (en cömert ve öngörülebilir) + Google Colab Free ~15–30 saat/hafta. Toplam haftada ~50 GPU saat, sıfır para.
  - ⚠️ Colab/Kaggle **ephemeral** — model indirmeleri her oturumda tekrar (FLUX 12–24 GB). Modeli Kaggle Datasets'e yükleyip mount et.
- ⚠️ **FLUX.1-dev ticari kullanıma KAPALI.** Kalite en yüksek olan bu, ama para kazanacaksan **FLUX.1-schnell** (Apache-2.0) veya **SDXL** (OpenRAIL++) kullan.

**Hazır ücretsiz varlıklar:**

| Kaynak | Lisans | Tuzak |
|---|---|---|
| Kenney.nl | **CC0** | Yok. 40k+ varlık, atıf bile gerekmiyor |
| Quaternius | **CC0** | Yok. Low-poly 3D + animasyon |
| Poly Haven | **CC0** | Yok. HDRI, PBR doku, 8K'ya kadar model |
| Mixamo | Ücretsiz, telifsiz, sınırsız ticari | Oyuna gömmek serbest; **asset paketi olarak yeniden satamazsın** |
| OpenGameArt | Karışık | ⚠️ GPL ve CC-BY-SA varlıklar oyununu bulaştırabilir — sadece CC0/CC-BY filtrele |
| Sketchfab | Karışık | ⚠️ CC-BY-NC / NoDerivatives tuzağı yaygın; çalıntı model riski |
| Google Fonts | OFL/Apache | ✅ Temiz. Türkçe karakterleri test et (ğ, ş, ı, İ) |

> **Zorunlu alışkanlık:** Claude'a bir `ASSETS.md` lisans defteri tutturun — her dosya için kaynak URL + lisans + atıf metni. İleride hukuki sorun çıkmasını engeller.

### 4.4 Ses efekti ve müzik

| Araç | Lisans | Otomasyon |
|---|---|---|
| **jsfxr** (sfxr.me) | MIT | ⭐ En iyi otomasyon adayı. Claude 300 parametre JSON'u üretir → CLI ile toplu WAV |
| **MuseScore** | GPL | ⭐ MusicXML/ABC **metin formatı** → Claude doğrudan besteleyebilir. `mscore -o out.wav in.mxl` |
| **LMMS** | GPL | Proje dosyası XML → Claude düzenler, `lmms render` ile WAV |
| **Stable Audio Open** | MIT-benzeri | ✅ Ticari serbest. Ambiyans, kısa loop |
| **ACE-Step** | Apache-2.0 | ✅ Ticari serbest. 2026'nın en iyi açık müzik modeli |
| **Freesound.org** | Karışık | ⚠️ Filtreyi **CC0** yap. API'si var |
| ~~MusicGen~~ | CC-BY-NC | ❌ **Ticari kullanım ihlali. Kullanma** |

---

## 5. Riskler ve tuzaklar

### 5.1 YouTube politikası — en büyük risk burada

- **"Inauthentic content" politikası (15 Tem 2025):** Şablon-temelli, tekrarlayan, katma değersiz içerik monetizasyondan çıkarılıyor. Yaptırım: uyarı → 90 gün askı → YPP'den kalıcı çıkarma.
- **Ocak 2026 temizliği:** 35 milyon aboneli 16 kanal (4,7 milyar izlenme) kapatıldı. **Daha kötüsü: algoritma AI kullanmayan faceless kanalları da cezalandırdı.**
- **Yanlış pozitif gerçek:** Tamamen insan yapımı Kurzgesagt bile AI-slop dedektörüne takıldı, videosu 2013'ten beri en kötü performansını gösterdi. Mart 2026'dan beri izleyicilere "bu video slop mu?" anketi soruluyor.
- **AI açıklama zorunluluğu:** Sadece **gerçekçi görünen** sentetik içerik için. Soyut motion graphics, Manim animasyonu, veri grafikleri **bu kapsamda değil** — işaretlemene gerek yok.

**Senin için kural:** Kod tabanlı animasyon özgün üretimdir, sorun değil. Ama **aynı Remotion şablonuna farklı metin basıp günde 6 video atarsan tam olarak politikanın hedeflediği şey olursun.** Her videoda özgün analiz, editoryal bakış, farklı görsel tasarım olsun. **Nicelik değil, nitelik.**

### 5.2 Telif

ABD Telif Ofisi (29 Ocak 2025): **saf AI çıktısı telif alamaz; "sadece prompt vermek" yeterli insan katkısı değil.** Yani AI ile ürettiğin karakter sanatını veya müziği rakibin serbestçe kopyalayabilir. Kod tabanlı üretimde bu risk düşük (kodu sen yönlendiriyorsun ve düzenliyorsun), saf diffüzyon çıktısında yüksek.

### 5.3 "Hiç para vermeyeceğim" nerede kırılıyor

| Kalem | Kaçınılabilir mi? |
|---|---|
| Godot, Blender, Remotion, Manim, Resolve, FFmpeg, Krita, Audacity | ✅ Tamamen ücretsiz |
| itch.io yayını | ✅ Ücretsiz |
| **Steam Direct** | ❌ **Oyun başına $100.** $1.000 brüt gelirden sonra mahsup ediliyor. + %30 komisyon + 30 gün bekleme |
| Elektrik / render süresi | ❌ 4K Manim render'ları saatler sürer |
| **Öğrenme süresi** | ❌ **En büyük gizli maliyet: 6–12 ay** |

**Sonuç:** itch.io + YouTube ile kalırsan gerçekten $0 harcayabilirsin. Steam'e çıkacaksan $100 matematiksel olarak kaçınılmaz.

### 5.4 Teknik duvar

Oyunlarda fizik/render/input/state/save/UI sıkı bağlıdır. AI, izole çalışan ama kötü bağlanan kod üretir ve kendiliğinden otomatik test yazmaz. yurukusa'nın tanımladığı arıza modu tam olarak bu: *"testler geçiyor ama oyun oynanamıyor"*.

**Çözüm — bu tek şey kalite tavanını en çok yükselten yatırım:**
**Ekran görüntüsü → Claude görsel analiz → düzeltme döngüsü kur.**
- Godot: `godot --headless` ile otomatik test + `get_viewport().get_texture().get_image().save_png()` ile kare yakala → Claude PNG'yi okur, düzeltir.
- Web oyunları: Playwright MCP ile tarayıcıyı aç, tıkla, screenshot al, Claude kendi okur — tam otonom döngü.

---

## 6. Claude Max $200 — limitler ve yönetimi

**Kapsam:** Claude chat (web/desktop/mobil), Claude Code'un tüm yüzeyleri (terminal, IDE, Desktop, claude.ai/code), Artifacts, Cowork. Tek abonelik, ek ücret yok.

**Limit yapısı:** Üç ayrı limit birlikte işler — yuvarlanan **5 saatlik pencere** + **haftalık limit** + ayrı bir **Opus kovası**. Session ve haftalık limitler tüm modeller arasında paylaşılır (model değiştirmek erişimi geri getirmez), ama Opus limitine takılınca `/model sonnet` ile devam edebilirsin.

> Anthropic saat/token cinsinden resmî rakam yayınlamıyor. **Gerçek kalanını görmek için tek güvenilir yol: `/usage` komutu** — hangi skill/subagent/MCP ne kadar yediğini de gösterir.

**Otomasyon ekstra para gerektirmiyor:** `claude -p` (headless), Agent SDK ve GitHub Actions abonelik limitlerinden düşer, API anahtarı gerekmez. (Tek istisna: `--bare` bayrağı OAuth'u okumaz ve `ANTHROPIC_API_KEY` ister — CI'da kullanma.)

**Limit yönetimi taktikleri:**
1. `/clear` bedava, `/compact` pahalı. İlgisiz işe geçerken `/clear`.
2. Model seçimi: günlük iş → **Sonnet 5**; mimari karar/zor debug → **Opus 5**; basit subagent → `haiku`; ucuz ara yol → **`opusplan`** (plan Opus, uygulama Sonnet).
3. **Plan mode (Shift+Tab)** — karmaşık işte her zaman. Yanlış yöne gidip token yakmayı önler.
4. Verbose işleri (test çıktısı, log, asset tarama) **subagent**'lara devret.
5. `CLAUDE.md`'yi 200 satırın altında tut; detaylı iş akışlarını **Skills**'e taşı.
6. Screenshot döngüsünü script'e bağla — her kareyi Claude'a yollamak pahalı, **sadece başarısız testlerde** gönder.
7. Kullanmadığın MCP server'ı `/mcp` ile kapat. CLI araçları (`ffmpeg`, `godot`) MCP'den ucuzdur.

---

## 7. Para kazanma — gerçekçilik sıralaması

1. **Freelance / sözleşmeli iş** — Claude Code becerini başkasına satmak. En hızlı ve en kesin gelir.
2. **YouTube AdSense** — 6–12 ay sonra $50–500/ay.
3. **Asset / araç satışı.**
4. **Oyun satışı** — en düşük olasılıklı. Steam medyanı ~$174 net.

İlk gelirin ilk 6 ayda anlamlı olma ihtimali düşük. Bunu bilerek başla.

---

## 8. Kurulum — Mac'te sıfırdan, adım adım

> Terminal deneyimi olmadığı varsayılmıştır. Her komut kopyala-yapıştır içindir.
> **Jargon:** *Terminal* = Mac'te komut yazdığın pencere. *MCP* = Claude'un dışarıdaki programları (Blender, tarayıcı) kullanmasını sağlayan köprü. *Homebrew* = komutla çalışan Mac program mağazası.

### 8.0 Önce karar: Desktop mu, Terminal mi?

Yetenekleri **aynı**. **Claude Desktop ile başla** — dosya değişikliklerini renkli "önce/sonra" görünümünde gösterir, onay butonları var. Terminal sürümünü de kur, çünkü bazı MCP kurulumları oradan tek satırla yapılıyor.

### 8.1 Claude'u kurmak

**Terminal'i aç:** `⌘ + Boşluk` → `terminal` yaz → Enter. Sonunda `%` işareti olan bir satır göreceksin — normal.

**Claude Desktop:** `claude.ai/download` → macOS sürümü → .dmg'ye çift tıkla → ikonu Applications'a sürükle. İlk açılışta "İnternetten indirilen uygulama" uyarısına **Aç** de.
→ Sign in → tarayıcıdan gir. **Doğru gitti mi?** Sol altta hesabında **Max** yazmalı.

**Claude Code (terminal sürümü):**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
Sonra terminali **kapat ve yeniden aç** (PATH yenilensin), kontrol et:
```bash
claude --version
```
`2.x.xxx (Claude Code)` görmelisin. `command not found` görüyorsan terminali kapatıp açmayı unutmuşsundur.

### 8.2 Araçlar (sıra önemli!)

**1) Xcode Command Line Tools — ÖNCE bu, yoksa hiçbiri kurulmaz:**
```bash
xcode-select --install
```
Pencere açılır → Install → ~5–10 dk. Zaten kuruluysa "already installed" der, sorun değil.

**2) Homebrew:**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Mac şifreni ister — **yazarken ekranda hiçbir şey görünmez**, bu normaldir.

**3) PATH satırı — Apple Silicon'da EN SIK ATLANAN ADIM:**
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```
```bash
brew --version
```
Yol `/opt/homebrew` olmalı (`/usr/local` Intel Mac'lerindir).

**4) Tüm araçlar:**
```bash
brew install uv node ffmpeg git
brew install --cask blender
```
Doğrulama:
```bash
uv --version && node --version && ffmpeg -version | head -1
```
Rosetta gerekmiyor — hepsinin native Apple Silicon sürümü var.

### 8.3 MCP kurulumu

En kolay yol hazır olanlar için: **Claude Desktop → Ayarlar → Connectors**.

**Blender MCP (iki taraflı — ikisini de yapmalısın):**
```bash
claude mcp add blender uvx blender-mcp
```
Sonra `github.com/ahujasid/blender-mcp` → `addon.py` indir → Blender → **Edit > Preferences > Add-ons > Install...** → dosyayı seç → **"Interface: Blender MCP"** kutusunu işaretle → 3D görünümde **`N`** tuşu → **BlenderMCP** sekmesi → **Connect to Claude**.

**Tarayıcı (Playwright) MCP:**
```bash
claude mcp add playwright -s user -- npx @playwright/mcp@latest
```

**Kontrol:**
```bash
claude mcp list
```
`blender ✓ connected` görmelisin.

> ⚠️ Blender MCP'yi aynı anda hem Desktop'ta hem Code'da açık tutma — çakışır.

### 8.4 Günlük iş akışı (kod bilmeyen için)

**Her iş ayrı klasör:**
```bash
mkdir -p ~/Projeler/youtube-animasyon
cd ~/Projeler/youtube-animasyon
claude
```
Claude sadece içinde bulunduğu klasörü görür — bu bir güvenlik özelliğidir.

**Projeyi tanıt:** Claude açıkken `/init` yaz. `CLAUDE.md` not dosyası oluşur; Claude her açılışta okur. "CLAUDE.md'ye ekle: videolar 1920×1080, 30fps, çıktılar `output/` klasörüne" dersen bir daha tekrarlamana gerek kalmaz.

**Plan modu — en önemli alışkanlık:** `Shift + Tab`. Bu modda Claude **hiçbir şeye dokunmaz**, sadece planı anlatır. Beğenirsen onaylarsın.

**Bir şey bozulunca:**

| Durum | Çözüm |
|---|---|
| Yanlış yola gitti | `Esc` — anında durdurur |
| Son yaptığını geri al | `/rewind` |
| Saçmalıyor | `/clear` (hafızayı temizler, dosyalar durur) |
| Kurulum bozuk mu? | `claude doctor` |

**Hazır prompt kalıpları:**
- *Keşif:* "Bu klasörde ne var, sade Türkçe anlat. Hiçbir şeyi değiştirme."
- *Yapım:* "10 saniyelik animasyon istiyorum: [açıklama]. Önce plan yap, onaylamadan dosya oluşturma."
- *Düzeltme:* "Şu hatayı aldım: [yapıştır]. Sebebini açıkla, sonra en basit çözümü uygula."
- *Öğrenme:* "Ne yaptığını her adımda tek cümleyle anlat, ben kod bilmiyorum."
- *Güvenlik:* "Hiçbir dosyayı silme. Değiştireceğin her dosyanın önce yedeğini al."

> Yeni başlarken **hiçbir zaman "bypass permissions" modunu açma.**

### 8.5 En sık 10 hata

1. `command not found: brew` → PATH satırını (8.2/3) atlamışsın.
2. `command not found: claude` → Terminali yeniden açmamışsın.
3. Şifre yazarken ekran boş → Hata değil, güvenlik. Yaz ve Enter.
4. "Geliştirici doğrulanamadı" → Sistem Ayarları → Gizlilik ve Güvenlik → "Yine de Aç".
5. `xcrun: error: invalid active developer path` → `xcode-select --install`.
6. Blender render çok yavaş → Render Properties → Device: **GPU Compute** seçilmemiş.
7. `claude mcp list` boş → Yanlış klasörde kurmuşsun; `-s user` ekleyerek tekrar kur.
8. Blender MCP "connection refused" → Blender kapalı ya da `N` panelinden Connect tıklanmamış.
9. ComfyUI "out of memory" → Model RAM'e büyük; quantized sürüm indir.
10. Claude aynı hatayı döngüde tekrarlıyor → `Esc` → `/clear` → tek cümleyle yeniden anlat.

### 8.6 Apple Silicon ayarları

- **Blender:** Render Properties → Device: **GPU Compute**. Bunu yapmazsan CPU'da render alır, 5–10 kat yavaş olur. Metal desteği iyi — M4 Max, RTX 4070 masaüstü seviyesinde skor alıyor.
- **ComfyUI:** Başlatma komutuna `--use-pytorch-cross-attention` ekle. Flux kullanacaksan ComfyUI-MLX düğümleri %35–70 hız kazandırır.
- **TTS:** **Kokoro'nun MLX sürümü** (~355 MB, 50+ ses, Apache-2.0) İngilizce için varsayılanın olsun.

---

## 9. Yol haritası

### İlk 10 gün — hedef: yayınlanabilir ilk video

| Gün | Hedef |
|---|---|
| 1 (2–3 saat) | Bölüm 8.1–8.2 tamamlanır. Her şey kurulu. |
| 2–3 | Claude Code'la ilk konuşmalar, plan modu alışkanlığı, `ffmpeg` ile basit kesme/birleştirme. |
| 4–6 | Remotion projesi kurulur (`npx create-video@latest`), Claude ilk kompozisyonu yazar, `npx remotion studio` ile canlı önizleme. |
| 7–10 | **İlk video:** senaryo (Claude) → Kokoro/Piper seslendirme → Remotion animasyon → `remotion render` → ffmpeg ile birleştirme → whisper ile altyazı. |
| 3–4. hafta | Tekrarlanabilir şablon. Video başına süre 2 güne düşer. |

**En çok takılma yaratan üç yer:** (1) Homebrew PATH satırı — yeni başlayanların yarısı burada takılır, (2) Blender MCP'nin iki taraflı kurulumu, (3) Blender'ın kendisi — temel 3D kavramları (kamera, ışık, keyframe) Claude'un senin yerine öğrenemeyeceği tek kısım, 2–3 gün ayır.

### Tam üretim hattı — hangi adım otomatik?

| Adım | Araç | Otomasyon |
|---|---|---|
| Konu araştırması | Claude + WebSearch | ✅ Tam otomatik |
| Senaryo | Claude | ✅ Otomatik (editoryal onay şart) |
| Storyboard | Claude → JSON sahne planı | ✅ Otomatik |
| Seslendirme | Kokoro / Piper CLI | ✅ Tam otomatik |
| Zaman kodu | faster-whisper (kelime bazlı) | ✅ Tam otomatik |
| Görsel / ikon | Claude → SVG; stok için Pexels/Unsplash API | ✅ Kod-görsel otomatik |
| Animasyon | Remotion / Manim | ✅ Claude kodu yazar |
| Render | `remotion render` / `manim` / `blender -b` | ✅ Tam otomatik |
| Kurgu + ses mix | FFmpeg script (`loudnorm` → −14 LUFS) | ✅ Tam otomatik |
| Altyazı | whisper → SRT | ✅ Tam otomatik |
| Thumbnail | Remotion `renderStill` / Playwright + HTML | ✅ Tam otomatik |
| Başlık / açıklama / etiket | Claude | ✅ Otomatik |
| Yükleme | YouTube Data API v3 (ücretsiz) | ✅ Otomatik — kota: 10.000 birim/gün, yükleme 1.600 birim = **max 6 video/gün** |
| **Sanatsal karar / kalite kontrolü** | — | ❌ **MANUEL — ve bu iyi bir şey** (bkz. bölüm 5.1) |

### 90 günlük plan

- **Ay 1:** Remotion + Manim ile 4 video. Amaç para değil, **tekrarlanabilir şablon** kurmak.
- **Ay 2:** Şablonu sadeleştir, video başına süreyi 2 güne indir. Paralelde Godot kur, Claude ile ilk 2D prototipi yaz + screenshot geri besleme döngüsünü kur.
- **Ay 3:** İlk oyunu **itch.io'da ücretsiz** yayınla (Steam'in $100'ünü ancak itch'te ilgi kanıtlandıktan sonra harca). Video üretimini haftalık ritme oturt.

---

*Bu rapor 6 paralel araştırma ajanının bulgularının sentezidir. Doğrulanmamış olarak işaretlenen kalemler: Claude Max saat/token limit rakamları (Anthropic resmî yayınlamıyor — `/usage` tek doğru kaynak), Figma Dev Mode ücretsiz erişimi, ComfyUI MCP olgunluğu.*

---

# EK: İçerik Kararı (Adım B)

**Seçilen yön:** İngilizce, bilim/matematik açıklayıcı kanal, gelir hedefli, Manim + Remotion ile.

## B.1 En önemli düzeltme: "bilim explainer" kategorinin en düşük ödeyen ucu

300 kanalın gerçek YouTube Analytics verisiyle yapılan çalışmada **Education & Science, 13 niş içinde en yüksek ödeyen kategori: medyan RPM $10,22** (tüm-niş medyanı ~$2,30). Ama kategori içi dağılım çok geniş:

| Alt-niş | RPM |
|---|---|
| Yazılım & teknoloji | $20–40 |
| Kantitatif finans / yatırım matematiği | $10–25 (ABD $28–40) |
| Mühendislik matematiği / sinyal & kontrol | ~$15–25 |
| Eğitim (sınav, sertifika, dil) | $7–11 |
| **Bilim explainer (genel: fizik/uzay/biyoloji)** | **$5–9** |

Yani "fizik/uzay/biyoloji" seçmek, "mühendislik matematiği / algoritma" seçmeye kıyasla **aynı izlenmeyle 3–4 kat az para** demek. Üstüne, genel bilim tam olarak devlerin (3Blue1Brown 6,3M, Veritasium, Kurzgesagt) bölgesi.

**Doygunluk "bilim" başlığında var, teknik derinlikte yok.** Boşluk: profesyonel/uygulamalı matematik — arama talebi yüksek, arz düşük, RPM 2–4 kat fazla.

## B.2 Aday alt-nişler

| # | Alt-niş | RPM | Rekabet | İlk video fikirleri |
|---|---|---|---|---|
| 1 | Kantitatif finans matematiği | $10–25 | Orta | Black-Scholes sezgisel türetimi · Kelly Criterion neden yarısını oynatır · Neden log-getiri · Sharpe oranının yalanı |
| 2 | **Mühendislik matematiği / sinyal & kontrol** | $15–25 | **Çok düşük** | Kalman filtresi cebirsiz · PID neden 3 terim · Laplace dönüşümü aslında ne yapar · Nyquist neden 2× · Convolution'ın görsel anlamı |
| 3 | **Algoritma & CS içselleri** | $18–25 | Düşük | Hash table çarpışmaları · Neden quicksort pratikte kazanır · B-tree'ler ve disk · Dijkstra'dan A*'a · Bloom filter sezgisi |
| 4 | Uygulamalı istatistik / veri okuryazarlığı | $7–15 | Düşük-orta | p-hacking görsel · A/B testinde kaç örneklem · Bayes tıbbi testlerle · Güven aralığı ne demez · Simpson paradoksu |
| 5 | Makine öğrenmesi matematiği | $18–25 | Yüksek | Attention'ın matrisi · Backprop zincir kuralı · Neden softmax · Diffusion'da gürültü matematiği · Embedding geometrisi |

**Kaçınılacak:** genel fizik / uzay / biyoloji / kimya — hem en düşük RPM hem devlerin bölgesi.

## B.3 Seslendirme kararı: kendi sesin (AI değil)

- AI sesle büyümüş, doğrulanabilir tek bir bilim kanalı örneği bulunamadı. Bulunan tüm 300k+ açıklayıcı kanallar insan sesli.
- Kokoro'nun prozodi hataları teknik terimlerde (*eigenvalue*, *Euler*, *asymptote*) izleyiciye "konuyu bilmiyor" hissi veriyor. Matematik kanalında manuel fonem düzeltmesi ciddi iş yükü.
- **Aksan bu nişte dezavantaj değil, otorite sinyali:** Sabine Hossenfelder (~1,7M), PBS Space Time (~3M), Mathologer (~957K), Artem Kirsanov (~350K) — hepsi belirgin aksanlı.
- Sıfır bütçeli kayıt: eldeki mikrofon + akustik köşe (dolap/battaniye) + Claude'un yazdığı FFmpeg zinciri (gürültü azaltma, EQ, `loudnorm` −14 LUFS). Script'i yaz ve **oku**, doğaçlama yapma.
- Monetizasyon riski düşük: "inauthentic content" politikası AI sesi değil, (1) senin yazmadığın metnin okunmasını, (2) videolar arası şablon tekrarını, (3) gerçek kişiyi taklit eden AI persona'ları yasaklıyor.

## B.4 Format spesifikasyonu

| Parametre | Karar | Gerekçe |
|---|---|---|
| Uzunluk | **8–14 dk** | Eğitimde optimum 10–15 dk; 8 dk mid-roll reklam eşiği — altına inme |
| Sıklık | 2–4 video/ay | Ayda 12+ yükleyenler %66 daha fazla abone alıyor; bu avantajı kaybediyoruz, kaliteyle telafi |
| İlk 6 video | **Arama odaklı** ("Why does X work?") | Arama trafiği abone sayısına bağlı değil — yeni kanalın tek öngörülebilir girişi |
| Video 7–10 | Hibrit (arama + merak kancası) | Browse/Suggested'a geçiş |
| Yapı | **Seri** (4–6 bölüm, playlist + end screen) | 2026'nın en ağır sinyali *session watch time*; seri bunu doğrudan besler |
| Shorts | Sadece abone toplamak için, uzun videodan 40 sn kesit | Shorts izlenmesi 4.000 saate **sayılmıyor** |
| API otomasyonu | Şimdilik hayır | Haftada 1 video için OAuth uğraşı manuel yüklemeye değmez |
| Test & Compare | 6. aydan sonra | Yeni kanalda gösterim hacmi yetersiz, sonuç istatistiksel gürültü |

**2026'nın yeni metriği — "New Viewer Attraction":** kanalı hiç izlememiş kişileri getiren videolar ödüllendiriliyor; soğuk kitleden gelen CTR, abone CTR'ından daha ağır sayılıyor. Düşük performanslı video kanalı cezalandırmıyor — sadece o videonun dağıtımı duruyor. İlk 10 video "deneme hakkı".

## B.5 Dürüst 12 ay tahmini

Asıl eşik abone değil izlenme: 10 dk video, %40 retention → izleyici başına 4 dk → **4.000 saat ≈ 60.000 izlenme.**

| Senaryo | Olasılık | 12. ay sonu |
|---|---|---|
| Kötü | %30 | <500 abone, YPP yok, **$0** |
| Baz | %50 | 1.000–4.000 abone, YPP ~10–14. ay, **$300–1.200** + Patreon $30–80/ay |
| İyi (1 breakout) | %20 | 10.000–30.000 abone, **$3.000–8.000** + ilk sponsor |

Beklenen değer ~**$800–2.000 / 12 ay**, karşılığında ~30 video × 30 saat = **900 saat**. Saatlik ~$1–2.

**Bu iş 12 ayda gelir işi değil, 2–3. yılda gelir işi.**

### AdSense dışı gelir sıralaması (en erken → en geç)
1. **Patreon / üyelik** — en erken. Bir patron ≈ yıllık 400+ gündelik izleyiciye eşdeğer. Genişletilmiş YPP katmanı: 500 abone + 90 günde 3 video + 3.000 izlenme saati.
2. **Affiliate** — abone sayısından bağımsız, hemen başlar, düşük hacim.
3. **Sponsorluk** — eğitim CPM'i $20–40, gerçekçi eşik video başına istikrarlı 20–30K izlenme (~30–50K abone). 12 ayda muhtemelen ulaşılmaz.
4. **Kurs satışı** — en yüksek marj, en geç.

## B.6 Stratejik sonuç: kanal aynı zamanda portföy olmalı

Araştırmanın gelir sıralamasında **freelance/sözleşmeli iş 1. sırada, oyun satışı sonuncu.** YouTube arada. Bu üçünü tek hamlede birleştirmenin yolu, alt-niş seçiminde: **mühendislik matematiği veya algoritma** içeriği ürettiğinde, ürettiğin her video aynı zamanda "bu kişi bu konuyu biliyor ve anlatabiliyor" kanıtı olur. Kanal yavaş büyürken portföy hemen çalışmaya başlar.

Genel fizik/uzay içeriğinin böyle bir ikinci getirisi yok.
