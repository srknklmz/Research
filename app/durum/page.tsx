import { db } from '@/lib/db'
import { depoTuru, yuklemeSlotuAc } from '@/lib/depo'

export const dynamic = 'force-dynamic'

type Sonuc = { ad: string; iyi: boolean; not: string }

/**
 * Hata mesajından okunabilir tek satır çıkarır. Prisma mesajları boş satırla
 * başlayıp asıl sebebi sona koyduğu için son anlamlı satır alınır.
 */
function hataMetni(e: unknown): string {
  if (!(e instanceof Error)) return 'bilinmeyen hata'
  const satirlar = e.message
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith('Invalid `prisma'))
  return (satirlar.at(-1) ?? 'bilinmeyen hata').slice(0, 200)
}

/** Adres Supabase havuzuna mı bakıyor? */
function havuzMu(url: string): boolean {
  return url.includes('pooler.') || url.includes(':6543')
}

/** Değerleri değil, yalnızca tanımlı olup olmadığını bildirir. */
function varMi(ad: string): string | null {
  const d = process.env[ad]
  return d && d.trim() ? d : null
}

async function veritabani(): Promise<Sonuc> {
  try {
    const n = await db.kullanici.count()
    return {
      ad: 'Veritabanı',
      iyi: n > 0,
      not:
        n > 0
          ? `bağlantı tamam · ${n} kullanıcı kayıtlı`
          : 'bağlantı tamam ama hiç kullanıcı yok — kurulum SQL\'inin 2. parçası çalışmamış',
    }
  } catch (e) {
    return {
      ad: 'Veritabanı',
      iyi: false,
      not: hataMetni(e),
    }
  }
}

/** Vercel gibi sunucusuz bir ortamda mıyız? Bazı uyarılar yalnızca orada geçerli. */
const sunucusuz = process.env.VERCEL === '1'

async function depo(): Promise<Sonuc> {
  const tur = depoTuru()
  if (tur === 'yerel') {
    return {
      ad: 'Belge deposu',
      iyi: !sunucusuz,
      not: sunucusuz
        ? 'DEPO=yerel — sunucusuz ortamda dosyalar kalıcı olmaz, "supabase" olmalı'
        : 'DEPO=yerel — yerel diskte, bu ortam için uygun',
    }
  }
  try {
    await yuklemeSlotuAc()
    return { ad: 'Belge deposu', iyi: true, not: 'Supabase Storage erişilebilir, kova bulundu' }
  } catch (e) {
    return {
      ad: 'Belge deposu',
      iyi: false,
      not: hataMetni(e),
    }
  }
}

export default async function Durum() {
  const anahtar = varMi('OTURUM_ANAHTARI')
  const veri = varMi('DATABASE_URL')

  const kontroller: Sonuc[] = [
    {
      ad: 'OTURUM_ANAHTARI',
      iyi: Boolean(anahtar && anahtar.length >= 32),
      not: !anahtar
        ? 'tanımlı değil'
        : anahtar.length < 32
          ? `çok kısa (${anahtar.length} karakter, en az 32 olmalı)`
          : 'tanımlı',
    },
    {
      ad: 'DATABASE_URL',
      // pgbouncer uyarısı yalnızca havuz adresi kullanılıyorsa anlamlı.
      iyi: Boolean(veri && (!havuzMu(veri) || veri.includes('pgbouncer=true'))),
      not: !veri
        ? 'tanımlı değil'
        : !havuzMu(veri)
          ? 'doğrudan bağlantı'
          : veri.includes('pgbouncer=true')
            ? 'havuzlanmış bağlantı (pgbouncer=true)'
            : 'havuz adresi ama "?pgbouncer=true" yok — Prisma hazır ifade hatası verir',
    },
    {
      ad: 'DIRECT_URL',
      iyi: Boolean(varMi('DIRECT_URL')),
      not: varMi('DIRECT_URL') ? 'tanımlı' : 'tanımlı değil (yalnızca şema işlemleri için gerekir)',
    },
    {
      ad: 'DEPO',
      iyi: depoTuru() === 'supabase' || !sunucusuz,
      not: depoTuru(),
    },
    {
      ad: 'SUPABASE_URL',
      iyi: Boolean(varMi('SUPABASE_URL')) || depoTuru() !== 'supabase',
      not: varMi('SUPABASE_URL') ? 'tanımlı' : 'tanımlı değil',
    },
    {
      ad: 'SUPABASE_SERVIS_ANAHTARI',
      iyi: Boolean(varMi('SUPABASE_SERVIS_ANAHTARI')) || depoTuru() !== 'supabase',
      not: varMi('SUPABASE_SERVIS_ANAHTARI') ? 'tanımlı' : 'tanımlı değil',
    },
    await veritabani(),
    await depo(),
  ]

  const sorunlu = kontroller.filter((k) => !k.iyi)
  const hicbiriYok = !anahtar && !veri && !varMi('SUPABASE_URL')

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-lg font-semibold tracking-tight">Kurulum durumu</h1>
      <p className="mt-1 text-sm text-soluk">
        {sorunlu.length === 0
          ? 'Her şey yerinde görünüyor.'
          : `${sorunlu.length} sorun bulundu.`}{' '}
        Bu sayfa yalnızca ayarların tanımlı olup olmadığını gösterir, değerlerini
        göstermez.
      </p>

      {hicbiriYok ? (
        <p className="mt-4 rounded-md bg-bekliyor-zemin px-4 py-3 text-sm text-bekliyor">
          <strong>Hiçbir ortam değişkeni okunmuyor.</strong> Büyük ihtimalle ya
          Vercel'de <em>Settings → Environment Variables</em> altına
          eklenmediler, ya da eklendi ama sonrasında <em>Redeploy</em>
          yapılmadı — Vercel bu değerleri yalnızca dağıtım anında okur.
        </p>
      ) : null}

      <div className="kart mt-5 overflow-hidden">
        <table className="tablo">
          <tbody>
            {kontroller.map((k) => (
              <tr key={k.ad}>
                <td className="w-8 text-center">{k.iyi ? '✅' : '❌'}</td>
                <td className="w-56 font-medium">{k.ad}</td>
                <td className="text-soluk">{k.not}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-soluk">
        Ayarları değiştirdikten sonra Vercel'de yeniden dağıtım (Redeploy)
        gerekir; ortam değişkenleri yalnızca dağıtım anında okunur.
      </p>
    </div>
  )
}
