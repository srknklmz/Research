import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { yuklemeDizini } from '@/lib/belge'
import { db } from '@/lib/db'
import { oturumKullanici } from '@/lib/oturum'

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await oturumKullanici())) {
    return new NextResponse('Yetkisiz', { status: 401 })
  }

  const { id } = await params
  const belge = await db.belge.findUnique({ where: { id: Number(id) } })
  if (!belge) return new NextResponse('Belge bulunamadı', { status: 404 })

  try {
    const veri = await readFile(join(yuklemeDizini(), belge.yol))
    return new NextResponse(new Uint8Array(veri), {
      headers: {
        'Content-Type': belge.mimeTur,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(belge.ad)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Dosya diskte bulunamadı', { status: 404 })
  }
}
