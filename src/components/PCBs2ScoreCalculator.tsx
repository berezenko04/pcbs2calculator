'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Calculator, Cpu, Gpu, MemoryStick, TrendingUp, Settings, X, ChevronDown, Moon, Sun, Star } from 'lucide-react'

interface CPU {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  basic_cpu_score: number
  overclock_basic_cpu_score?: number
  cores: number
  can_overclock: boolean
  frequency: number
  max_freq?: number
  multiplier_step?: number
  voltage?: number
  max_voltage?: number
  increase?: number
  overclock_cpu_score_increase?: number
  series: string
  default_memory_speed: number
  max_memory_channels?: number
  coreclockmultiplier?: number
  memchannelsmultiplier?: number
  memclockmultiplier?: number
  finaladjustment?: number
}

interface GPU {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  single_gpu_graphics_score: number
  oc_single_gpu_score?: number
  vram_gb: number
  wattage: number
  chipset: string
  chipset_series: string
  base_core_clock_freq?: number
  base_mem_clock_freq?: number
  gpu_max_clock?: number
  gpu_max_mem_clock?: number
}

interface RAM {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  total_size_gb: number
  frequency: number
  voltage: number
  max_speed?: number
}

interface Props {
  cpus: CPU[]
  gpus: GPU[]
  rams: RAM[]
}

interface CalculatorState {
  selectedCPU: string | null
  selectedGPU: string | null
  selectedRAM: string | null
  ramQuantity: number
  cpuFreq: number
  gpuCoreFreq: number
  gpuMemFreq: number
  effectiveRamFreq: number | null
}

interface LevelSettings {
  level: number
  percent: number
}

interface ScoreResult {
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: 'Elite' | 'Performance' | 'Good' | 'Average' | 'Budget' | 'Error'
  cpuDetails?: { level: number; series: string; cores: number; frequency: number }
  gpuDetails?: { level: number; series: string; vram_gb: number; wattage: number }
  ramDetails?: { level: number; total_size_gb: number; frequency: number; voltage: number; quantity: number }
}

function isLocked(
  componentLevel: number,
  componentPercent: number | boolean | undefined | null,
  userLevel: number,
  userPercent: number,
): boolean {
  if (componentLevel < userLevel) return false
  if (componentLevel > userLevel) return true
  if (componentPercent === true || componentPercent == null) return false
  return userPercent < Number(componentPercent)
}

function calcCpuScore(cpu: CPU, ram: RAM, ramQty: number, cpuFreq?: number, effectiveRamFreq?: number): number {
  const freq = Number(cpuFreq && cpuFreq > 0 ? cpuFreq : cpu.frequency) || 0
  const baseFreq = Number(cpu.frequency) || 0
  let base = Number(cpu.basic_cpu_score) || 0
  if (freq > baseFreq && cpu.can_overclock && cpu.max_freq && cpu.overclock_basic_cpu_score) {
    const maxFreq = Number(cpu.max_freq)
    if (maxFreq > baseFreq) {
      const t = Math.min(1, (freq - baseFreq) / (maxFreq - baseFreq))
      base += (Number(cpu.overclock_basic_cpu_score) - base) * t
    }
  }
  if (base === 0) return 0

  const ramFreq = Number(effectiveRamFreq ?? Math.min(ram.frequency, cpu.default_memory_speed)) || 0
  const a = Number(cpu.coreclockmultiplier) || 0
  const b = Number(cpu.memchannelsmultiplier) || 0
  const c = Number(cpu.memclockmultiplier) || 0
  const d = Number(cpu.finaladjustment) || 0
  const defMem = Number(cpu.default_memory_speed) || 2666
  const sticks = Math.max(1, ramQty)
  const maxChannels = Number(cpu.max_memory_channels) || 2
  const channels = Math.min(sticks, maxChannels)

  const opt = a * freq + b * maxChannels + c * defMem + d
  const cur = a * freq + b * channels + c * ramFreq + d

  if (opt === 0) return Math.trunc(base)
  const result = Math.trunc(base * cur / opt)
  return Number.isFinite(result) ? result : Math.trunc(base)
}

function calcTotalScore(cpuScore: number, gpuScore: number): number {
  if (cpuScore <= 0 || gpuScore <= 0) return 0
  const w = 0.15
  return Math.trunc(1 / (w / cpuScore + (1 - w) / gpuScore))
}

