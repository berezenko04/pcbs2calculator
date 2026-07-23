'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import clsx from 'clsx'
import { Calculator, Cpu, Gpu, MemoryStick, TrendingUp, Settings, X, ChevronDown } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'

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
  double_gpu_graphics_score?: number | string
  oc_double_gpu_score?: number | string
  gpu_power_increase?: number
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
  gpuQuantity: number
  gpuCoreFreq: number
  gpuMemFreq: number
  effectiveRamFreq: number | null
}

interface LevelSettings {
  level: number
  percent: number
  isSandbox?: boolean
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

function supportsSli(gpu: GPU): boolean {
  return gpu.double_gpu_graphics_score !== undefined
    && gpu.double_gpu_graphics_score !== null
    && gpu.double_gpu_graphics_score !== 'false'
}

function calcGpuScore(gpu: GPU, coreFreq?: number, memFreq?: number, gpuQuantity?: number): number {
  const isDual = gpuQuantity === 2 && supportsSli(gpu)
  const baseScore = isDual
    ? Number(gpu.double_gpu_graphics_score) || 0
    : Number(gpu.single_gpu_graphics_score) || 0
  if (baseScore === 0) return 0
  const ocScore = isDual
    ? Number(gpu.oc_double_gpu_score ?? gpu.double_gpu_graphics_score ?? baseScore)
    : Number(gpu.oc_single_gpu_score ?? baseScore)
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

function Slider({ min, max, step, value, onChange, className }: {
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  const [local, setLocal] = useState<number | null>(null)
  const display = local ?? value

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={display}
      onChange={(e) => {
        setLocal(Number(e.target.value))
      }}
      onPointerUp={() => {
        if (local !== null) { onChange(local); setLocal(null) }
      }}
      onPointerLeave={() => {
        if (local !== null) { onChange(local); setLocal(null) }
      }}
      className={className}
    />
  )
}

function SearchableSelect<T extends { id: string }>({ options, value, onChange, placeholder, getLabel, noResultsText }: {
  options: T[]
  value: string | null
  onChange: (id: string) => void
  placeholder: string
  getLabel: (item: T) => string
  noResultsText?: string
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
            <div className="p-3 text-slate-400 dark:text-gray-500 text-sm">{noResultsText || 'No results'}</div>
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
  const { t } = useLang()
  const [state, setState] = useState<CalculatorState>({
    selectedCPU: null,
    selectedGPU: null,
    selectedRAM: null,
    ramQuantity: 1,
    cpuFreq: 0,
    gpuQuantity: 1,
    gpuCoreFreq: 0,
    gpuMemFreq: 0,
    effectiveRamFreq: null,
  })

  const initData = useMemo(() => {
    const init: {
      levelSettings: LevelSettings | null
      showSettings: boolean
      draftLevel: number
      draftPercent: number
      draftSandbox: boolean
    } = { levelSettings: null, showSettings: false, draftLevel: 1, draftPercent: 0, draftSandbox: false }
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
  const [settingsReady, setSettingsReady] = useState(true)
  const [showSettings, setShowSettings] = useState(initData.showSettings)
  const [draftLevel, setDraftLevel] = useState(initData.draftLevel)
  const [draftPercent, setDraftPercent] = useState(initData.draftPercent)
  const [draftSandbox, setDraftSandbox] = useState(initData.draftSandbox)


  const allLevels = [
    ...cpus.map((c) => Number(c.level)),
    ...gpus.map((g) => Number(g.level)),
    ...rams.map((r) => Number(r.level)),
  ].filter((l) => !isNaN(l))

  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 30

  const saveSettings = useCallback((lvl: number, pct: number, sandbox: boolean) => {
    const s: LevelSettings = { level: lvl, percent: pct, isSandbox: sandbox }
    localStorage.setItem('pcbs2_level', JSON.stringify(s))
    setLevelSettings(s)
    setShowSettings(false)
  }, [])

  const openSettings = () => {
    setDraftLevel(levelSettings?.level ?? 1)
    setDraftPercent(levelSettings?.percent ?? 0)
    setDraftSandbox(levelSettings?.isSandbox ?? false)
    setShowSettings(true)
  }

  const availableCPUs = levelSettings?.isSandbox
    ? cpus
    : levelSettings
      ? cpus.filter((c) => !isLocked(c.level, c.percent_through, levelSettings.level, levelSettings.percent))
      : cpus
  const availableGPUs = levelSettings?.isSandbox
    ? gpus
    : levelSettings
      ? gpus.filter((g) => !isLocked(g.level, g.percent_through, levelSettings.level, levelSettings.percent))
      : gpus
  const availableRAMs = levelSettings?.isSandbox
    ? rams
    : levelSettings
      ? rams.filter((r) => !isLocked(r.level, r.percent_through, levelSettings.level, levelSettings.percent))
      : rams

  const levelSettingsKey = levelSettings ? `${levelSettings.level}-${levelSettings.percent}` : null
  useEffect(() => {
    if (!levelSettings) return
    const cpuId = state.selectedCPU && availableCPUs.some((c) => c.id === state.selectedCPU) ? state.selectedCPU : null
    const cpu = cpuId ? cpus.find((c) => c.id === cpuId) : null
    const maxCh = cpu?.max_memory_channels ?? 2
    if (state.selectedCPU !== cpuId || state.selectedGPU !== (state.selectedGPU && availableGPUs.some((g) => g.id === state.selectedGPU) ? state.selectedGPU : null) || state.selectedRAM !== (state.selectedRAM && availableRAMs.some((r) => r.id === state.selectedRAM) ? state.selectedRAM : null)) {
      setState((prev) => ({
        ...prev,
        selectedCPU: cpuId,
        cpuFreq: cpu?.frequency ?? 0,
        selectedGPU: prev.selectedGPU && availableGPUs.some((g) => g.id === prev.selectedGPU) ? prev.selectedGPU : null,
        selectedRAM: prev.selectedRAM && availableRAMs.some((r) => r.id === prev.selectedRAM) ? prev.selectedRAM : null,
        effectiveRamFreq: null,
        ramQuantity: Math.min(prev.ramQuantity, maxCh * 2),
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelSettingsKey])

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
    gpuScore = calcGpuScore(selectedGPU, state.gpuCoreFreq || undefined, state.gpuMemFreq || undefined, state.gpuQuantity)
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
              <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{t('your_level')}</h2>
              <p className="text-slate-500 dark:text-gray-400 mt-1">{t('level_desc')}</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('sandbox_mode')}</span>
                <button
                  onClick={() => setDraftSandbox((p) => !p)}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors',
                    draftSandbox ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-600'
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    draftSandbox && 'translate-x-5'
                  )} />
                </button>
              </div>

              {!draftSandbox && (
                <>
                  <div>
                    <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      <span>{t('level')}</span>
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
                      <span>{t('progress_through')}</span>
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
                </>
              )}

              <button
                onClick={() => saveSettings(draftLevel, draftPercent, draftSandbox)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
              >
                {levelSettings ? t('save') : t('get_started')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-2.5 rounded-xl">
              <Calculator className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{t('title')}</h1>
              <p className="text-sm text-slate-500 dark:text-gray-400">{t('subtitle')}</p>
            </div>
          </div>
          {levelSettings && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                {levelSettings.isSandbox ? t('sandbox_mode') : t('level_badge', String(levelSettings.level), String(levelSettings.percent))}
              </div>
              <button
                onClick={openSettings}
                className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all"
                title={t('change_level')}
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">{t('cpu')}</h2>
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
                  placeholder={t('select_cpu')}
                  getLabel={(cpu) => cpu.part_name}
                  noResultsText={t('no_results')}
                />

              {selectedCPU && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg space-y-2 text-sm text-slate-900 dark:text-gray-100">
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('cores')}</span><span className="font-semibold">{selectedCPU.cores}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('frequency')}</span><span className="font-semibold">{selectedCPU.frequency} {t('mhz')}</span></div>
                  {selectedCPU.can_overclock && selectedCPU.max_freq && selectedCPU.max_freq > selectedCPU.frequency && (
                    <div className="pt-2 border-t border-blue-200 space-y-2 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">{t('cpu_frequency')}</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{state.cpuFreq || selectedCPU.frequency} {t('mhz')}</span>
                      </div>
                      <Slider
                        min={selectedCPU.frequency}
                        max={selectedCPU.max_freq}
                        step={Math.max(1, Math.round((selectedCPU.max_freq - selectedCPU.frequency) / 20))}
                        value={state.cpuFreq || selectedCPU.frequency}
                        onChange={(v) => setState((p) => ({ ...p, cpuFreq: v }))}
                        className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedCPU.frequency} {t('mhz')}</span>
                        <span>{selectedCPU.max_freq} {t('mhz')}</span>
                      </div>
                    </div>
                  )}
                  {selectedCPU.can_overclock && <div className="text-green-600 dark:text-green-400 font-semibold text-xs">{t('overclockable')}</div>}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Gpu className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">{t('gpu')}</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-500">{availableGPUs.length}/{gpus.length}</span>
              </div>
              <SearchableSelect
                  options={availableGPUs}
                  value={state.selectedGPU}
                  onChange={(id) => setState((p) => {
                    const gpu = gpus.find((g) => g.id === id)
                    const qty = gpu && supportsSli(gpu) ? p.gpuQuantity : 1
                    return { ...p, selectedGPU: id, gpuQuantity: qty, gpuCoreFreq: gpu?.base_core_clock_freq ?? 0, gpuMemFreq: gpu?.base_mem_clock_freq ?? 0 }
                  })}
                  placeholder={t('select_gpu')}
                  getLabel={(gpu) => `${gpu.manufacturer} ${gpu.part_name}`}
                  noResultsText={t('no_results')}
                />

              {selectedGPU && (
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg space-y-2 text-sm text-slate-900 dark:text-gray-100">
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('vram')}</span><span className="font-semibold">{selectedGPU.vram_gb} {t('gb')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('tdp')}</span><span className="font-semibold">{selectedGPU.wattage + (state.gpuQuantity === 2 && supportsSli(selectedGPU) ? (selectedGPU.gpu_power_increase ?? 0) : 0)} {t('w')}</span></div>
                  {supportsSli(selectedGPU) && (
                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400">
                        <span className="text-xs font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">SLI</span>
                        {t('gpu_qty')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setState((p) => ({ ...p, gpuQuantity: 1 }))}
                          className={clsx(
                            'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                            state.gpuQuantity === 1
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700'
                          )}
                        >1x</button>
                        <button
                          onClick={() => setState((p) => ({ ...p, gpuQuantity: 2 }))}
                          className={clsx(
                            'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                            state.gpuQuantity === 2
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700'
                          )}
                        >2x</button>
                      </div>
                    </div>
                  )}
                  {selectedGPU.oc_single_gpu_score && selectedGPU.base_core_clock_freq && selectedGPU.gpu_max_clock && selectedGPU.gpu_max_clock > selectedGPU.base_core_clock_freq && (
                    <div className="pt-2 border-t border-green-200 space-y-2 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">{t('core_clock')}</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">{state.gpuCoreFreq || selectedGPU.base_core_clock_freq} {t('mhz')}</span>
                      </div>
                      <Slider
                        min={selectedGPU.base_core_clock_freq}
                        max={selectedGPU.gpu_max_clock}
                        step={1}
                        value={state.gpuCoreFreq || selectedGPU.base_core_clock_freq || 0}
                        onChange={(v) => setState((p) => ({ ...p, gpuCoreFreq: v }))}
                        className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedGPU.base_core_clock_freq} {t('mhz')}</span>
                        <span>{selectedGPU.gpu_max_clock} {t('mhz')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-gray-400">{t('mem_clock')}</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">{state.gpuMemFreq || selectedGPU.base_mem_clock_freq} {t('mhz')}</span>
                      </div>
                      <Slider
                        min={selectedGPU.base_mem_clock_freq}
                        max={selectedGPU.gpu_max_mem_clock}
                        step={1}
                        value={state.gpuMemFreq || selectedGPU.base_mem_clock_freq || 0}
                        onChange={(v) => setState((p) => ({ ...p, gpuMemFreq: v }))}
                        className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        <span>{selectedGPU.base_mem_clock_freq} {t('mhz')}</span>
                        <span>{selectedGPU.gpu_max_mem_clock} {t('mhz')}</span>
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
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">{t('ram')}</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-500">{availableRAMs.length}/{rams.length}</span>
              </div>
              <SearchableSelect
                  options={availableRAMs}
                  value={state.selectedRAM}
                  onChange={(id) => setState((p) => ({ ...p, selectedRAM: id, effectiveRamFreq: null }))}
                  placeholder={t('select_ram')}
                  getLabel={(ram) => `${ram.manufacturer} ${ram.part_name} ${ram.total_size_gb}GB ${ram.frequency}MHz`}
                  noResultsText={t('no_results')}
                />

              {selectedRAM && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-slate-600 dark:text-gray-400">{t('qty')}</span>
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
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('total')}</span><span className="font-semibold">{selectedRAM.total_size_gb * state.ramQuantity} {t('gb')} ({state.ramQuantity}×{selectedRAM.total_size_gb}GB)</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-gray-400">{t('frequency_rated')}</span><span className="font-semibold">{selectedRAM.frequency} {t('mhz')}</span></div>
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
                          <span className="text-slate-600 dark:text-gray-400">{t('frequency_bios')}</span>
                          <div className="relative">
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
                              className="w-24 p-1 pr-9 text-right border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 font-semibold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-gray-500 pointer-events-none select-none">{t('mhz')}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => setFreq(null)}
                            className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', !isCustom && curVal === defFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                          >{t('default')}</button>
                          <button
                            type="button"
                            onClick={() => setFreq(xmpFreq)}
                            className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', isCustom && curVal === xmpFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                          >{t('xmp')}</button>

                        </div>
                        {isCustom && curVal !== xmpFreq && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 p-1.5 rounded mt-1">{t('xmp_disabled', String(curVal), String(xmpFreq))}</div>
                        )}
                        {!isCustom && xmpFreq > cpuDef && (
                          <div className="text-xs text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 p-1.5 rounded mt-1">{t('capped', String(defFreq), String(xmpFreq))}</div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">{t('score_title')}</h2>

            {selectedCPU && selectedGPU && selectedRAM && rank !== 'Error' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="bg-blue-500/20 dark:bg-blue-400/20 p-2.5 rounded-lg">
                      <Cpu className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('cpu_score')}</div>
                      <div className="text-2xl font-bold text-blue-400">{formatNumber(cpuScore)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="bg-green-500/20 dark:bg-green-400/20 p-2.5 rounded-lg">
                      <Gpu className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('gpu_score')}</div>
                      <div className="text-2xl font-bold text-green-400">{formatNumber(gpuScore)}</div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-slate-800 px-4 py-1 rounded-full text-xs text-slate-400 dark:text-gray-500 border border-white/10">{t('total_label')}</span>
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
                    {t('rank_performance', t(rank.toLowerCase()))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setState({ selectedCPU: null, selectedGPU: null, selectedRAM: null, ramQuantity: 1, cpuFreq: 0, gpuQuantity: 1, gpuCoreFreq: 0, gpuMemFreq: 0, effectiveRamFreq: null })}
                    className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    {t('reset')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-slate-400 dark:text-gray-500" />
                <h3 className="text-xl font-semibold mb-2">{t('no_selection')}</h3>
                <p className="text-slate-400 dark:text-gray-500">{t('no_selection_desc')}</p>
              </div>
            )}
          </div>
    </>
  )
}
