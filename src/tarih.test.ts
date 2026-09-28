import { describe, expect, it } from 'vitest'
import { ayEkle, durum, gunEkle, gunFarki, kalanYaz, kayma, sonuc, tarihYaz, zamanYaz } from './tarih'

describe('tarih', () => {
  it('gün farkını ay ve yıl geçişinde doğru sayar', () => {
    expect(gunFarki('2026-09-28', '2026-10-08')).toBe(10)
    expect(gunFarki('2026-12-31', '2027-01-01')).toBe(1)
    expect(gunFarki('2026-10-08', '2026-09-28')).toBe(-10)
    expect(gunEkle('2026-03-28', 3)).toBe('2026-03-31')
    expect(ayEkle('2026-01-31', 1)).toBe('2026-02-28')
    expect(ayEkle('2026-11-15', 2)).toBe('2027-01-15')
  })

  it('durumu hedefe göre belirler', () => {
    const bugun = '2026-09-28'
    expect(durum({ durum: 'devam', hedef: '2026-09-27' }, bugun)).toBe('gecikti')
    expect(durum({ durum: 'devam', hedef: '2026-09-28' }, bugun)).toBe('yakin')
    expect(durum({ durum: 'devam', hedef: '2026-10-05' }, bugun)).toBe('yakin')
    expect(durum({ durum: 'devam', hedef: '2026-10-06' }, bugun)).toBe('yolunda')
    expect(durum({ durum: 'bitti', hedef: '2026-01-01' }, bugun)).toBe('bitti')
  })

  it('kalan günü okunur yazar', () => {
    expect(kalanYaz('2026-09-25', '2026-09-28')).toBe('3 gün gecikti')
    expect(kalanYaz('2026-09-28', '2026-09-28')).toBe('Bugün')
    expect(kalanYaz('2026-09-29', '2026-09-28')).toBe('Yarın')
    expect(kalanYaz('2026-10-08', '2026-09-28')).toBe('10 gün kaldı')
  })

  it('kaymayı ve hedef tutma sonucunu hesaplar', () => {
    expect(kayma({ ilk_hedef: '2026-10-01', hedef: '2026-10-11' })).toBe(10)
    const k = { ilk_hedef: '2026-10-01', hedef: '2026-10-11' }
    expect(sonuc({ ...k, bitis: '2026-10-01' })).toBe('ilk_hedefte')
    expect(sonuc({ ...k, bitis: '2026-10-05' })).toBe('revize_hedefte')
    expect(sonuc({ ...k, bitis: '2026-10-12' })).toBe('gec')
  })

  it('yılı yalnızca başka yıldaysa yazar', () => {
    expect(tarihYaz('2026-10-08', '2026-09-28')).not.toContain('2026')
    expect(tarihYaz('2027-01-08', '2026-09-28')).toContain('2027')
  })

  it('zamanı İstanbul gününe göre yazar', () => {
    // 22:30 UTC = ertesi gün 01:30 İstanbul
    expect(zamanYaz('2026-09-27T22:30:00Z', '2026-09-28')).toBe('bugün 01:30')
    expect(zamanYaz('2026-09-27T10:00:00Z', '2026-09-28')).toBe('dün 13:00')
    expect(zamanYaz('2026-09-24T10:00:00Z', '2026-09-28')).toBe('4 gün önce')
  })
})
