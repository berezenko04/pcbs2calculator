import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

export interface CachedData {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]
  motherboards: Motherboard[]; psus: PSU[]
  storageDrives: StorageDrive[]; cases: Case[]; coolers: Cooler[]
}

const cache = new Map<GameVersion, CachedData>()

export function getCachedData(version: GameVersion): CachedData | undefined {
  return cache.get(version)
}

export function setCachedData(version: GameVersion, data: CachedData): void {
  cache.set(version, data)
}
