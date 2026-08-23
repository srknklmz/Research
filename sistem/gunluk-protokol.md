# Günlük Protokol

İki otomatik tur var. İkisi de **kalıcı bir oturuma bağlı** çalışır; depo o
oturumda zaten bağlıdır ve yazma yetkisi vardır.

Yine de tek güvenilir bilgi kaynağı **depodaki dosyalardır**. Oturum bağlamı
bir gün kaybolabilir (kapsayıcı yenilenir, oturum arşivlenir); dosyaya
yazılmayan iş yok sayılır.

## 09:00 — Araştırma turu

1. `CLAUDE.md` + tüm `hedefler/*.md` dosyalarını oku.
2. `durum: aktif` hedefleri al. Her biri için bir açık soru ya da
   doğrulanmamış varsayım seç. Öncelik sırası:
   - cevabı hedefi en çok değiştirecek soru,
   - en uzun süredir `son_hareket` almamış hedef.
3. Seçilen her soru için web araması yap. Tek bir arama yeterli değil —
   en az şu açılardan bak: birincil kaynak, sayısal veri, karşı görüş,
   bu işi zaten yapan biri.
4. `sistem/kaynak-defteri.md`'yi kontrol et. Daha önce işlenen kaynağı tekrar
   veri yapma; yeni bir yönü varsa mevcut kartı güncelle.
5. Bulguları `CLAUDE.md` Mod B adımlarıyla işle (derinleştir → eşleştir → yaz).
6. Hedef kartlarını güncelle: varsayım durumları, açık soru kutuları,
   `son_hareket`, bağlı veriler tablosu.
7. `veri/indeks.md` ve `sistem/kaynak-defteri.md` satırlarını ekle.
8. **`python3 araclar/derle.py` çalıştır** — mobil uygulamanın okuduğu
   `uygulama/data.json` yeniden üretilsin. Bu adım atlanırsa telefonda
   dünkü veri görünür.
9. Commit + push.

**Ağ kısıtı:** Bu ortamda `WebFetch` çoğu alan adında `EGRESS_BLOCKED`
döner; yalnızca `WebSearch` güvenilir biçimde çalışır. Yani derinleşme adımı
arama özetleriyle sınırlı. Bunun sonucu: kaynak sayfasını doğrudan okuyamadığın
bir iddiayı `güven: yüksek` işaretleme. Bir kaynağın tam metni gerçekten
gerekliyse raporda kullanıcıdan yapıştırmasını iste.

**Yeni bir şey bulunamazsa:** rapor doldurmak için zayıf bulguyu veri diye
sunma. `sistem/arastirma-gunlugu.md` dosyasına "şu sorular arandı, yeni bir şey
çıkmadı" satırı düş. 10:00 raporu bunu okuyup dürüstçe yazacak.

## 10:00 — Günlük rapor

1. `CLAUDE.md` + hedefler + `veri/indeks.md` + son 24 saatin git log'unu oku.
2. `sistem/sablonlar/rapor.md` şablonuyla `raporlar/YYYY-AA-GG.md` yaz.
3. Öneri bölümünde en fazla 3 madde; her biri somut eylem + neden şimdi.
   "Araştırmaya devam edelim" türü genel tavsiye yazma.
4. **`python3 araclar/derle.py` çalıştır** — rapor uygulamada görünsün.
5. Commit + push, sonra raporu kullanıcıya ilet.

## Kural: sessiz gün yoktur

Hiçbir şey olmadıysa bile rapor gelir ve "şu sorularda arandı, yeni bir şey
çıkmadı, hedefler şu durumda" der. Boş rapor, rapor gelmemesinden iyidir —
sistemin çalıştığını gösterir.

---

## Kurulu tetikleyiciler

Saat dilimi: **Türkiye (UTC+3)**. Cron ifadeleri UTC yazılır.

| Tur | Yerel saat | Cron (UTC) | Tetikleyici kimliği | Bildirim |
|---|---|---|---|---|
| Otonom araştırma | 09:00 | `0 6 * * *` | `trig_01PRJ5djsYqoyoZmDckZeYUv` | yok |
| Günlük rapor | 10:00 | `0 7 * * *` | `trig_01E4ysakB92xzbP9DKAM7SCX` | yok (aşağıya bak) |

İkisi de `persistent_session_id` ile kalıcı bir oturuma bağlıdır.

Kurallar:

- Her tur işini `main`'e commit'leyip push'lamak **zorundadır**. Push edilmeyen
  iş ertesi gün yok sayılır.
- Sistem dosyaları `main`'de durmalı.

## Neden kalıcı oturum — 2026-08-23 arızası

İlk kurulumda turlar `create_new_session_on_fire` ile her sabah **yeni bir
oturum** açıyordu. 22 ve 23 Ağustos'ta dört tur tetiklendi, **hiçbiri depoya
tek satır yazamadı.**

Sebep: tetikleyicinin açtığı oturuma depo bir kaynak olarak bağlanmıyor.
Oturumun `session_context` alanında `sources` yok — yani depoyu yazma
yetkisiyle görmüyor. Elle ateşlenen bir test turu 7,5 dakika çalıştı, 1,64
dolar harcadı ve çıktısı buharlaştı.

Çözüm: turlar depo bağlı, push yetkisi kanıtlı bir oturuma bağlandı.

**Bunun bedeli:** Kalıcı oturuma bağlı tetikleyiciler telefon bildirimi
gönderemiyor (sunucu `notifications` alanını reddediyor). Rapor artık bağlı
oturuma düşüyor.

**Bildirimi geri açmak için:** claude.ai/code'da bu ortama (`env_017mKQ…`)
`srknklmz/Research` deposunu bağla. O zaman yeni oturumlar depoyu hazır bulur;
tetikleyiciler `create_new_session_on_fire: true` + `notifications: {push:true}`
ile yeniden kurulabilir.

Tetikleyicileri değiştirmek için: saat/prompt için `update_trigger`, kapatmak
için `enabled: false`, silmek için `delete_trigger`. Hedef oturumu değiştirmek
`update_trigger` ile yapılamaz — silip yeniden kurmak gerekir.
