'use client'

import BuildMaker from '@/components/BuildMaker'
import { useLevelSettings } from '@/lib/levelSettingsContext'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

interface Props {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]; motherboards: Motherboard[]; psus: PSU[]
  storageDrives: StorageDrive[]; cases: Case[]; coolers: Cooler[]; gameVersion: GameVersion
}

export default function BuildMakerPage({ cpus, gpus, rams, motherboards, psus, storageDrives, cases, coolers, gameVersion }: Props) {
  const levelSettings = useLevelSettings()
  return (
    <BuildMaker cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} psus={psus} storageDrives={storageDrives} cases={cases} coolers={coolers} levelSettings={levelSettings} gameVersion={gameVersion} />
  )
}
