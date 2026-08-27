import { db } from './db'

export type Aday = {
  id: number
  no: string | null
  tarih: Date
  cari: string | null
  toplam: number
  kalemSayisi: number
  ilkKalemler: string
  baskaFaturada: { id: number; no: string } | null
  puan: number
  gerekceler: string[]
}

const GERIYE_GUN = 120
const ILERI_GUN = 20

function gunFarki(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000
}

/** Metni numara karşılaştırması için sadeleştirir: boşluk/tire/nokta atar. */
function sadelestir(m: string): string {
  return m.toLocaleUpperCase('tr').replace(/[\s\-./_]/g, '')
}

/**
 * Bir faturaya bağlanabilecek irsaliyeleri bulur ve olabilirliğe göre
 * puanlar. Puan bir tahmindir; kararı kullanıcı verir.
 */
export async function adaylar(faturaId: number): Promise<{
  fatura: {
    id: number
    no: string
    tarih: Date
    tutar: number
    firmaId: number
    firmaAdi: string
    aciklama: string | null
  }
  secili: number[]
  liste: Aday[]
}> {
  const fatura = await db.fatura.findUnique({
    where: { id: faturaId },
    include: {
      firma: { select: { ad: true } },
      eslesmeler: { select: { irsaliyeId: true } },
    },
  })
  if (!fatura) throw new Error('Fatura bulunamadı.')

  const secili = fatura.eslesmeler.map((e) => e.irsaliyeId)
  const alt = new Date(fatura.tarih)
  alt.setDate(alt.getDate() - GERIYE_GUN)
  const ust = new Date(fatura.tarih)
  ust.setDate(ust.getDate() + ILERI_GUN)

  const irsaliyeler = await db.irsaliye.findMany({
    where: {
      firmaId: fatura.firmaId,
      OR: [{ tarih: { gte: alt, lte: ust } }, { id: { in: secili } }],
    },
    include: {
      kalemler: { select: { toplam: true, malzeme: true } },
      eslesmeler: {
        where: { faturaId: { not: faturaId } },
        include: { fatura: { select: { id: true, no: true } } },
      },
    },
    orderBy: { tarih: 'desc' },
    take: 300,
  })

  const faturaTutar = Number(fatura.tutar)
  const aciklamaSade = sadelestir(fatura.aciklama ?? '')

  const liste: Aday[] = irsaliyeler.map((i) => {
    const toplam = i.kalemler.reduce((t, k) => t + Number(k.toplam ?? 0), 0)
    const gerekceler: string[] = []
    let puan = 0

    if (i.no && aciklamaSade && aciklamaSade.includes(sadelestir(i.no))) {
      puan += 45
      gerekceler.push('Fatura açıklamasında bu irsaliye no geçiyor')
    }

    const fark = gunFarki(fatura.tarih, i.tarih)
    if (fark <= 45) {
      puan += 30 * (1 - fark / 45)
      gerekceler.push(
        fark < 1 ? 'Aynı gün' : `Fatura tarihine ${Math.round(fark)} gün`,
      )
    }

    if (toplam > 0 && faturaTutar > 0) {
      // İrsaliye tutarı çoğunlukla KDV hariç; her iki ihtimali de dene.
      const oranlar = [toplam, toplam * 1.2, toplam * 1.1].map((t) =>
        Math.min(t, faturaTutar) / Math.max(t, faturaTutar),
      )
      const enIyi = Math.max(...oranlar)
      if (enIyi > 0.8) {
        puan += 25 * ((enIyi - 0.8) / 0.2)
        if (enIyi > 0.985) gerekceler.push('Tutar faturayla örtüşüyor')
        else gerekceler.push('Tutar faturaya yakın')
      }
    }

    const baskaEslesme = i.eslesmeler[0]
    if (baskaEslesme) puan -= 20

    return {
      id: i.id,
      no: i.no,
      tarih: i.tarih,
      cari: i.cari,
      toplam,
      kalemSayisi: i.kalemler.length,
      ilkKalemler:
        i.kalemler
          .slice(0, 3)
          .map((k) => k.malzeme)
          .join(', ') + (i.kalemler.length > 3 ? ` +${i.kalemler.length - 3}` : ''),
      baskaFaturada: baskaEslesme
        ? { id: baskaEslesme.fatura.id, no: baskaEslesme.fatura.no }
        : null,
      puan: Math.round(Math.max(0, puan)),
      gerekceler,
    }
  })

  liste.sort((a, b) => {
    const aSecili = secili.includes(a.id) ? 1 : 0
    const bSecili = secili.includes(b.id) ? 1 : 0
    if (aSecili !== bSecili) return bSecili - aSecili
    return b.puan - a.puan
  })

  return {
    fatura: {
      id: fatura.id,
      no: fatura.no,
      tarih: fatura.tarih,
      tutar: faturaTutar,
      firmaId: fatura.firmaId,
      firmaAdi: fatura.firma.ad,
      aciklama: fatura.aciklama,
    },
    secili,
    liste,
  }
}
