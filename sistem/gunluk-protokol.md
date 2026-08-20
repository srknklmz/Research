# Günlük Protokol

İki otomatik oturum var. İkisi de bu depoyu klonlayarak sıfırdan başlar, yani
tek bilgi kaynağı depodaki dosyalardır — önceki günün sohbeti hatırlanmaz.

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
8. Commit + push.

**Yeni bir şey bulunamazsa:** rapor doldurmak için zayıf bulguyu veri diye
sunma. `sistem/arastirma-gunlugu.md` dosyasına "şu sorular arandı, yeni bir şey
çıkmadı" satırı düş. 10:00 raporu bunu okuyup dürüstçe yazacak.

## 10:00 — Günlük rapor

1. `CLAUDE.md` + hedefler + `veri/indeks.md` + son 24 saatin git log'unu oku.
2. `sistem/sablonlar/rapor.md` şablonuyla `raporlar/YYYY-AA-GG.md` yaz.
3. Öneri bölümünde en fazla 3 madde; her biri somut eylem + neden şimdi.
   "Araştırmaya devam edelim" türü genel tavsiye yazma.
4. Commit + push, sonra raporu kullanıcıya ilet.

## Kural: sessiz gün yoktur

Hiçbir şey olmadıysa bile rapor gelir ve "şu sorularda arandı, yeni bir şey
çıkmadı, hedefler şu durumda" der. Boş rapor, rapor gelmemesinden iyidir —
sistemin çalıştığını gösterir.