function calcGpuScore(gpu: GPU, coreFreq?: number, memFreq?: number): number {
  const baseScore = Number(gpu.single_gpu_graphics_score) || 0
  if (baseScore === 0) return 0
  const ocScore = Number(gpu.oc_single_gpu_score ?? baseScore)
  if (ocScore === baseScore) return ocScore

  const baseCore = Number(gpu.base_core_clock_freq)
  const baseMem = Number(gpu.base_mem_clock_freq)
  const maxCore = Number(gpu.gpu_max_clock)
  const maxMem = Number(gpu.gpu_max_mem_clock)
  const curCore = Number(coreFreq && coreFreq > 0 ? coreFreq : baseCore) || baseCore
  const curMem = Number(memFreq && memFreq > 0 ? memFreq : baseMem) || baseMem

  if (!baseCore || !baseMem || !maxCore || !maxMem || maxCore <= baseCore || maxMem <= baseMem)
    return baseScore

  const tCore = (curCore - baseCore) / (maxCore - baseCore)
  const tMem = (curMem - baseMem) / (maxMem - baseMem)
  const t = Math.min(1, (tCore + tMem) / 2)

  return Math.trunc(baseScore + (ocScore - baseScore) * t)
}

function getRank(totalScore: number): ScoreResult['rank'] {
  if (totalScore >= 30000) return 'Elite'
  if (totalScore >= 20000) return 'Performance'
  if (totalScore >= 15000) return 'Good'
  if (totalScore >= 8000) return 'Average'
  return 'Budget'
}

