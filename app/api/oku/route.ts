import { NextResponse } from 'next/server'
import { oturumKullanici } from '@/lib/oturum'
import { belgeOku, okuyucuHazirMi } from '@/lib/okuyucu'

const AZAMI = 20 * 1024 * 1024

export async function POST(istek: Request) {
  const kullanici = await oturumKullanici()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 })

  if (!okuyucuHazirMi()) {
    return NextResponse.json(
      { hata: 'Belge okuma kapalı: sunucuda ANTHROPIC_API_KEY tanımlı değil.' },
      { status: 503 },
    )
  }

  const veri = await istek.formData()
  const dosya = veri.get('dosya')
  const tur = veri.get('tur') === 'fatura' ? 'fatura' : 'irsaliye'

  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: 'Dosya gerekli.' }, { status: 400 })
  }
  if (dosya.size > AZAMI) {
    return NextResponse.json({ hata: 'Dosya 20 MB sınırını aşıyor.' }, { status: 400 })
  }

  try {
    const sonuc = await belgeOku(dosya, tur)
    return NextResponse.json({ sonuc })
  } catch (e) {
    console.error('belge okuma:', e)
    return NextResponse.json(
      { hata: e instanceof Error ? e.message : 'Belge okunamadı.' },
      { status: 502 },
    )
  }
}
