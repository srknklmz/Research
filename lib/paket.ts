import { db } from './db'

/** Fatura + bağlı irsaliyeler + onay geçmişi: imza, detay ve çıktı için. */
export async function paketGetir(faturaId: number) {
  return db.fatura.findUnique({
    where: { id: faturaId },
    include: {
      firma: true,
      belge: true,
      giren: { select: { ad: true } },
      gonderim: true,
      eslesmeler: {
        orderBy: { irsaliyeId: 'asc' },
        include: {
          irsaliye: {
            include: {
              firma: { select: { ad: true } },
              belge: true,
              kalemler: { orderBy: { sira: 'asc' } },
            },
          },
        },
      },
      onaylar: { orderBy: { tarih: 'asc' } },
    },
  })
}

export type Paket = NonNullable<Awaited<ReturnType<typeof paketGetir>>>

/** Bağlı irsaliyelerin kalem toplamı (KDV hariç). */
export function paketToplami(paket: Paket): number {
  return paket.eslesmeler.reduce(
    (t, e) =>
      t + e.irsaliye.kalemler.reduce((k, s) => k + Number(s.toplam ?? 0), 0),
    0,
  )
}