function SearchableSelect<T extends { id: string }>({ options, value, onChange, placeholder, getLabel }: {
  options: T[]
  value: string | null
  onChange: (id: string) => void
  placeholder: string
  getLabel: (item: T) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? options.find((o) => o.id === value) : null

  const filtered = search
    ? options.filter((o) => getLabel(o).toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative mb-4">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? search : (selected ? getLabel(selected) : '')}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true) }}
        onFocus={() => { setIsOpen(true); setSearch('') }}
        placeholder={placeholder}
        className="w-full p-2.5 pr-10 border border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
      />
      <ChevronDown className="absolute right-3 top-4 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-slate-400 dark:text-gray-500 text-sm">No results</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={clsx('w-full text-left p-3 text-sm dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors', item.id === value && 'bg-blue-100 dark:bg-blue-900 dark:text-white font-semibold')}
                onClick={() => { onChange(item.id); setIsOpen(false); setSearch('') }}
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function PCBs2ScoreCalculator({ cpus, gpus, rams }: Props) {
  const [state, setState] = useState<CalculatorState>({
    selectedCPU: null,
    selectedGPU: null,
    selectedRAM: null,
    ramQuantity: 1,
    cpuFreq: 0,
    gpuCoreFreq: 0,
    gpuMemFreq: 0,
    effectiveRamFreq: null,
  })

  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(null)
  const [settingsReady, setSettingsReady] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [draftLevel, setDraftLevel] = useState(1)
  const [draftPercent, setDraftPercent] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [starCount, setStarCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/berezenko04/pcbs2calculator')
      .then(r => r.json())
      .then(d => setStarCount(d.stargazers_count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('pcbs2_dark')
    const isDark = stored === 'true'
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    localStorage.setItem('pcbs2_dark', String(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const allLevels = [
    ...cpus.map((c) => Number(c.level)),
    ...gpus.map((g) => Number(g.level)),
    ...rams.map((r) => Number(r.level)),
  ].filter((l) => !isNaN(l))

  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pcbs2_level')
      if (raw) {
        const parsed = JSON.parse(raw) as LevelSettings
        if (typeof parsed.level === 'number' && typeof parsed.percent === 'number') {
          setLevelSettings(parsed)
          setDraftLevel(parsed.level)
          setDraftPercent(parsed.percent)
          setSettingsReady(true)
          return
        }
      }
    } catch {}
    setShowSettings(true)
    setSettingsReady(true)
  }, [])

  const saveSettings = useCallback((lvl: number, pct: number) => {
    const s: LevelSettings = { level: lvl, percent: pct }
    localStorage.setItem('pcbs2_level', JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }, [])

  const openSettings = () => {
    setDraftLevel(levelSettings?.level ?? 1)
    setDraftPercent(levelSettings?.percent ?? 0)
    setShowSettings(true)
  }

  const availableCPUs = levelSettings
    ? cpus.filter((c) => !isLocked(c.level, c.percent_through, levelSettings.level, levelSettings.percent))
    : cpus
  const availableGPUs = levelSettings
    ? gpus.filter((g) => !isLocked(g.level, g.percent_through, levelSettings.level, levelSettings.percent))
    : gpus
  const availableRAMs = levelSettings
    ? rams.filter((r) => !isLocked(r.level, r.percent_through, levelSettings.level, levelSettings.percent))
    : rams

  useEffect(() => {
    if (!levelSettings) return
    setState((prev) => {
      const cpuId = prev.selectedCPU && availableCPUs.some((c) => c.id === prev.selectedCPU) ? prev.selectedCPU : null
      const cpu = cpuId ? cpus.find((c) => c.id === cpuId) : null
      const maxCh = cpu?.max_memory_channels ?? 2
      return {
        ...prev,
        selectedCPU: cpuId,
        cpuFreq: cpu?.frequency ?? 0,
        selectedGPU: prev.selectedGPU && availableGPUs.some((g) => g.id === prev.selectedGPU) ? prev.selectedGPU : null,
        selectedRAM: prev.selectedRAM && availableRAMs.some((r) => r.id === prev.selectedRAM) ? prev.selectedRAM : null,
        effectiveRamFreq: null,
        ramQuantity: Math.min(prev.ramQuantity, maxCh * 2),
      }
    })
  }, [levelSettings])

  const formatNumber = (num: number): string => new Intl.NumberFormat('en-US').format(num)

  const selectedCPU = state.selectedCPU ? cpus.find((c) => c.id === state.selectedCPU) : null
  const selectedGPU = state.selectedGPU ? gpus.find((g) => g.id === state.selectedGPU) : null
  const selectedRAM = state.selectedRAM ? rams.find((r) => r.id === state.selectedRAM) : null
  const maxRamQuantity = (selectedCPU?.max_memory_channels ?? 2) * 2

  let cpuScore = 0
  let gpuScore = 0
  let totalScore = 0
  let rank: ScoreResult['rank'] = 'Error'

  if (selectedCPU && selectedGPU && selectedRAM) {
    cpuScore = calcCpuScore(selectedCPU, selectedRAM, state.ramQuantity, state.cpuFreq || undefined, state.effectiveRamFreq ?? undefined)
    gpuScore = calcGpuScore(selectedGPU, state.gpuCoreFreq || undefined, state.gpuMemFreq || undefined)
    totalScore = calcTotalScore(cpuScore, gpuScore)
    rank = getRank(totalScore)
  }

  if (!settingsReady) return null

  return (
    <>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => { if (levelSettings) setShowSettings(false) }} className="absolute top-4 right-4 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:text-gray-400 transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Your Level</h2>
              <p className="text-slate-500 dark:text-gray-400 mt-1">Set your in-game level to see available components</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  <span>Level</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{draftLevel}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={maxLevel}
                  value={draftLevel}
                  onChange={(e) => setDraftLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
                  <span>1</span>
                  <span>{maxLevel}</span>
                </div>
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  <span>Progress through level</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{draftPercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draftPercent}
                  onChange={(e) => setDraftPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <button
                onClick={() => saveSettings(draftLevel, draftPercent)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
              >
                {levelSettings ? 'Save' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                {starCount !== null && (
                  <a
                    href="https://github.com/berezenko04/pcbs2calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    <span className="hidden sm:inline">Star</span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {starCount}
                    </span>
                  </a>
                )}
              </div>
              {levelSettings && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDarkMode((p) => !p)}
                    className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all"
                    title="Toggle dark mode"
                  >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={openSettings}
                    className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all"
                    title="Change level settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-gray-100 mb-2">PCBS2 3DMark Calculator</h1>
            <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Calculate your estimated 3DMark score based on your component selections
            </p>

            {levelSettings && (
              <div className="mt-4 inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Level {levelSettings.level} · {levelSettings.percent}% through
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">CPU</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-500">{availableCPUs.length}/{cpus.length}</span>
              </div>
              <SearchableSelect
                  options={availableCPUs}
                  value={state.selectedCPU}
                  onChange={(id) => setState((p) => {
                    const cpu = cpus.find((c) => c.id === id)
                    const maxCh = cpu?.max_memory_channels ?? 2
                    return { ...p, selectedCPU: id, cpuFreq: cpu?.frequency ?? 0, ramQuantity: Math.min(p.ramQuantity, maxCh * 2) }
                  })}
                  placeholder="Select CPU..."
                  getLabel={(cpu) => cpu.part_name}
                />

              {selectedCPU && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg space-y-2 text-sm text-slate-900 dark:text-gray-100">
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Cores:</span><span className="font-semibold">{selectedCPU.cores}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Freq:</span><span className="font-semibold">{selectedCPU.frequency} MHz</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Series:</span><span className="font-semibold">{selectedCPU.series}</span></div>
                  {selectedCPU.can_overclock && selectedCPU.max_freq && selectedCPU.max_freq > selectedCPU.frequency && (
                    <div className="pt-2 border-t border-blue-200 space-y-2 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">CPU Freq:</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{state.cpuFreq || selectedCPU.frequency} MHz</span>
                      </div>
                      <input
                        type="range"
                        min={selectedCPU.frequency}
                        max={selectedCPU.max_freq}
                        step={Math.max(1, Math.round((selectedCPU.max_freq - selectedCPU.frequency) / 20))}
                        value={state.cpuFreq || selectedCPU.frequency}
                        onChange={(e) => setState((p) => ({ ...p, cpuFreq: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedCPU.frequency} MHz</span>
                        <span>{selectedCPU.max_freq} MHz</span>
                      </div>
                    </div>
                  )}
                  {selectedCPU.can_overclock && <div className="text-green-600 dark:text-green-400 font-semibold text-xs">Overclockable</div>}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Gpu className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">GPU</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-500">{availableGPUs.length}/{gpus.length}</span>
              </div>
              <SearchableSelect
                  options={availableGPUs}
                  value={state.selectedGPU}
                  onChange={(id) => setState((p) => {
                    const gpu = gpus.find((g) => g.id === id)
                    return { ...p, selectedGPU: id, gpuCoreFreq: gpu?.base_core_clock_freq ?? 0, gpuMemFreq: gpu?.base_mem_clock_freq ?? 0 }
                  })}
                  placeholder="Select GPU..."
                  getLabel={(gpu) => `${gpu.manufacturer} ${gpu.part_name}`}
                />

              {selectedGPU && (
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg space-y-2 text-sm text-slate-900 dark:text-gray-100">
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">VRAM:</span><span className="font-semibold">{selectedGPU.vram_gb} GB</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">TDP:</span><span className="font-semibold">{selectedGPU.wattage} W</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Series:</span><span className="font-semibold">{selectedGPU.chipset_series}</span></div>
                  {selectedGPU.oc_single_gpu_score && selectedGPU.base_core_clock_freq && selectedGPU.gpu_max_clock && selectedGPU.gpu_max_clock > selectedGPU.base_core_clock_freq && (
                    <div className="pt-2 border-t border-green-200 space-y-2 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">Core Clock:</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">{state.gpuCoreFreq || selectedGPU.base_core_clock_freq} MHz</span>
                      </div>
                      <input
                        type="range"
                        min={selectedGPU.base_core_clock_freq}
                        max={selectedGPU.gpu_max_clock}
                        step={1}
                        value={state.gpuCoreFreq || selectedGPU.base_core_clock_freq}
                        onChange={(e) => setState((p) => ({ ...p, gpuCoreFreq: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedGPU.base_core_clock_freq} MHz</span>
                        <span>{selectedGPU.gpu_max_clock} MHz</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">Mem Clock:</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">{state.gpuMemFreq || selectedGPU.base_mem_clock_freq} MHz</span>
                      </div>
                      <input
                        type="range"
                        min={selectedGPU.base_mem_clock_freq}
                        max={selectedGPU.gpu_max_mem_clock}
                        step={1}
                        value={state.gpuMemFreq || selectedGPU.base_mem_clock_freq}
                        onChange={(e) => setState((p) => ({ ...p, gpuMemFreq: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedGPU.base_mem_clock_freq} MHz</span>
                        <span>{selectedGPU.gpu_max_mem_clock} MHz</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MemoryStick className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">RAM</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-500">{availableRAMs.length}/{rams.length}</span>
              </div>
              <SearchableSelect
                  options={availableRAMs}
                  value={state.selectedRAM}
                  onChange={(id) => setState((p) => ({ ...p, selectedRAM: id, effectiveRamFreq: null }))}
                  placeholder="Select RAM..."
                  getLabel={(ram) => `${ram.manufacturer} ${ram.part_name} ${ram.total_size_gb}GB ${ram.frequency}MHz`}
                />

              {selectedRAM && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-slate-600 dark:text-gray-400">Qty:</span>
                  <button
                    onClick={() => setState((p) => ({ ...p, ramQuantity: Math.max(1, (p.ramQuantity || 1) - 1) }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                  >−</button>
                  <span className="w-6 text-center font-semibold text-slate-900 dark:text-gray-100">{state.ramQuantity || 1}</span>
                  <button
                    onClick={() => setState((p) => ({ ...p, ramQuantity: Math.min(maxRamQuantity, (p.ramQuantity || 1) + 1) }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                  >+</button>
                </div>
              )}

              {selectedRAM && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/50 rounded-lg space-y-2 text-sm text-slate-900 dark:text-gray-100">
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Total:</span><span className="font-semibold">{selectedRAM.total_size_gb * state.ramQuantity} GB ({state.ramQuantity}×{selectedRAM.total_size_gb}GB)</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">Freq (rated):</span><span className="font-semibold">{selectedRAM.frequency} MHz</span></div>
                  {(() => {
                    const cpuDef = selectedCPU?.default_memory_speed ?? selectedRAM.frequency
                    const defFreq = Math.min(selectedRAM.frequency, cpuDef)
                    const xmpFreq = selectedRAM.frequency
                    const maxFreq = selectedRAM.max_speed ?? xmpFreq
                    const curVal = state.effectiveRamFreq ?? defFreq
                    const isCustom = state.effectiveRamFreq !== null

                    const setFreq = (freq: number | null) => setState((p) => ({ ...p, effectiveRamFreq: freq }))

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-gray-400">Freq (BIOS):</span>
                          <input
                            type="number"
                            min={defFreq}
                            max={maxFreq}
                            step={100}
                            value={curVal}
                            onChange={(e) => {
                              const v = e.target.value ? Math.min(Math.max(Number(e.target.value), defFreq), maxFreq) : defFreq
                              setFreq(v)
                            }}
                            className="w-24 p-1 text-right border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 font-semibold text-sm"
                          />
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => setFreq(null)}
                            className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', !isCustom && curVal === defFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                          >Default</button>
                          <button
                            type="button"
                            onClick={() => setFreq(xmpFreq)}
                            className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', isCustom && curVal === xmpFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                          >XMP</button>

                        </div>
                        {isCustom && curVal !== xmpFreq && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 p-1.5 rounded mt-1">XMP disabled: using {curVal} MHz instead of rated {xmpFreq} MHz</div>
                        )}
                        {!isCustom && xmpFreq > cpuDef && (
                          <div className="text-xs text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 p-1.5 rounded mt-1">Capped to CPU default ({defFreq} MHz). Enable XMP for {xmpFreq} MHz</div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">Your 3DMark Score Estimate</h2>

            {selectedCPU && selectedGPU && selectedRAM && rank !== 'Error' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="bg-blue-500/20 dark:bg-blue-400/20 p-2.5 rounded-lg">
                      <Cpu className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">CPU Score</div>
                      <div className="text-2xl font-bold text-blue-400">{formatNumber(cpuScore)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="bg-green-500/20 dark:bg-green-400/20 p-2.5 rounded-lg">
                      <Gpu className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">GPU Score</div>
                      <div className="text-2xl font-bold text-green-400">{formatNumber(gpuScore)}</div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-slate-800 px-4 py-1 rounded-full text-xs text-slate-400 dark:text-gray-500 border border-white/10">TOTAL</span>
                  </div>
                </div>

                <div className="text-center py-2">
                  <div className="text-6xl font-bold tracking-tight">{formatNumber(totalScore)}</div>
                  <div className={clsx(
                    'inline-flex items-center gap-2 px-5 py-2 mt-3 rounded-full text-sm font-semibold border',
                    rank === 'Elite' && 'bg-green-500/20 text-green-300 border-green-500/30',
                    rank === 'Performance' && 'bg-blue-500/20 dark:bg-blue-400/20 text-blue-300 border-blue-500/30',
                    rank === 'Good' && 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                    rank === 'Average' && 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                    rank === 'Budget' && 'bg-red-500/20 text-red-300 border-red-500/30',
                  )}>
                    <TrendingUp className="h-4 w-4" />
                    {rank} Performance
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setState({ selectedCPU: null, selectedGPU: null, selectedRAM: null, ramQuantity: 1, cpuFreq: 0, gpuCoreFreq: 0, gpuMemFreq: 0, effectiveRamFreq: null })}
                    className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-slate-400 dark:text-gray-500" />
                <h3 className="text-xl font-semibold mb-2">No Selection</h3>
                <p className="text-slate-400 dark:text-gray-500">Select all three components to calculate your score</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
