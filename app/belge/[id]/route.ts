import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { depodanOku, imzaliBaglanti } from '@/lib/depo'
import { oturumKullanici } from '@/lib/oturum'

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await oturumKullanici())) {
    return new NextResponse('Yetkisiz', { status: 401 })
  }

  const { id } = await params
  const belge = await db.belge.findUnique({ where: { id: Number(id) } })
  if (!belge) return new NextResponse('Belge bulunamadı', { status: 404 })

  try {
    // Uzak depoda dosya, kısa ömürlü imzalı bağlantıyla doğrudan sunulur;
    // yetki kontrolü bu yönlendirmeden önce yapılmış olur.
    const baglanti = await imzaliBaglanti(belge.yol)
    if (baglanti) return NextResponse.redirect(baglanti)

    const veri = await depodanOku(belge.yol)
    return new NextResponse(new Uint8Array(veri), {
      headers: {
        'Content-Type': belge.mimeTur,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(belge.ad)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('belge sunumu:', e)
    return new NextResponse('Belge okunamadı', { status: 502 })
  }
}
