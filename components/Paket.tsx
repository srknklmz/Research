import { para, sayi, tarih, zaman } from '@/lib/bicim'
import { ONAY_TIP_ADI } from '@/lib/durum'
import type { Paket } from '@/lib/paket'
import { paketToplami } from '@/lib/paket'
import { ROL_ADI } from '@/lib/yetki'

/** Faturaya bağlı irsaliyelerin kalem dökümü. */
export function PaketIrsaliyeleri({ paket }: { paket: Paket }) {
  const toplam = paketToplami(paket)

  if (paket.eslesmeler.length === 0) {
    return (
      <section className="kart p-4">
        <h2 className="text-sm font-semibold">İrsaliyeler</h2>
        <p className="mt-2 text-sm text-soluk">
          {paket.irsaliyesiz
            ? 'Bu fatura irsaliyesiz olarak işaretlendi (malzeme teslimi yok).'
            : 'Henüz irsaliye bağlanmadı.'}
        </p>
      </section>
    )
  }

  return (
    <section className="kart">
      <div className="flex items-baseline justify-between border-b border-cizgi px-4 py-3">
        <h2 className="text-sm font-semibold">
          Bağlı irsaliyeler ({paket.eslesmeler.length})
        </h2>
        <span className="text-sm text-soluk">
          Kalem toplamı {para(toplam)} · KDV dahil {para(toplam * 1.2)}
        </span>
      </div>

      <div className="divide-y divide-cizgi">
        {paket.eslesmeler.map((e) => {
          const i = e.irsaliye
          const it = i.kalemler.reduce((t, k) => t + Number(k.toplam ?? 0), 0)
          return (
            <div key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">
                    İrsaliye {i.no ?? '(no yok)'}
                  </span>
                  <span className="ml-2 text-soluk tabular-nums">
                    {tarih(i.tarih)}
                  </span>
                  {i.cari ? (
                    <span className="ml-2 text-soluk">· {i.cari}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-sm tabular-nums">
                  {it ? para(it) : '—'}
                  {i.belge ? (
                    <a
                      className="yazdirma-gizle text-xs text-vurgu underline"
                      href={`/belge/${i.belge.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      belge
                    </a>
                  ) : null}
                </div>
              </div>

              <table className="tablo mt-2">
                <thead>
                  <tr>
                    <th>Malzeme</th>
                    <th className="w-28 text-right">Miktar</th>
                    <th className="w-20">Birim</th>
                    <th className="w-28 text-right">Birim fiyat</th>
                    <th className="w-28 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {i.kalemler.map((k) => (
                    <tr key={k.id}>
                      <td>{k.malzeme}</td>
                      <td className="text-right tabular-nums">{sayi(k.miktar)}</td>
                      <td className="text-soluk">{k.birim}</td>
                      <td className="text-right tabular-nums">
                        {k.birimFiyat ? para(k.birimFiyat) : '—'}
                      </td>
                      <td className="text-right tabular-nums">
                        {k.toplam ? para(k.toplam) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** İmza ve onay geçmişi — silinmez denetim izi. */
export function OnayGecmisi({ paket }: { paket: Paket }) {
  if (paket.onaylar.length === 0) {
    return (
      <section className="kart p-4">
        <h2 className="text-sm font-semibold">Onay geçmişi</h2>
        <p className="mt-2 text-sm text-soluk">Henüz imza ya da onay yok.</p>
      </section>
    )
  }

  return (
    <section className="kart p-4">
      <h2 className="mb-3 text-sm font-semibold">Onay geçmişi</h2>
      <ol className="flex flex-col gap-3">
        {paket.onaylar.map((o) => (
          <li
            key={o.id}
            className="border-l-2 border-cizgi pl-3 text-sm"
            style={{
              borderColor:
                o.tip === 'RED' || o.tip === 'MERKEZ_RED'
                  ? 'var(--color-red)'
                  : 'var(--color-onayli)',
            }}
          >
            <div className="font-medium">{ONAY_TIP_ADI[o.tip]}</div>
            <div className="text-soluk">
              {o.kullaniciAd} ({ROL_ADI[o.kullaniciRol]}) · {zaman(o.tarih)}
            </div>
            {o.not ? <p className="mt-1">{o.not}</p> : null}
            <div className="mt-1 font-mono text-[11px] break-all text-soluk">
              parmak izi {o.ozet.slice(0, 32)}…
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
