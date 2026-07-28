"use client"

import { useReducer, useEffect, useCallback } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'
import Calculator from '@/components/calculator/Calculator'
import BuildMaker from '@/components/BuildMaker'
import BuildUpgrader from '@/components/BuildUpgrader'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'
import { getCachedData, setCachedData } from '@/lib/dataCache'
import { useLang } from '@/lib/i18n/context'

interface DataState {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]
  motherboards: Motherboard[]; psus: PSU[]
  storageDrives: StorageDrive[]; cases: Case[]; coolers: Cooler[]
  loading: boolean
}

interface UiState {
  activeTab: TabId
  gameVersion: GameVersion
  levelSettings: LevelSettings | null
  showSettings: boolean
  draftLevel: number
  draftPercent: number
  draftSandbox: boolean
}

type Action =
  | { type: 'SET_DATA'; payload: DataState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: TabId }
  | { type: 'SET_GAME_VERSION'; payload: GameVersion }
  | { type: 'SET_LEVEL_SETTINGS'; payload: LevelSettings | null }
  | { type: 'SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_DRAFT'; payload: { level: number; percent: number; sandbox: boolean } }

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

function initialUiState(): UiState {
  const gv: GameVersion = (() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pcbs2_game_version') as GameVersion | null
      if (stored && ['pcbs', 'pcbs2'].includes(stored)) return stored
    }
    return 'pcbs'
  })()
  const saved = loadLevelForVersion(gv)
  return {
    activeTab: 'calculator',
    gameVersion: gv,
    levelSettings: saved,
    showSettings: saved === null,
    draftLevel: saved?.level ?? 1,
    draftPercent: saved?.percent ?? 0,
    draftSandbox: saved?.isSandbox ?? false,
  }
}

function uiReducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload }
    case 'SET_GAME_VERSION': return { ...state, gameVersion: action.payload }
    case 'SET_LEVEL_SETTINGS': return { ...state, levelSettings: action.payload, showSettings: false }
    case 'SHOW_SETTINGS': return { ...state, showSettings: action.payload }
    case 'SET_DRAFT': return { ...state, ...action.payload }
    default: return state
  }
}

function LoadingFallback() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-slate-400 text-lg">{t('loading')}</div>
    </div>
  )
}

const initialData: DataState = {
  cpus: [], gpus: [], rams: [],
  motherboards: [], psus: [],
  storageDrives: [], cases: [], coolers: [],
  loading: true,
}

function HomeInner() {
  const [data, setData] = useReducer((s: DataState, p: Partial<DataState>) => ({ ...s, ...p }), initialData)
  const [ui, dispatch] = useReducer(uiReducer, undefined, initialUiState)

  const allLevels = [...data.cpus, ...data.gpus, ...data.rams].map((c) => Number(c.level)).filter((l) => !isNaN(l))
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const loadData = useCallback(async (version: GameVersion) => {
    const cached = getCachedData(version)
    if (cached) {
      setData({ ...cached, loading: false })
      return
    }
    setData({ loading: true })
    const q = `?version=${version}`
    try {
      const responses = await Promise.all([
        fetch('/api/cpus' + q), fetch('/api/gpus' + q), fetch('/api/rams' + q),
        fetch('/api/motherboard' + q), fetch('/api/psu' + q),
        fetch('/api/storage' + q), fetch('/api/cases' + q), fetch('/api/coolers' + q),
      ])
      for (const r of responses) {
        if (!r.ok) throw new Error(`HTTP ${r.status} from ${r.url.split('?')[0]}`)
      }
      const [c, g, r, mb, p, s, cs, cl] = await Promise.all(responses.map(r => r.json()))
      const result = {
        cpus: c, gpus: g, rams: r, motherboards: mb, psus: p,
        storageDrives: s, cases: cs, coolers: cl, loading: false,
      }
      setCachedData(version, result)
      setData(result)
    } catch {
      setData({ loading: false })
    }

    const saved = loadLevelForVersion(version)
    if (saved) {
      dispatch({ type: 'SET_LEVEL_SETTINGS', payload: saved })
    } else {
      dispatch({ type: 'SET_LEVEL_SETTINGS', payload: null })
      dispatch({ type: 'SHOW_SETTINGS', payload: true })
    }
  }, [])

  const handleGameVersionChange = useCallback((v: GameVersion) => {
    dispatch({ type: 'SET_GAME_VERSION', payload: v })
    localStorage.setItem('pcbs2_game_version', v)
    loadData(v)
  }, [loadData])

  const saveSettings = useCallback((lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem(levelKey(ui.gameVersion), JSON.stringify(s))
    dispatch({ type: 'SET_LEVEL_SETTINGS', payload: s })
  }, [ui.gameVersion])

  const openSettings = useCallback(() => {
    dispatch({ type: 'SET_DRAFT', payload: { level: ui.levelSettings?.level ?? 1, percent: ui.levelSettings?.percent ?? 0, sandbox: ui.levelSettings?.isSandbox ?? false } })
    dispatch({ type: 'SHOW_SETTINGS', payload: true })
  }, [ui.levelSettings])

  useEffect(() => { loadData(ui.gameVersion) }, [ui.gameVersion, loadData])

  if (data.loading) return <LoadingFallback />

  return (
    <>
      {ui.showSettings && (
        <LevelSettingsModal
          initialLevel={ui.draftLevel} initialPercent={ui.draftPercent} initialSandbox={ui.draftSandbox}
          maxLevel={maxLevel} hasExistingSettings={!!ui.levelSettings}
          onClose={() => { if (ui.levelSettings) dispatch({ type: 'SHOW_SETTINGS', payload: false }) }}
          onSave={saveSettings}
        />
      )}
      <AppShell activeTab={ui.activeTab} onTabChange={(t) => dispatch({ type: 'SET_ACTIVE_TAB', payload: t })} levelSettings={ui.levelSettings} onOpenSettings={openSettings} gameVersion={ui.gameVersion} onGameVersionChange={handleGameVersionChange}>
        {ui.activeTab === 'calculator' && <Calculator cpus={data.cpus} gpus={data.gpus} rams={data.rams} levelSettings={ui.levelSettings} />}
        {ui.activeTab === 'buildmaker' && <BuildMaker cpus={data.cpus} gpus={data.gpus} rams={data.rams} motherboards={data.motherboards} psus={data.psus} storageDrives={data.storageDrives} cases={data.cases} coolers={data.coolers} levelSettings={ui.levelSettings} gameVersion={ui.gameVersion} />}
        {ui.activeTab === 'upgrader' && <BuildUpgrader cpus={data.cpus} gpus={data.gpus} rams={data.rams} motherboards={data.motherboards} cases={data.cases} levelSettings={ui.levelSettings} />}
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
