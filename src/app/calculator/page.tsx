import { queryByVersion } from '@/lib/db'
import type { GameVersion } from '@/lib/gameVersion'
import CalculatorPage from './CalculatorPage'

export default async function Page({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  const gameVersion: GameVersion = version === 'pcbs2' ? 'pcbs2' : 'pcbs'

  const [cpus, gpus, rams] = await Promise.all([
    queryByVersion('cpu', gameVersion),
    queryByVersion('gpu', gameVersion),
    queryByVersion('ram', gameVersion),
  ])

  return <CalculatorPage cpus={cpus} gpus={gpus} rams={rams} gameVersion={gameVersion} />
}
