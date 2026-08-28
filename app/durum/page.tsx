import { db } from '@/lib/db'
import { depoTuru, kovaDurumu } from '@/lib/depo'
import {
  oturumAnahtari,
  oturumAnahtariTuretildi,
  supabaseAdresi,
  supabaseAdresiTuretildi,
} from '@/lib/yapilandirma'

export const dynamic = 'force-dynamic'

type Hal = 'iyi' | 'kotu' | 'gereksiz'
type Sonuc = { ad: string; hal: Hal; not: string }

const SIMGE: Record<Hal, string> = { iyi: '✅', kotu: '❌', gereksiz: '➖' }

/** Koşula göre iyi/kötü. */
const halj = (kosul: boolean): Hal => (kosul ? 'iyi' : 'kotu')

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
      hal: halj(n > 0),
      not:
        n > 0
          ? `bağlantı tamam · ${n} kullanıcı kayıtlı`
          : 'bağlantı tamam ama hiç kullanıcı yok — kurulum SQL\'inin 2. parçası çalışmamış',
    }
  } catch (e) {
    return {
      ad: 'Veritabanı',
      hal: 'kotu',
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
      hal: halj(!sunucusuz),
      not: sunucusuz
        ? 'DEPO=yerel — sunucusuz ortamda dosyalar kalıcı olmaz, "supabase" olmalı'
        : 'DEPO=yerel — yerel diskte, bu ortam için uygun',
    }
  }
  try {
    const d = await kovaDurumu()
    if (d.hal === 'tamam') {
      return {
        ad: 'Belge deposu',
        hal: 'iyi',
        not: `Supabase Storage tamam · "${d.kova}" kovası yazılabilir`,
      }
    }
    if (d.hal === 'erisim-yok') {
      return {
        ad: 'Belge deposu',
        hal: 'kotu',
        not: `Supabase reddetti — SUPABASE_SERVIS_ANAHTARI yanlış ya da eksik olabilir (${d.mesaj})`,
      }
    }
    if (d.hal === 'kova-yok') {
      return {
        ad: 'Belge deposu',
        hal: 'kotu',
        not: `"${d.kova}" adlı kova yok. Supabase'de bulunanlar: ${
          d.mevcutlar.length ? d.mevcutlar.join(', ') : '(hiç kova yok)'
        }`,
      }
    }
    return {
      ad: 'Belge deposu',
      hal: 'kotu',
      not: `"${d.kova}" kovasına yazılamıyor: ${d.mesaj}`,
    }
  } catch (e) {
    return { ad: 'Belge deposu', hal: 'kotu', not: hataMetni(e) }
  }
}

async function Icerik() {
  const anahtar = varMi('OTURUM_ANAHTARI')
  const veri = varMi('DATABASE_URL')

  const kontroller: Sonuc[] = [
    {
      ad: 'OTURUM_ANAHTARI',
      hal: halj(Boolean(oturumAnahtari())),
      not: anahtar && anahtar.length >= 32
        ? 'tanımlı'
        : oturumAnahtariTuretildi()
          ? "verilmemiş — DATABASE_URL'den türetildi (çalışır, ama açıkça vermek daha iyi)"
          : 'tanımlı değil ve türetilemiyor (DATABASE_URL de yok)',
    },
    {
      ad: 'DATABASE_URL',
      // pgbouncer uyarısı yalnızca havuz adresi kullanılıyorsa anlamlı.
      hal: halj(Boolean(veri && (!havuzMu(veri) || veri.includes('pgbouncer=true')))),
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
      hal: varMi('DIRECT_URL') ? 'iyi' : 'gereksiz',
      not: varMi('DIRECT_URL') ? 'tanımlı' : 'tanımlı değil (yalnızca şema işlemleri için gerekir)',
    },
    {
      ad: 'DEPO',
      hal: halj(depoTuru() === 'supabase' || !sunucusuz),
      not: varMi('DEPO')
        ? depoTuru()
        : `${depoTuru()} (verilmemiş, kendiliğinden seçildi)`,
    },
    {
      ad: 'SUPABASE_URL',
      hal: supabaseAdresi() ? 'iyi' : depoTuru() === 'supabase' ? 'kotu' : 'gereksiz',
      not: varMi('SUPABASE_URL')
        ? 'tanımlı'
        : supabaseAdresiTuretildi()
          ? `verilmemiş — DATABASE_URL'den türetildi: ${supabaseAdresi()}`
          : 'tanımlı değil',
    },
    {
      ad: 'SUPABASE_SERVIS_ANAHTARI',
      hal: varMi('SUPABASE_SERVIS_ANAHTARI')
        ? 'iyi'
        : depoTuru() === 'supabase'
          ? 'kotu'
          : 'gereksiz',
      not: varMi('SUPABASE_SERVIS_ANAHTARI') ? 'tanımlı' : 'tanımlı değil',
    },
    await veritabani(),
    await depo(),
  ]

  const sorunlu = kontroller.filter((k) => k.hal === 'kotu')
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
                <td className="w-8 text-center">{SIMGE[k.hal]}</td>
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

/**
 * Teşhis sayfasının kendisi çökerse hiçbir işe yaramaz. Ne olursa olsun
 * hatayı ekrana basar.
 */
export default async function Durum() {
  try {
    return await Icerik()
  } catch (e) {
    const mesaj =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-lg font-semibold tracking-tight">Kurulum durumu</h1>
        <p className="mt-1 text-sm text-soluk">
          Durum sayfası çalışırken hata oluştu. Ham mesaj:
        </p>
        <pre className="kart mt-4 overflow-x-auto p-4 text-xs whitespace-pre-wrap">
          {mesaj}
        </pre>
      </div>
    )
  }
}
