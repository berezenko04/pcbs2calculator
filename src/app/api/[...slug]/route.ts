import { queryByVersion } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { GameVersion } from '@/lib/gameVersion'

const TABLE_MAP: Record<string, string> = {
  cpus: 'cpu', gpus: 'gpu', rams: 'ram',
  cases: 'cases', coolers: 'coolers',
  motherboard: 'motherboard', psu: 'psu', storage: 'storage',
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const segment = slug?.[0]
  const table = segment ? TABLE_MAP[segment] : undefined
  if (!table) {
    return NextResponse.json({ error: `Unknown endpoint: /api/${segment || ''}` }, { status: 404 })
  }
  const { searchParams } = new URL(request.url)
  const version = (searchParams.get('version') as GameVersion) || 'pcbs'
  const rows = await queryByVersion(table, version)
  return NextResponse.json(rows)
}
