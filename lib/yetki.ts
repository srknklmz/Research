import type { Rol } from '@prisma/client'

export const ROL_ADI: Record<Rol, string> = {
  SANTIYE: 'Şantiye',
  IDARI_MUDUR: 'İdari Müdür',
  MERKEZ: 'Merkez',
  YONETICI: 'Yönetici',
}

/** YONETICI her yetkiye sahiptir. */
export function yetkili(rol: Rol, izinliler: Rol[]): boolean {
  return rol === 'YONETICI' || izinliler.includes(rol)
}

export const GIRIS_YAPABILIR: Rol[] = ['SANTIYE', 'YONETICI']
export const ESLESTIREBILIR: Rol[] = ['SANTIYE', 'YONETICI']
export const IMZALAYABILIR: Rol[] = ['IDARI_MUDUR', 'YONETICI']
export const MERKEZ_ONAYLAR: Rol[] = ['MERKEZ', 'YONETICI']
