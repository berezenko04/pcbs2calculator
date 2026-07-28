import { queryByVersion } from '@/lib/db'
import type { GameVersion } from '@/lib/gameVersion'
import UpgraderPage from './UpgraderPage'

export default async function Page({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  const gameVersion: GameVersion = version === 'pcbs2' ? 'pcbs2' : 'pcbs'

  const [cpus, gpus, rams, motherboards, cases] = await Promise.all([
    queryByVersion('cpu', gameVersion),
    queryByVersion('gpu', gameVersion),
    queryByVersion('ram', gameVersion),
    queryByVersion('motherboard', gameVersion),
    queryByVersion('cases', gameVersion),
  ])

  return <UpgraderPage cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} cases={cases} gameVersion={gameVersion} />
}
