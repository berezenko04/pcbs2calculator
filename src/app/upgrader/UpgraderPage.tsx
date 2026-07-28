'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import BuildUpgrader from '@/components/BuildUpgrader'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'
import type { CPU, GPU, RAM, Motherboard, Case, LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

interface Props {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]; motherboards: Motherboard[]; cases: Case[]; gameVersion: GameVersion
}

function levelKey(version: GameVersion) { return 'pcbs2_level_' + version }

function loadLevelSettings(version: GameVersion): LevelSettings | null {
  try {
    const raw = localStorage.getItem(levelKey(version))
    if (raw) {
      const p = JSON.parse(raw) as LevelSettings
      if (typeof p.level === 'number' && typeof p.percent === 'number') return p
    }
  } catch {}
  return null
}

export default function UpgraderPage({ cpus, gpus, rams, motherboards, cases, gameVersion }: Props) {
  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const saved = loadLevelSettings(gameVersion)
    setLevelSettings(saved)
    if (!saved) setShowSettings(true)
  }, [gameVersion])

  const allLevels = useMemo(() =>
    [...cpus, ...gpus, ...rams].map(c => Number(c.level)).filter(l => !isNaN(l)),
    [cpus, gpus, rams],
  )
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const handleSaveSettings = (lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem(levelKey(gameVersion), JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }

  return (
    <>
      {showSettings && (
        <LevelSettingsModal
          initialLevel={levelSettings?.level ?? 1} initialPercent={levelSettings?.percent ?? 0}
          initialSandbox={levelSettings?.isSandbox ?? false}
          maxLevel={maxLevel} hasExistingSettings={!!levelSettings}
          onClose={() => { if (levelSettings) setShowSettings(false) }}
          onSave={handleSaveSettings}
        />
      )}
      <AppShell levelSettings={levelSettings} onOpenSettings={() => setShowSettings(true)} gameVersion={gameVersion}>
        <BuildUpgrader cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} cases={cases} levelSettings={levelSettings} />
      </AppShell>
    </>
  )
}
