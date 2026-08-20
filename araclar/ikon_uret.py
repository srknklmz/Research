#!/usr/bin/env python3
"""Uygulama ikonlarını üretir — cetvel çentikleri motifi. Bağımlılık yok."""
import struct, zlib, os

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZEMIN = (0x14, 0x17, 0x1C)
CENTIK = (0xE9, 0xEB, 0xED)


def png_yaz(yol, boyut, dolgu_pay):
    """Kare PNG: koyu zemin, altta yükseklikleri değişen cetvel çentikleri."""
    w = h = boyut
    pay = int(boyut * dolgu_pay)
    ic = boyut - 2 * pay
    piksel = [[ZEMIN] * w for _ in range(h)]

    # 9 çentik; her 3'te bir uzun — gerçek bir cetvelin ritmi
    adet = 9
    aralik = ic / adet
    for i in range(adet):
        uzun = (i % 3 == 0)
        yuk = int(ic * (0.62 if uzun else 0.34))
        kal = max(2, int(boyut * (0.035 if uzun else 0.022)))
        x0 = int(pay + i * aralik + (aralik - kal) / 2)
        y1 = pay + ic
        for y in range(y1 - yuk, y1):
            for x in range(x0, min(x0 + kal, w)):
                piksel[y][x] = CENTIK

    # üst kenarda ölçek çizgisi
    cizgi_y = pay + int(ic * 0.14)
    for x in range(pay, pay + ic):
        for y in range(cizgi_y, cizgi_y + max(2, int(boyut * 0.016))):
            piksel[y][x] = CENTIK

    ham = b"".join(b"\x00" + b"".join(bytes(p) for p in satir) for satir in piksel)

    def parca(tip, veri):
        g = tip + veri
        return struct.pack(">I", len(veri)) + g + struct.pack(">I", zlib.crc32(g))

    png = (b"\x89PNG\r\n\x1a\n"
           + parca(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + parca(b"IDAT", zlib.compress(ham, 9))
           + parca(b"IEND", b""))
    with open(yol, "wb") as f:
        f.write(png)
    return len(png)


if __name__ == "__main__":
    d = os.path.join(KOK, "uygulama")
    os.makedirs(d, exist_ok=True)
    for boyut, pay, ad in ((192, 0.16, "ikon-192.png"),
                           (512, 0.16, "ikon-512.png"),
                           (512, 0.26, "ikon-maskable.png")):
        n = png_yaz(os.path.join(d, ad), boyut, pay)
        print(f"{ad}: {n} bayt")
