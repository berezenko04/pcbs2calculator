"use client"

import { useState, useEffect, useCallback } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'
import Calculator from '@/components/calculator/Calculator'
import BuildMaker from '@/components/BuildMaker'
import BuildUpgrader from '@/components/BuildUpgrader'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'
import { useLang } from '@/lib/i18n/context'

function levelKey(version: GameVersion): string {
  return 'pcbs2_level_' + version
}

function loadLevelForVersion(version: GameVersion): LevelSettings | null {
  try {
    const raw = localStorage.getItem(levelKey(version))
    if (raw) {
      const parsed = JSON.parse(raw) as LevelSettings
      if (typeof parsed.level === 'number' && typeof parsed.percent === 'number') return parsed
    }
  } catch {}
  return null
}

function LoadingFallback() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-slate-400 text-lg">{t('loading')}</div>
    </div>
  )
}

function HomeInner() {
  const [cpus, setCpus] = useState<CPU[]>([])
  const [gpus, setGpus] = useState<GPU[]>([])
  const [rams, setRams] = useState<RAM[]>([])
  const [motherboards, setMotherboards] = useState<Motherboard[]>([])
  const [psus, setPsus] = useState<PSU[]>([])
  const [storageDrives, setStorageDrives] = useState<StorageDrive[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [coolers, setCoolers] = useState<Cooler[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('calculator')

  const [gameVersion, setGameVersion] = useState<GameVersion>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pcbs2_game_version') as GameVersion | null
      if (stored && ['pcbs', 'pcbs2'].includes(stored)) return stored
    }
    return 'pcbs'
  })

  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(() => {
    return loadLevelForVersion(gameVersion as GameVersion)
  })

  const [showSettings, setShowSettings] = useState(() => {
    return loadLevelForVersion(gameVersion as GameVersion) === null
  })

  const [draftLevel, setDraftLevel] = useState(() => {
    const saved = loadLevelForVersion(gameVersion as GameVersion)
    return saved?.level ?? 1
  })

  const [draftPercent, setDraftPercent] = useState(() => {
    const saved = loadLevelForVersion(gameVersion as GameVersion)
    return saved?.percent ?? 0
  })

  const [draftSandbox, setDraftSandbox] = useState(() => {
    const saved = loadLevelForVersion(gameVersion as GameVersion)
    return saved?.isSandbox ?? false
  })

  const allLevels = [...cpus, ...gpus, ...rams].map((c) => Number(c.level)).filter((l) => !isNaN(l))
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const saveSettings = useCallback((lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem(levelKey(gameVersion), JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }, [gameVersion])

  const openSettings = useCallback(() => {
    setDraftLevel(levelSettings?.level ?? 1)
    setDraftPercent(levelSettings?.percent ?? 0)
    setDraftSandbox(levelSettings?.isSandbox ?? false)
    setShowSettings(true)
  }, [levelSettings])

  const loadData = useCallback(async (version: GameVersion) => {
    setLoading(true)
    const q = `?version=${version}`
    const [c, g, r, mb, p, s, cs, cl] = await Promise.all([
      fetch('/api/cpus' + q).then(r => r.json()),
      fetch('/api/gpus' + q).then(r => r.json()),
      fetch('/api/rams' + q).then(r => r.json()),
      fetch('/api/motherboard' + q).then(r => r.json()),
      fetch('/api/psu' + q).then(r => r.json()),
      fetch('/api/storage' + q).then(r => r.json()),
      fetch('/api/cases' + q).then(r => r.json()),
      fetch('/api/coolers' + q).then(r => r.json()),
    ])
    setCpus(c)
    setGpus(g)
    setRams(r)
    setMotherboards(mb)
    setPsus(p)
    setStorageDrives(s)
    setCases(cs)
    setCoolers(cl)

    const saved = loadLevelForVersion(version)
    if (saved) {
      setLevelSettings(saved)
      setShowSettings(false)
    } else {
      setLevelSettings(null)
      setShowSettings(true)
    }
    setLoading(false)
  }, [])

  const handleGameVersionChange = useCallback((v: GameVersion) => {
    setGameVersion(v)
    localStorage.setItem('pcbs2_game_version', v)
    loadData(v)
  }, [loadData])

  useEffect(() => { loadData(gameVersion) }, [])

  if (loading) return <LoadingFallback />

  return (
    <>
      {showSettings && (
        <LevelSettingsModal
          initialLevel={draftLevel} initialPercent={draftPercent} initialSandbox={draftSandbox}
          maxLevel={maxLevel} hasExistingSettings={!!levelSettings}
          onClose={() => { if (levelSettings) setShowSettings(false) }}
          onSave={(lv, pct, sandbox) => saveSettings(lv, pct, sandbox)}
        />
      )}
      <AppShell activeTab={activeTab} onTabChange={setActiveTab} levelSettings={levelSettings} onOpenSettings={openSettings} gameVersion={gameVersion} onGameVersionChange={handleGameVersionChange}>
        {activeTab === 'calculator' && <Calculator cpus={cpus} gpus={gpus} rams={rams} levelSettings={levelSettings} />}
        {activeTab === 'buildmaker' && <BuildMaker cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} psus={psus} storageDrives={storageDrives} cases={cases} coolers={coolers} levelSettings={levelSettings} gameVersion={gameVersion} />}
        {activeTab === 'upgrader' && <BuildUpgrader cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} cases={cases} levelSettings={levelSettings} />}
      </AppShell>
    </>
  )
}

export default function HomePage() {
  return (
    <LangProvider>
      <HomeInner />
    </LangProvider>
  )
}
