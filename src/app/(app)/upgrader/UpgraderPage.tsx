'use client'

import BuildUpgrader from '@/components/BuildUpgrader'
import { useLevelSettings } from '@/lib/levelSettingsContext'
import type { CPU, GPU, RAM, Motherboard, Case } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

interface Props {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]; motherboards: Motherboard[]; cases: Case[]; gameVersion: GameVersion
}

export default function UpgraderPage({ cpus, gpus, rams, motherboards, cases, gameVersion }: Props) {
  const levelSettings = useLevelSettings()
  return (
    <BuildUpgrader cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} cases={cases} levelSettings={levelSettings} />
  )
}
