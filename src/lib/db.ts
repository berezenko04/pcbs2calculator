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

export async function queryByVersion(baseTable: string, version: GameVersion) {
  return query(`SELECT * FROM ${tableName(baseTable, version)} ORDER BY id`)
}
