import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const N = 16384
const KEYLEN = 64

/** Parolayı `tuz:ozet` biçiminde saklanabilir bir dizgeye çevirir. */
export function parolaOzetle(parola: string): string {
  const tuz = randomBytes(16)
  const ozet = scryptSync(parola.normalize('NFKC'), tuz, KEYLEN, { N })
  return `${tuz.toString('hex')}:${ozet.toString('hex')}`
}

/** Sabit zamanlı karşılaştırma ile parolayı doğrular. */
export function parolaDogrula(parola: string, kayit: string): boolean {
  const [tuzHex, ozetHex] = kayit.split(':')
  if (!tuzHex || !ozetHex) return false
  const beklenen = Buffer.from(ozetHex, 'hex')
  const gelen = scryptSync(parola.normalize('NFKC'), Buffer.from(tuzHex, 'hex'), beklenen.length, { N })
  return beklenen.length === gelen.length && timingSafeEqual(beklenen, gelen)
}
