// Supabase'e yalnızca imalat_* fonksiyonları üzerinden erişilir; tablolar
// tarayıcıya kapalıdır. Adres ve publishable anahtar herkese açık bilgilerdir
// (tarayıcıya zaten gider), bu yüzden koda gömülüdür. Başka bir projeye
// bağlamak için VITE_SUPABASE_URL / VITE_SUPABASE_KEY ile ezilebilir.
const URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://ojdjhqzfsyklpkxihphl.supabase.co'
const KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_CJx2-EKmEbgSnB1ukOZERg_wzXbcjn0'

export type Tur = 'olusturma' | 'tarih' | 'bitti' | 'geri_acildi' | 'duzenleme'

export interface Hesap {
  kod: string
  santiye_id: number | null
  merkez: boolean
  ad: string
}

export interface Santiye {
  id: number
  ad: string
}

export interface Kalem {
  id: number
  santiye_id: number
  ad: string
  konum: string | null
  /** İkisi birlikte boştur: hedef tarihi henüz belli olmayan imalat. */
  ilk_hedef: string | null
  hedef: string | null
  durum: 'devam' | 'bitti'
  bitis: string | null
  olusturan_ad: string
  olusturma: string
  erteleme: number
}

export interface Degisiklik {
  id: number
  tur: Tur
  eski_hedef: string | null
  yeni_hedef: string | null
  neden: string | null
  yapan_ad: string
  zaman: string
}

export interface SonDegisiklik extends Degisiklik {
  kalem_id: number
  kalem_ad: string
  santiye_id: number
}

export interface Veri {
  hesap: Hesap
  bugun: string
  santiyeler: Santiye[]
  kalemler: Kalem[]
  degisiklikler: SonDegisiklik[]
}

export class OturumHatasi extends Error {}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let yanit: Response
  try {
    yanit = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    })
  } catch {
    throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.')
  }
  const metin = await yanit.text()
  const govde = metin ? JSON.parse(metin) : null
  if (!yanit.ok) {
    if (govde?.code === '28000') throw new OturumHatasi(govde.message)
    throw new Error(govde?.message ?? `Beklenmeyen hata (${yanit.status})`)
  }
  return govde as T
}

const TOKEN = 'imalat_token'

export const oturum = {
  al: () => localStorage.getItem(TOKEN),
  sil: () => localStorage.removeItem(TOKEN),
}

function token(): string {
  const t = oturum.al()
  if (!t) throw new OturumHatasi('Giriş yapın.')
  return t
}

export const api = {
  hesaplar: () => rpc<{ kod: string; ad: string }[]>('imalat_hesaplar'),

  async giris(kod: string, sifre: string) {
    const r = await rpc<{ token?: string; hata?: string }>('imalat_giris', {
      p_kod: kod,
      p_sifre: sifre,
    })
    if (!r.token) throw new Error(r.hata ?? 'Giriş yapılamadı.')
    localStorage.setItem(TOKEN, r.token)
  },

  async cikis() {
    const t = oturum.al()
    oturum.sil()
    if (t) await rpc('imalat_cikis', { p_token: t }).catch(() => {})
  },

  veri: () => rpc<Veri>('imalat_veri', { p_token: token() }),

  gecmis: (kalem: number) =>
    rpc<Degisiklik[]>('imalat_gecmis', { p_token: token(), p_kalem: kalem }),

  ekle: (a: { santiye: number | null; ad: string; konum: string; hedef: string; yapan: string }) =>
    rpc<number>('imalat_ekle', {
      p_token: token(),
      p_santiye: a.santiye,
      p_ad: a.ad,
      p_konum: a.konum,
      p_hedef: a.hedef,
      p_yapan: a.yapan,
    }),

  tarih: (kalem: number, yeni: string, neden: string, yapan: string) =>
    rpc('imalat_tarih', {
      p_token: token(),
      p_kalem: kalem,
      p_yeni: yeni,
      p_neden: neden,
      p_yapan: yapan,
    }),

  bitir: (kalem: number, bitis: string, yapan: string) =>
    rpc('imalat_bitir', { p_token: token(), p_kalem: kalem, p_bitis: bitis, p_yapan: yapan }),

  geriAc: (kalem: number, yapan: string) =>
    rpc('imalat_geri_ac', { p_token: token(), p_kalem: kalem, p_yapan: yapan }),

  duzenle: (kalem: number, ad: string, konum: string, hedef: string | null, yapan: string) =>
    rpc('imalat_duzenle', {
      p_token: token(),
      p_kalem: kalem,
      p_ad: ad,
      p_konum: konum,
      p_hedef: hedef,
      p_yapan: yapan,
    }),

  sil: (kalem: number) => rpc('imalat_sil', { p_token: token(), p_kalem: kalem }),

  santiyeAd: (santiye: number, ad: string) =>
    rpc('imalat_santiye_ad', { p_token: token(), p_santiye: santiye, p_ad: ad }),

  sifre: (kod: string, yeni: string) =>
    rpc('imalat_sifre', { p_token: token(), p_kod: kod, p_yeni: yeni }),
}
