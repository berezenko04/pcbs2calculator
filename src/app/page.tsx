"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'
import Calculator from '@/components/calculator/Calculator'
import BuildMaker from '@/components/BuildMaker'
import BuildUpgrader from '@/components/BuildUpgrader'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'
import { useLang } from '@/lib/i18n/context'

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
  const [gameVersion, setGameVersion] = useState<GameVersion>('pcbs2')

  const initData = useMemo(() => {
    const init: { levelSettings: LevelSettings | null; showSettings: boolean; draftLevel: number; draftPercent: number; draftSandbox: boolean } =
      { levelSettings: null, showSettings: false, draftLevel: 1, draftPercent: 0, draftSandbox: false }
    try {
      const raw = localStorage.getItem('pcbs2_level')
      if (raw) {
        const parsed = JSON.parse(raw) as LevelSettings
        if (typeof parsed.level === 'number' && typeof parsed.percent === 'number') {
          init.levelSettings = parsed
          init.draftLevel = parsed.level
          init.draftPercent = parsed.percent
          init.draftSandbox = parsed.isSandbox ?? false
          return init
        }
      }
    } catch {}
    init.showSettings = true
    return init
  }, [])

  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(initData.levelSettings)
  const [showSettings, setShowSettings] = useState(initData.showSettings)
  const [draftLevel, setDraftLevel] = useState(initData.draftLevel)
  const [draftPercent, setDraftPercent] = useState(initData.draftPercent)
  const [draftSandbox, setDraftSandbox] = useState(initData.draftSandbox)

  const allLevels = [...cpus, ...gpus, ...rams].map((c) => Number(c.level)).filter((l) => !isNaN(l))
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const saveSettings = useCallback((lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem('pcbs2_level', JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }, [])

  const openSettings = useCallback(() => {
    setDraftLevel(levelSettings?.level ?? 1)
    setDraftPercent(levelSettings?.percent ?? 0)
    setDraftSandbox(levelSettings?.isSandbox ?? false)
    setShowSettings(true)
  }, [levelSettings])

  const loadData = useCallback(async (version: GameVersion) => {
    setLoading(true)
    const v = version === 'pcbs' ? '?version=pcbs' : ''
    const [c, g, r, mb, p, s, cs, cl] = await Promise.all([
      fetch('/api/cpus' + v).then(r => r.json()),
      fetch('/api/gpus' + v).then(r => r.json()),
      fetch('/api/rams' + v).then(r => r.json()),
      fetch('/api/motherboard' + v).then(r => r.json()),
      fetch('/api/psu' + v).then(r => r.json()),
      fetch('/api/storage' + v).then(r => r.json()),
      fetch('/api/cases' + v).then(r => r.json()),
      fetch('/api/coolers' + v).then(r => r.json()),
    ])
    setCpus(c)
    setGpus(g)
    setRams(r)
    setMotherboards(mb)
    setPsus(p)
    setStorageDrives(s)
    setCases(cs)
    setCoolers(cl)
    setLoading(false)
  }, [])

  const handleGameVersionChange = useCallback((v: GameVersion) => {
    setGameVersion(v)
    loadData(v)
  }, [loadData])

  useEffect(() => { loadData('pcbs2') }, [loadData])

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
        {activeTab === 'buildmaker' && <BuildMaker cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} psus={psus} storageDrives={storageDrives} cases={cases} coolers={coolers} levelSettings={levelSettings} />}
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
