# Beyin Sistemi

Hedeflerimi takip eden, öğrendiğim her yeni bilgiyi bu hedeflerle eşleştiren ve
her gün kendi başına araştırma yapıp rapor üreten bir ikinci beyin.

## Döngü

```
   Ben bir proje anlatırım
            ↓
     [ hedefler/ ]  ← hedef noktaları, varsayımlar, açık sorular
            ↓
   ┌────────┴─────────┐
   │                  │
Ben bilgi          Claude 09:00'da
paylaşırım        kendi araştırır
   │                  │
   └────────┬─────────┘
            ↓
      derinleştirme  ← doğrula, mekanizmayı çöz, karşı görüşü bul
            ↓
      eşleştirme     ← hangi hedefe, ne türde dokunuyor?
            ↓
   eşleşti mi? ──hayır──→ [ arsiv/ ]
            │ evet
            ↓
       [ veri/ ]
            ↓
   10:00 → [ raporlar/ ]  → bana iletilir
```

## Klasörler

- **`hedefler/`** — hedef kartları. Her birinde varsayımlar ve açık sorular var;
  günlük araştırma bunlardan beslenir.
- **`ham/`** — paylaştığım işlenmemiş bilgi.
- **`veri/`** — işlenmiş ve en az bir hedefle eşleşmiş bilgi.
- **`arsiv/`** — işlendi ama eşleşmedi. Yeni hedef açılınca yeniden taranır.
- **`raporlar/`** — günlük raporlar.
- **`sistem/`** — şablonlar, kaynak defteri, protokol.

## Kullanım

| Ne yapmak istiyorum | Ne yazarım |
|---|---|
| Yeni proje/hedef tanımlamak | "Şöyle bir proje düşünüyorum: …" |
| Öğrendiğim bir şeyi eklemek | "Şunu öğrendim: …" (link ya da not) |
| Durumu görmek | "Durum ne?" |
| Rapor istemek | "Rapor ver" |
| Hedefi değiştirmek | "H-02'yi şöyle güncelle: …" |

## Mobil uygulama

`uygulama/` klasöründe kurulabilir bir PWA var — tasarım yönü **Cetvel**.
Markdown kartlarını doğrudan okumaz; `araclar/derle.py` onları
`uygulama/data.json` dosyasına derler ve uygulama onu okur.

Yayın: Vercel'e bağlıdır, `main` dalına her push'ta kendiliğinden güncellenir.
Kurulum adımları `uygulama/README.md` dosyasında.

## Klasör haritası

| Klasör | İçerik |
|---|---|
| `hedefler/` `veri/` `ham/` `arsiv/` `raporlar/` | Beyin sisteminin kendisi |
| `uygulama/` | Mobil arayüz (PWA) |
| `araclar/` | Derleme betikleri |
| `tasarim/` | Arayüz tercihleri, tasarım yönleri, önizleme |
| `sistem/` | Şablonlar, protokol, kaynak defteri |

Çalışma kuralları `CLAUDE.md` dosyasında. Günlük otomatik iş akışı
`sistem/gunluk-protokol.md` dosyasında.
