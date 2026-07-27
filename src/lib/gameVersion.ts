export type GameVersion = 'pcbs' | 'pcbs2'

export const GAME_VERSIONS: { id: GameVersion; label: string; short: string }[] = [
  { id: 'pcbs', label: 'PCBS', short: 'v1' },
  { id: 'pcbs2', label: 'PCBS2', short: 'v2' },
]

export function gameTable(table: string, version: GameVersion): string {
  if (version === 'pcbs2') return `v2_${table}`
  return table
}
