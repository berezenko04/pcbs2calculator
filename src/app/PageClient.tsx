'use client'

import { useReducer, useEffect, useCallback, useMemo } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, LevelSettings } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'
import Calculator from '@/components/calculator/Calculator'
import BuildMaker from '@/components/BuildMaker'
import BuildUpgrader from '@/components/BuildUpgrader'
import LevelSettingsModal from '@/components/calculator/LevelSettingsModal'


interface DataState {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]
  motherboards: Motherboard[]; psus: PSU[]
  storageDrives: StorageDrive[]; cases: Case[]; coolers: Cooler[]
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
  | { type: 'SET_ACTIVE_TAB'; payload: TabId }
  | { type: 'SET_GAME_VERSION'; payload: GameVersion }
  | { type: 'SET_LEVEL_SETTINGS'; payload: LevelSettings | null }
  | { type: 'SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_DRAFT'; payload: { level: number; percent: number; sandbox: boolean } }

export type { DataState }

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
  return {
    activeTab: 'calculator',
    gameVersion: 'pcbs',
    levelSettings: null,
    showSettings: true,
    draftLevel: 1,
    draftPercent: 0,
    draftSandbox: false,
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

interface PageClientProps {
  pcbs: DataState
  pcbs2: DataState
}

export default function PageClient({ pcbs, pcbs2 }: PageClientProps) {
  const [data, setData] = useReducer((s: DataState, p: DataState) => p, pcbs)
  const [ui, dispatch] = useReducer(uiReducer, undefined, initialUiState)

  const allLevels = useMemo(() =>
    [...data.cpus, ...data.gpus, ...data.rams].map((c) => Number(c.level)).filter((l) => !isNaN(l)),
    [data.cpus, data.gpus, data.rams],
  )
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const allData = useMemo(() => ({ pcbs, pcbs2 }), [pcbs, pcbs2])

  const loadData = useCallback((version: GameVersion) => {
    setData(allData[version])
    const saved = loadLevelForVersion(version)
    if (saved) {
      dispatch({ type: 'SET_LEVEL_SETTINGS', payload: saved })
    } else {
      dispatch({ type: 'SET_LEVEL_SETTINGS', payload: null })
      dispatch({ type: 'SHOW_SETTINGS', payload: true })
    }
  }, [allData])

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pcbs2_game_version') as GameVersion | null
      if (stored && ['pcbs', 'pcbs2'].includes(stored) && stored !== 'pcbs') {
        dispatch({ type: 'SET_GAME_VERSION', payload: stored })
      }
    } catch {}
  }, [])

  useEffect(() => { loadData(ui.gameVersion) }, [ui.gameVersion, loadData])

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
        {ui.activeTab === 'calculator' && <Calculator cpus={data.cpus} gpus={data.gpus} rams={data.rams} levelSettings={ui.levelSettings} gameVersion={ui.gameVersion} />}
        {ui.activeTab === 'buildmaker' && <BuildMaker cpus={data.cpus} gpus={data.gpus} rams={data.rams} motherboards={data.motherboards} psus={data.psus} storageDrives={data.storageDrives} cases={data.cases} coolers={data.coolers} levelSettings={ui.levelSettings} gameVersion={ui.gameVersion} />}
        {ui.activeTab === 'upgrader' && <BuildUpgrader cpus={data.cpus} gpus={data.gpus} rams={data.rams} motherboards={data.motherboards} cases={data.cases} levelSettings={ui.levelSettings} />}
      </AppShell>
    </>
  )
}
