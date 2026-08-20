# Tasarım

Mobil arayüz tasarım süreci.

| Dosya | Ne işe yarar |
|---|---|
| `anket.html` | 50 soruluk arayüz tercih anketi. Tarayıcıda açılır, seçimler `localStorage`'a kaydedilir, altta kopyalanabilir cevap kodu üretir. |
| `tercihler.md` | Ankete verilen cevapların çözümü. Arayüz kararlarında bağlayıcı kaynak. |
| `tasarimlar.html` | Beş tasarım yönü (Defter · Kartoteka · Cetvel · Sessiz · Kesit), her biri üç ekranla. |

Cevap kodu biçimi: `1a 2a 3b …` — soru numarası + seçilen şık. Çoklu seçimli
soru birden fazla harf alır (`41ab`).
