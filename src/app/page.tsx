import { queryByVersion } from '@/lib/db'
import type { GameVersion } from '@/lib/gameVersion'
import { LangProvider } from '@/lib/i18n/context'
import PageClient from './PageClient'

const VERSIONS: GameVersion[] = ['pcbs', 'pcbs2']
const TABLES = ['cpu', 'gpu', 'ram', 'motherboard', 'psu', 'storage', 'cases', 'coolers'] as const
const KEYS = ['cpus', 'gpus', 'rams', 'motherboards', 'psus', 'storageDrives', 'cases', 'coolers'] as const

async function loadData(version: GameVersion) {
  const rows = await Promise.all(TABLES.map((t) => queryByVersion(t, version)))
  return Object.fromEntries(KEYS.map((k, i) => [k, rows[i]])) as any
}

export default async function HomePage() {
  const [pcbs, pcbs2] = await Promise.all(VERSIONS.map(loadData))
  return (
    <LangProvider>
      <PageClient pcbs={pcbs} pcbs2={pcbs2} />
    </LangProvider>
  )
}
