import { Pool } from 'pg'
import type { GameVersion } from './gameVersion'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res.rows
  } finally {
    client.release()
  }
}

export function tableName(base: string, version: GameVersion): string {
  if (version === 'pcbs2') return `v2_${base}`
  return base
}

const cache = new Map<string, any>()

export async function queryByVersion(baseTable: string, version: GameVersion) {
  const key = `${version}:${baseTable}`
  const cached = cache.get(key)
  if (cached) return cached
  const rows = await query(`SELECT * FROM ${tableName(baseTable, version)} ORDER BY id`)
  cache.set(key, rows)
  return rows
}
