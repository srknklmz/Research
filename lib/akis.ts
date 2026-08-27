import { createHash } from 'node:crypto'
import { db } from './db'

/**
 * Eşleşme değiştiğinde faturanın durumunu tazeler.
 * İmzalanmış/onaylanmış faturalara dokunmaz — onların durumu ancak
 * imza geri alınarak değişir.
 */
export async function faturaDurumTazele(faturaId: number) {
  const fatura = await db.fatura.findUnique({
    where: { id: faturaId },
    select: {
      durum: true,
      irsaliyesiz: true,
      _count: { select: { eslesmeler: true } },
    },
  })
  if (!fatura) return
  // Reddedilen fatura düzeltilip yeniden eşleştirilebilir.
  if (!['YENI', 'ESLESTI', 'REDDEDILDI'].includes(fatura.durum)) return

  const hazir = fatura.irsaliyesiz || fatura._count.eslesmeler > 0
  const yeni = hazir ? 'ESLESTI' : 'YENI'
  if (yeni !== fatura.durum) {
    await db.fatura.update({ where: { id: faturaId }, data: { durum: yeni } })
  }
}

/**
 * İmza anında faturanın ve bağlı irsaliyelerin görüntüsünü çıkarır.
 * Bu anlık görüntü onay kaydında saklanır; sonradan bir şey değişirse
 * imzanın neyi kapsadığı belli olur.
 */
export async function anlikGoruntu(faturaId: number) {
  const f = await db.fatura.findUnique({
    where: { id: faturaId },
    include: {
      firma: { select: { ad: true } },
      eslesmeler: {
        include: {
          irsaliye: {
            include: {
              firma: { select: { ad: true } },
              kalemler: { orderBy: { sira: 'asc' } },
            },
          },
        },
      },
    },
  })
  if (!f) throw new Error('Fatura bulunamadı.')

  const goruntu = {
    fatura: {
      id: f.id,
      no: f.no,
      tarih: f.tarih.toISOString().slice(0, 10),
      firma: f.firma.ad,
      tutar: f.tutar.toString(),
      kategori: f.kategori,
      irsaliyesiz: f.irsaliyesiz,
    },
    irsaliyeler: f.eslesmeler
      .map((e) => ({
        id: e.irsaliye.id,
        no: e.irsaliye.no,
        tarih: e.irsaliye.tarih.toISOString().slice(0, 10),
        firma: e.irsaliye.firma.ad,
        kalemler: e.irsaliye.kalemler.map((k) => ({
          malzeme: k.malzeme,
          miktar: k.miktar.toString(),
          birim: k.birim,
          birimFiyat: k.birimFiyat?.toString() ?? null,
          toplam: k.toplam?.toString() ?? null,
        })),
      }))
      .sort((a, b) => a.id - b.id),
  }

  const ozet = createHash('sha256')
    .update(JSON.stringify(goruntu))
    .digest('hex')

  return { goruntu, ozet }
}

/** Gönderim numarası üretir: 2026-001, 2026-002 … */
export async function gonderimNoUret(): Promise<string> {
  const yil = new Date().getFullYear()
  const sonuncu = await db.gonderim.findFirst({
    where: { no: { startsWith: `${yil}-` } },
    orderBy: { no: 'desc' },
    select: { no: true },
  })
  const sira = sonuncu ? Number(sonuncu.no.split('-')[1]) + 1 : 1
  return `${yil}-${String(sira).padStart(3, '0')}`
}
