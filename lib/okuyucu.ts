import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

/** Modelin tarih için üretmesi gereken biçim. */
const TARIH_ACIKLAMA = 'Belgedeki tarih, YYYY-AA-GG biçiminde. Okunamıyorsa null.'

const irsaliyeSemasi = z.object({
  no: z.string().nullable().describe('İrsaliye numarası; yoksa null'),
  tarih: z.string().nullable().describe(TARIH_ACIKLAMA),
  firma: z
    .string()
    .nullable()
    .describe('Malzemeyi gönderen satıcı firmanın adı'),
  kalemler: z
    .array(
      z.object({
        malzeme: z.string().describe('Malzemenin belgede yazan adı'),
        miktar: z.number().nullable(),
        birim: z.string().nullable().describe('ADET, KG, M3, TON, PAKET gibi'),
        birimFiyat: z.number().nullable().describe('Belgede yazmıyorsa null'),
      }),
    )
    .describe('İrsaliyedeki malzeme satırları'),
})

const faturaSemasi = z.object({
  no: z.string().nullable().describe('Fatura numarası'),
  tarih: z.string().nullable().describe(TARIH_ACIKLAMA),
  firma: z.string().nullable().describe('Faturayı kesen firmanın adı'),
  tutar: z
    .number()
    .nullable()
    .describe('KDV dahil genel toplam. Belgede yoksa null'),
  aciklama: z.string().nullable().describe('Kısa konu/açıklama'),
  irsaliyeNolari: z
    .array(z.string())
    .describe('Fatura üzerinde geçen irsaliye numaraları; yoksa boş dizi'),
})

export type OkunanIrsaliye = z.infer<typeof irsaliyeSemasi>
export type OkunanFatura = z.infer<typeof faturaSemasi>

const YONERGE = `Sen bir şantiyenin evrak kayıt asistanısın. Sana verilen
Türkçe irsaliye ya da fatura görüntüsünden alanları çıkarıyorsun.

Kurallar:
- Yalnızca belgede gerçekten yazan bilgiyi yaz. Tahmin etme, uydurma.
- Okuyamadığın ya da belgede olmayan alan için null bırak.
- Sayılarda Türkçe biçimi (1.234,56) ondalık noktaya çevir: 1234.56
- Firma adını belgedeki gibi, kısaltmadan yaz.`

export function okuyucuHazirMi(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

async function icerikBloku(dosya: File) {
  const veri = Buffer.from(await dosya.arrayBuffer()).toString('base64')
  if (dosya.type === 'application/pdf') {
    return {
      type: 'document' as const,
      source: {
        type: 'base64' as const,
        media_type: 'application/pdf' as const,
        data: veri,
      },
    }
  }
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: dosya.type as 'image/jpeg' | 'image/png' | 'image/webp',
      data: veri,
    },
  }
}

/** Belgeyi okuyup alanları çıkarır. API anahtarı yoksa hata fırlatır. */
export async function belgeOku(
  dosya: File,
  tur: 'irsaliye' | 'fatura',
): Promise<OkunanIrsaliye | OkunanFatura> {
  if (!okuyucuHazirMi()) {
    throw new Error(
      'Belge okuma kapalı: sunucuda ANTHROPIC_API_KEY tanımlı değil.',
    )
  }

  const istemci = new Anthropic()
  const sema = tur === 'irsaliye' ? irsaliyeSemasi : faturaSemasi

  const yanit = await istemci.beta.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: YONERGE,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(sema),
    },
    messages: [
      {
        role: 'user',
        content: [
          await icerikBloku(dosya),
          {
            type: 'text',
            text:
              tur === 'irsaliye'
                ? 'Bu irsaliyedeki bilgileri ve malzeme satırlarını çıkar.'
                : 'Bu faturadaki bilgileri çıkar.',
          },
        ],
      },
    ],
  })

  if (yanit.stop_reason === 'refusal') {
    throw new Error('Model bu belgeyi işlemeyi reddetti. Alanları elle girin.')
  }
  if (!yanit.parsed_output) {
    throw new Error('Belge okundu ama alanlar ayrıştırılamadı. Elle girin.')
  }

  return yanit.parsed_output
}
