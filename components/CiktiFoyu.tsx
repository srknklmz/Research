import { para, sayi, tarih, zaman } from '@/lib/bicim'
import { ONAY_TIP_ADI } from '@/lib/durum'
import type { Paket } from '@/lib/paket'
import { paketToplami } from '@/lib/paket'
import { ROL_ADI } from '@/lib/yetki'

/**
 * Müşavire iletilen tek fatura föyü: fatura, kapsadığı irsaliyeler ve
 * imza/onay kayıtları tek sayfada.
 */
export function CiktiFoyu({
  paket,
  sirketAdi,
  santiyeAdi,
}: {
  paket: Paket
  sirketAdi: string
  santiyeAdi: string
}) {
  const toplam = paketToplami(paket)
  const imza = paket.onaylar.filter((o) => o.tip === 'IMZA').at(-1)
  const merkez = paket.onaylar.filter((o) => o.tip === 'MERKEZ_ONAY').at(-1)

  return (
    <article className="kagit-sayfa mb-8 rounded-lg border border-cizgi bg-yuzey p-8">
      <header className="mb-5 flex items-start justify-between border-b-2 border-metin pb-3">
        <div>
          <div className="text-base font-bold tracking-tight">{sirketAdi}</div>
          <div className="text-sm text-soluk">{santiyeAdi}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tracking-wide uppercase">
            İrsaliye–Fatura Onay Föyü
          </div>
          <div className="text-xs text-soluk">
            {paket.gonderim ? `Gönderim ${paket.gonderim.no} · ` : ''}
            Föy no: F-{String(paket.id).padStart(5, '0')}
          </div>
        </div>
      </header>

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-semibold tracking-wide uppercase">
          Fatura
        </h2>
        <table className="tablo">
          <tbody>
            <tr>
              <td className="w-32 text-soluk">Fatura no</td>
              <td className="font-semibold">{paket.no}</td>
              <td className="w-24 text-soluk">Tarih</td>
              <td className="w-32 tabular-nums">{tarih(paket.tarih)}</td>
            </tr>
            <tr>
              <td className="text-soluk">Firma</td>
              <td>{paket.firma.ad}</td>
              <td className="text-soluk">Tutar</td>
              <td className="font-semibold tabular-nums">{para(paket.tutar)}</td>
            </tr>
            <tr>
              <td className="text-soluk">Kategori</td>
              <td>{paket.kategori ?? '—'}</td>
              <td className="text-soluk">Ödeme</td>
              <td>{paket.odeme ?? '—'}</td>
            </tr>
            {paket.aciklama ? (
              <tr>
                <td className="text-soluk">Açıklama</td>
                <td colSpan={3}>{paket.aciklama}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-semibold tracking-wide uppercase">
          Kapsadığı irsaliyeler
        </h2>

        {paket.eslesmeler.length === 0 ? (
          <p className="text-sm">
            {paket.irsaliyesiz
              ? 'Bu fatura irsaliyesizdir (malzeme teslimi yoktur).'
              : 'Bağlı irsaliye yok.'}
          </p>
        ) : (
          <>
            {paket.eslesmeler.map((e) => {
              const i = e.irsaliye
              const it = i.kalemler.reduce((t, k) => t + Number(k.toplam ?? 0), 0)
              return (
                <div key={e.id} className="mb-3">
                  <div className="mb-1 flex justify-between text-sm font-medium">
                    <span>
                      İrsaliye {i.no ?? '(no yok)'} · {tarih(i.tarih)}
                      {i.cari ? ` · ${i.cari}` : ''}
                    </span>
                    <span className="tabular-nums">{it ? para(it) : '—'}</span>
                  </div>
                  <table className="tablo">
                    <thead>
                      <tr>
                        <th>Malzeme</th>
                        <th className="w-24 text-right">Miktar</th>
                        <th className="w-16">Birim</th>
                        <th className="w-24 text-right">B. fiyat</th>
                        <th className="w-28 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {i.kalemler.map((k) => (
                        <tr key={k.id}>
                          <td>{k.malzeme}</td>
                          <td className="text-right tabular-nums">
                            {sayi(k.miktar)}
                          </td>
                          <td>{k.birim}</td>
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

            <div className="mt-2 flex justify-end gap-8 border-t border-metin pt-2 text-sm">
              <span className="text-soluk">İrsaliye kalem toplamı</span>
              <span className="font-semibold tabular-nums">{para(toplam)}</span>
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-6 border-t border-cizgi pt-4">
        {[
          { baslik: 'Şantiye — idari müdür', onay: imza },
          { baslik: 'Merkez — muhasebe', onay: merkez },
        ].map((k) => (
          <div key={k.baslik}>
            <div className="text-xs font-semibold tracking-wide uppercase">
              {k.baslik}
            </div>
            {k.onay ? (
              <div className="mt-1 text-sm">
                <div className="font-medium">{k.onay.kullaniciAd}</div>
                <div className="text-soluk">
                  {ROL_ADI[k.onay.kullaniciRol]} · {zaman(k.onay.tarih)}
                </div>
                <div className="mt-1 text-[10px] break-all text-soluk">
                  {ONAY_TIP_ADI[k.onay.tip]} · parmak izi {k.onay.ozet}
                </div>
                {k.onay.not ? (
                  <div className="mt-1 text-xs">Not: {k.onay.not}</div>
                ) : null}
              </div>
            ) : (
              <div className="mt-1 text-sm text-soluk">
                Onay yok
                <div className="mt-6 border-t border-metin pt-1 text-xs">
                  imza
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <footer className="mt-4 border-t border-cizgi pt-2 text-[10px] text-soluk">
        Bu föy uygulamadan üretilmiştir. Onay kayıtları kullanıcı, tarih–saat ve
        içerik parmak izi ile birlikte saklanır; sonradan değiştirilemez.
      </footer>
    </article>
  )
}
