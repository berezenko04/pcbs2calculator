import { queryByVersion } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { GameVersion } from '@/lib/gameVersion'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const version = (searchParams.get('version') as GameVersion) || 'pcbs'
  const rows = await queryByVersion('cases', version)
  return NextResponse.json(rows)
}
