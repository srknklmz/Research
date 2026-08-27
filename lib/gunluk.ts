import { db } from './db'
import { istekBilgisi } from './oturum'

/** İşlem günlüğüne kayıt düşer. Günlük yazımı asıl işlemi bozmamalı. */
export async function gunlukle(
  kullaniciId: number | null,
  tur: string,
  nesne: string,
  nesneId?: number,
  detay?: unknown,
) {
  try {
    const { ip } = await istekBilgisi()
    await db.islem.create({
      data: {
        kullaniciId,
        tur,
        nesne,
        nesneId,
        detay: detay === undefined ? undefined : (detay as never),
        ip,
      },
    })
  } catch (e) {
    console.error('gunlukle:', e)
  }
}
