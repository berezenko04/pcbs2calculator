import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const rows = await query('SELECT * FROM ram ORDER BY id')
  return NextResponse.json(rows)
}
