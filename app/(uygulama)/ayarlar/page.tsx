import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { zaman } from '@/lib/bicim'
import { ayarlar } from '@/lib/ayar'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { ROL_ADI } from '@/lib/yetki'
import {
  AyarFormu,
  KullaniciEkleFormu,
  ParolaFormu,
  ParolaSifirlaFormu,
} from './Formlar'
import {
  ayarlariKaydet,
  kullaniciDurumDegistir,
  kullaniciEkle,
  parolaSifirla,
  parolamiDegistir,
} from './eylemler'

export default async function Ayarlar() {
  const kullanici = await gerekliKullanici()
  const yonetici = kullanici.rol === 'YONETICI'

  const [ayar, kullanicilar, firmaSayisi, sonIslemler] = await Promise.all([
    ayarlar(),
    yonetici
      ? db.kullanici.findMany({ orderBy: [{ aktif: 'desc' }, { ad: 'asc' }] })
      : Promise.resolve([]),
    yonetici ? db.firma.count() : Promise.resolve(0),
    yonetici
      ? db.islem.findMany({
          take: 25,
          orderBy: { tarih: 'desc' },
          include: { kullanici: { select: { ad: true } } },
        })
      : Promise.resolve([]),
  ])

  return (
    <>
      <Baslik
        baslik="Ayarlar"
        aciklama={yonetici ? `${firmaSayisi} firma kayıtlı` : undefined}
      />

      <div className="flex flex-col gap-6 p-6">
        <section className="kart p-4">
          <h2 className="mb-3 text-sm font-semibold">Parolam</h2>
          <ParolaFormu eylem={parolamiDegistir} />
        </section>

        {yonetici ? (
          <>
            <section className="kart p-4">
              <h2 className="mb-3 text-sm font-semibold">Şirket bilgileri</h2>
              <div className="max-w-md">
                <AyarFormu eylem={ayarlariKaydet} baslangic={ayar} />
              </div>
            </section>

            <section className="kart p-4">
              <h2 className="mb-3 text-sm font-semibold">Yeni kullanıcı</h2>
              <KullaniciEkleFormu
                eylem={kullaniciEkle}
                roller={Object.entries(ROL_ADI)}
              />
            </section>

            <section className="kart">
              <div className="border-b border-cizgi px-4 py-3 text-sm font-medium">
                Kullanıcılar ({kullanicilar.length})
              </div>
              <div className="overflow-x-auto">
                <table className="tablo">
                  <thead>
                    <tr>
                      <th>Ad</th>
                      <th>E-posta</th>
                      <th className="w-36">Rol</th>
                      <th className="w-24">Durum</th>
                      <th className="w-72">Parola sıfırla</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kullanicilar.map((k) => (
                      <tr key={k.id}>
                        <td className="font-medium">{k.ad}</td>
                        <td className="text-soluk">{k.eposta}</td>
                        <td>{ROL_ADI[k.rol]}</td>
                        <td>
                          {k.aktif ? (
                            <Rozet renk="yesil">aktif</Rozet>
                          ) : (
                            <Rozet renk="kirmizi">kapalı</Rozet>
                          )}
                        </td>
                        <td>
                          <ParolaSifirlaFormu
                            eylem={parolaSifirla.bind(null, k.id)}
                          />
                        </td>
                        <td className="text-right">
                          {k.id === kullanici.id ? (
                            <span className="text-xs text-soluk">siz</span>
                          ) : (
                            <form action={kullaniciDurumDegistir.bind(null, k.id)}>
                              <button
                                className="dugme-ikincil text-xs"
                                type="submit"
                              >
                                {k.aktif ? 'Kapat' : 'Aç'}
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="kart">
              <div className="border-b border-cizgi px-4 py-3 text-sm font-medium">
                İşlem günlüğü
              </div>
              <div className="overflow-x-auto">
                <table className="tablo">
                  <thead>
                    <tr>
                      <th className="w-44">Zaman</th>
                      <th className="w-40">Kullanıcı</th>
                      <th className="w-40">İşlem</th>
                      <th>Nesne</th>
                      <th className="w-32">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonIslemler.map((i) => (
                      <tr key={i.id}>
                        <td className="tabular-nums">{zaman(i.tarih)}</td>
                        <td>{i.kullanici?.ad ?? '—'}</td>
                        <td>{i.tur}</td>
                        <td className="text-soluk">
                          {i.nesne}
                          {i.nesneId ? ` #${i.nesneId}` : ''}
                        </td>
                        <td className="text-soluk">{i.ip ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  )
}
