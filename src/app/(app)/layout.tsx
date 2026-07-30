'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'
import { LevelSettingsProvider } from '@/lib/levelSettingsContext'
import type { LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

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

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const version = (searchParams.get('version') as GameVersion) || 'pcbs'
  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const saved = loadLevelSettings(version)
    setLevelSettings(saved)
    if (!saved) setShowSettings(true)
  }, [version])

  const handleSaveSettings = useCallback((lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem(levelKey(version), JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }, [version])

  return (
    <>
      {showSettings && (
        <LevelSettingsModal
          initialLevel={levelSettings?.level ?? 1} initialPercent={levelSettings?.percent ?? 0}
          initialSandbox={levelSettings?.isSandbox ?? false}
          maxLevel={version === 'pcbs' ? 34 : 30} hasExistingSettings={!!levelSettings}
          onClose={() => { if (levelSettings) setShowSettings(false) }}
          onSave={handleSaveSettings}
        />
      )}
      <LevelSettingsProvider value={levelSettings}>
        <AppShell levelSettings={levelSettings} onOpenSettings={() => setShowSettings(true)} gameVersion={version}>
          {children}
        </AppShell>
      </LevelSettingsProvider>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  )
}
