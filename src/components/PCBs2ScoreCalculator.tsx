'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Calculator, Cpu, Monitor, MemoryStick, TrendingUp, Settings, X, ChevronDown } from 'lucide-react'

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
  overclockCPU: boolean
  overclockGPU: boolean
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

function calcCpuScore(cpu: CPU, ram: RAM, ramQty: number, overclock: boolean, effectiveRamFreq?: number): number {
  const base = Number(overclock && cpu.can_overclock
    ? (cpu.overclock_basic_cpu_score ?? cpu.basic_cpu_score)
    : cpu.basic_cpu_score) || 0
  if (base === 0) return 0

  const freq = Number(cpu.frequency) || 0
  const ramFreq = Number(effectiveRamFreq ?? ram.frequency) || 0
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

  if (opt === 0) return base
  const result = Math.trunc(base * cur / opt)
  return Number.isFinite(result) ? result : base
}

function calcTotalScore(cpuScore: number, gpuScore: number): number {
  if (cpuScore <= 0 || gpuScore <= 0) return 0
  const w = 0.15
  return Math.trunc(1 / (w / cpuScore + (1 - w) / gpuScore))
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
        className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg cursor-pointer bg-white text-sm"
      />
      <ChevronDown className="absolute right-3 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-slate-400 text-sm">No results</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={clsx('w-full text-left p-3 text-sm hover:bg-blue-50 transition-colors', item.id === value && 'bg-blue-100 font-semibold')}
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
    overclockCPU: false,
    overclockGPU: false,
    effectiveRamFreq: null,
  })

  const [levelSettings, setLevelSettings] = useState<LevelSettings | null>(null)
  const [settingsReady, setSettingsReady] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [draftLevel, setDraftLevel] = useState(1)
  const [draftPercent, setDraftPercent] = useState(0)

  const allLevels = [
    ...cpus.map((c) => c.level),
    ...gpus.map((g) => g.level),
    ...rams.map((r) => r.level),
  ].filter((l): l is number => typeof l === 'number' && Number.isFinite(l))

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
        selectedGPU: prev.selectedGPU && availableGPUs.some((g) => g.id === prev.selectedGPU) ? prev.selectedGPU : null,
        selectedRAM: prev.selectedRAM && availableRAMs.some((r) => r.id === prev.selectedRAM) ? prev.selectedRAM : null,
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
    const gpuBase = state.overclockGPU
      ? (selectedGPU.oc_single_gpu_score || selectedGPU.single_gpu_graphics_score)
      : selectedGPU.single_gpu_graphics_score
    gpuScore = gpuBase

    cpuScore = calcCpuScore(selectedCPU, selectedRAM, state.ramQuantity, state.overclockCPU, state.effectiveRamFreq ?? undefined)
    totalScore = calcTotalScore(cpuScore, gpuScore)
    rank = getRank(totalScore)
  }

  if (!settingsReady) return null

  return (
    <>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => { if (levelSettings) setShowSettings(false) }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="bg-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-7 w-7 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Your Level</h2>
              <p className="text-slate-500 mt-1">Set your in-game level to see available components</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>Level</span>
                  <span className="text-indigo-600 font-bold text-lg">{draftLevel}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={maxLevel}
                  value={draftLevel}
                  onChange={(e) => setDraftLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>{maxLevel}</span>
                </div>
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>Progress through level</span>
                  <span className="text-indigo-600 font-bold text-lg">{draftPercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draftPercent}
                  onChange={(e) => setDraftPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 relative">
            {levelSettings && (
              <button
                onClick={openSettings}
                className="absolute right-0 top-0 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all"
                title="Change level settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}

            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">PCBS2 3DMark Calculator</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Calculate your estimated 3DMark score based on your component selections
            </p>

            {levelSettings && (
              <div className="mt-4 inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Level {levelSettings.level} · {levelSettings.percent}% through
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Cpu className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">CPU</h2>
                </div>
                <span className="text-xs text-slate-400">{availableCPUs.length}/{cpus.length}</span>
              </div>
              <SearchableSelect
                  options={availableCPUs}
                  value={state.selectedCPU}
                  onChange={(id) => setState((p) => {
                    const cpu = cpus.find((c) => c.id === id)
                    const maxCh = cpu?.max_memory_channels ?? 2
                    return { ...p, selectedCPU: id, ramQuantity: Math.min(p.ramQuantity, maxCh * 2) }
                  })}
                  placeholder="Select CPU..."
                  getLabel={(cpu) => cpu.part_name}
                />

              {selectedCPU && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Cores:</span><span className="font-semibold">{selectedCPU.cores}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Freq:</span><span className="font-semibold">{selectedCPU.frequency} MHz</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Series:</span><span className="font-semibold">{selectedCPU.series}</span></div>
                  {selectedCPU.can_overclock && <div className="text-green-600 font-semibold">Overclockable</div>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Monitor className="h-6 w-6 text-green-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">GPU</h2>
                </div>
                <span className="text-xs text-slate-400">{availableGPUs.length}/{gpus.length}</span>
              </div>
              <SearchableSelect
                  options={availableGPUs}
                  value={state.selectedGPU}
                  onChange={(id) => setState((p) => ({ ...p, selectedGPU: id }))}
                  placeholder="Select GPU..."
                  getLabel={(gpu) => `${gpu.manufacturer} ${gpu.part_name}`}
                />

              {selectedGPU && (
                <div className="p-4 bg-green-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">VRAM:</span><span className="font-semibold">{selectedGPU.vram_gb} GB</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">TDP:</span><span className="font-semibold">{selectedGPU.wattage} W</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Series:</span><span className="font-semibold">{selectedGPU.chipset_series}</span></div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MemoryStick className="h-6 w-6 text-purple-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">RAM</h2>
                </div>
                <span className="text-xs text-slate-400">{availableRAMs.length}/{rams.length}</span>
              </div>
              <SearchableSelect
                  options={availableRAMs}
                  value={state.selectedRAM}
                  onChange={(id) => setState((p) => ({ ...p, selectedRAM: id }))}
                  placeholder="Select RAM..."
                  getLabel={(ram) => `${ram.manufacturer} ${ram.part_name} ${ram.total_size_gb}GB ${ram.frequency}MHz`}
                />

              {selectedRAM && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-slate-600">Qty:</span>
                  <button
                    onClick={() => setState((p) => ({ ...p, ramQuantity: Math.max(1, (p.ramQuantity || 1) - 1) }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                  >−</button>
                  <span className="w-6 text-center font-semibold text-slate-900">{state.ramQuantity || 1}</span>
                  <button
                    onClick={() => setState((p) => ({ ...p, ramQuantity: Math.min(maxRamQuantity, (p.ramQuantity || 1) + 1) }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                  >+</button>
                </div>
              )}

              {selectedRAM && (
                <div className="p-4 bg-purple-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Total:</span><span className="font-semibold">{selectedRAM.total_size_gb * state.ramQuantity} GB ({state.ramQuantity}×{selectedRAM.total_size_gb}GB)</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Freq (rated):</span><span className="font-semibold">{selectedRAM.frequency} MHz</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Freq (effective):</span>
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      step={100}
                      value={state.effectiveRamFreq ?? selectedRAM.frequency}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null
                        setState((p) => ({ ...p, effectiveRamFreq: v }))
                      }}
                      className="w-24 p-1 text-right border border-purple-300 rounded bg-white text-slate-900 font-semibold text-sm"
                    />
                  </div>
                  {state.effectiveRamFreq !== null && state.effectiveRamFreq !== selectedRAM.frequency && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-1.5 rounded mt-1">
                      ⚠ XMP disabled: using effective freq ({state.effectiveRamFreq} MHz) instead of rated ({selectedRAM.frequency} MHz)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-orange-600 mr-2" />
              Overclock Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {([
                { label: 'CPU Overclock', desc: 'Increases CPU score', key: 'overclockCPU' as const },
                { label: 'GPU Overclock', desc: 'Increases GPU score', key: 'overclockGPU' as const },
              ]).map(({ label, desc, key }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-slate-900">{label}</h3>
                    <p className="text-sm text-slate-600">{desc}</p>
                  </div>
                  <button
                    onClick={() => setState((p) => ({ ...p, [key]: !p[key] }))}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      state[key] ? 'bg-orange-500' : 'bg-slate-300',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      state[key] ? 'translate-x-6' : 'translate-x-1',
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">Your 3DMark Score Estimate</h2>

            {selectedCPU && selectedGPU && selectedRAM && rank !== 'Error' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-1">CPU Score</div>
                    <div className="text-3xl font-bold text-blue-400">{formatNumber(cpuScore)}</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-1">GPU Score</div>
                    <div className="text-3xl font-bold text-green-400">{formatNumber(gpuScore)}</div>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-6 text-center">
                  <div className="text-sm text-slate-300 mb-1">Total Score</div>
                  <div className="text-5xl font-bold">{formatNumber(totalScore)}</div>
                  <div className={clsx(
                    'inline-flex items-center px-4 py-2 mt-4 rounded-full text-sm font-medium border',
                    rank === 'Elite' && 'bg-green-500/20 text-green-300 border-green-500/30',
                    rank === 'Performance' && 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    rank === 'Good' && 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                    rank === 'Average' && 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                    rank === 'Budget' && 'bg-red-500/20 text-red-300 border-red-500/30',
                  )}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {rank} Performance
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 text-sm">
                  <h3 className="text-lg font-semibold mb-3">Component Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div><span className="text-slate-400">CPU:</span> {selectedCPU.series} (Lvl {selectedCPU.level})</div>
                    <div><span className="text-slate-400">Cores:</span> {selectedCPU.cores}</div>
                    <div><span className="text-slate-400">Freq:</span> {selectedCPU.frequency} MHz</div>
                    <div><span className="text-slate-400">GPU:</span> {selectedGPU.chipset_series} (Lvl {selectedGPU.level})</div>
                    <div><span className="text-slate-400">VRAM:</span> {selectedGPU.vram_gb} GB</div>
                    <div><span className="text-slate-400">RAM:</span> {selectedRAM.total_size_gb * state.ramQuantity} GB @ {selectedRAM.frequency} MHz</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setState({ selectedCPU: null, selectedGPU: null, selectedRAM: null, ramQuantity: 1, overclockCPU: false, overclockGPU: false, effectiveRamFreq: null })}
                    className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-semibold mb-2">No Selection</h3>
                <p className="text-slate-400">Select all three components to calculate your score</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
