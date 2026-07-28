import { queryByVersion } from '@/lib/db'
import type { GameVersion } from '@/lib/gameVersion'
import BuildMakerPage from './BuildMakerPage'

export default async function Page({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  const gameVersion: GameVersion = version === 'pcbs2' ? 'pcbs2' : 'pcbs'

  const [cpus, gpus, rams, motherboards, psus, storageDrives, cases, coolers] = await Promise.all([
    queryByVersion('cpu', gameVersion),
    queryByVersion('gpu', gameVersion),
    queryByVersion('ram', gameVersion),
    queryByVersion('motherboard', gameVersion),
    queryByVersion('psu', gameVersion),
    queryByVersion('storage', gameVersion),
    queryByVersion('cases', gameVersion),
    queryByVersion('coolers', gameVersion),
  ])

  return <BuildMakerPage cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} psus={psus} storageDrives={storageDrives} cases={cases} coolers={coolers} gameVersion={gameVersion} />
}
