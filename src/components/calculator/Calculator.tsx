'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import { Calculator as CalcIcon, Cpu, Gpu, MemoryStick } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { calcCpuScoreBenchmark, calcGpuScore, calcGpuScoreBenchmark, calcTotalScore, getRank, supportsSli, isLocked, formatNumber } from '@/lib/calculator'
import type { CPU, GPU, RAM, CalculatorState, LevelSettings, ScoreResult, BenchmarkTest } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'
import Slider from '@/components/ui/Slider'
import SearchableSelect from '@/components/ui/SearchableSelect'
import CalculatorScoreCard from './CalculatorScoreCard'

const DEFAULT_STATE: CalculatorState = {
  selectedCPU: null, selectedGPU: null, selectedRAM: null,
  ramQuantity: 1, cpuFreq: 0, gpuQuantity: 1,
  gpuCoreFreq: 0, gpuMemFreq: 0, effectiveRamFreq: null,
  testMode: 'standard',
}

interface Props {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]; levelSettings: LevelSettings | null; gameVersion: GameVersion
  initialState?: Partial<CalculatorState>
  onStateChange?: (state: CalculatorState) => void
}

export default function Calculator({ cpus, gpus, rams, levelSettings, gameVersion, initialState, onStateChange }: Props) {
  const { t } = useLang()
  const [state, setState] = useState<CalculatorState>(() => ({ ...DEFAULT_STATE, ...initialState }))
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!onStateChange) return
    const timer = setTimeout(() => onStateChange(stateRef.current), 300)
    return () => clearTimeout(timer)
  }, [state, onStateChange])

  useEffect(() => {
    if (state.testMode !== 'standard' && (gameVersion === 'pcbs' || state.gpuQuantity > 1)) {
      setState((p) => ({ ...p, testMode: 'standard' }))
    }
  }, [gameVersion, state.gpuQuantity])

  const availableCPUs = useMemo(() => levelSettings?.isSandbox ? cpus : levelSettings ? cpus.filter((c) => !isLocked(c.level, c.percent_through, levelSettings.level, levelSettings.percent)) : cpus, [levelSettings, cpus])
  const availableGPUs = useMemo(() => levelSettings?.isSandbox ? gpus : levelSettings ? gpus.filter((g) => !isLocked(g.level, g.percent_through, levelSettings.level, levelSettings.percent)) : gpus, [levelSettings, gpus])
  const availableRAMs = useMemo(() => levelSettings?.isSandbox ? rams : levelSettings ? rams.filter((r) => !isLocked(r.level, r.percent_through, levelSettings.level, levelSettings.percent)) : rams, [levelSettings, rams])

  useEffect(() => {
    if (!levelSettings) return
    setState((prev) => {
      const newCpuId = prev.selectedCPU && availableCPUs.some((c) => c.id === prev.selectedCPU) ? prev.selectedCPU : null
      const newGpuId = prev.selectedGPU && availableGPUs.some((g) => g.id === prev.selectedGPU) ? prev.selectedGPU : null
      const newRamId = prev.selectedRAM && availableRAMs.some((r) => r.id === prev.selectedRAM) ? prev.selectedRAM : null
      if (prev.selectedCPU === newCpuId && prev.selectedGPU === newGpuId && prev.selectedRAM === newRamId) return prev
      const newCpu = newCpuId ? cpus.find((c) => c.id === newCpuId) : null
      return {
        ...prev,
        selectedCPU: newCpuId, selectedGPU: newGpuId, selectedRAM: newRamId,
        cpuFreq: newCpu?.frequency ?? 0, effectiveRamFreq: null,
        ramQuantity: Math.min(prev.ramQuantity || 0, (newCpu?.max_memory_channels ?? 2) * 2),
      }
    })
  }, [levelSettings, cpus, gpus, rams, availableCPUs, availableGPUs, availableRAMs])

  const selectedCPU = state.selectedCPU ? cpus.find((c) => c.id === state.selectedCPU) ?? null : null
  const selectedGPU = state.selectedGPU ? gpus.find((g) => g.id === state.selectedGPU) ?? null : null
  const selectedRAM = state.selectedRAM ? rams.find((r) => r.id === state.selectedRAM) ?? null : null
  const maxRamQuantity = (selectedCPU?.max_memory_channels ?? 2) * 2

  let cpuScore = 0, gpuScore = 0, totalScore = 0
  let rank: ScoreResult['rank'] = 'Error'
  if (selectedCPU && selectedGPU && selectedRAM) {
    cpuScore = calcCpuScoreBenchmark(selectedCPU, selectedRAM, state.ramQuantity || 1, state.testMode || 'standard', state.cpuFreq || undefined, state.effectiveRamFreq ?? undefined)
    gpuScore = state.testMode && state.testMode !== 'standard'
      ? calcGpuScoreBenchmark(selectedGPU, state.testMode, state.gpuCoreFreq || undefined, state.gpuMemFreq || undefined, state.gpuQuantity || 1)
      : calcGpuScore(selectedGPU, state.gpuCoreFreq || undefined, state.gpuMemFreq || undefined, state.gpuQuantity || 1)
    totalScore = calcTotalScore(cpuScore, gpuScore)
    rank = getRank(totalScore)
  }

  return (
    <>
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
            options={availableCPUs} value={state.selectedCPU}
            onChange={(id) => setState((p) => {
              const cpu = cpus.find((c) => c.id === id)
              const maxCh = cpu?.max_memory_channels ?? 2
              return { ...p, selectedCPU: id, cpuFreq: cpu?.frequency ?? 0, ramQuantity: Math.min(p.ramQuantity || 1, maxCh * 2) }
            })}
            placeholder={t('select_cpu')} getLabel={(cpu) => `${cpu.manufacturer} ${cpu.part_name}`} noResultsText={t('no_results')}
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
                  <Slider min={selectedCPU.frequency} max={selectedCPU.max_freq}
                    step={Math.max(1, Math.round((selectedCPU.max_freq - selectedCPU.frequency) / 20))}
                    value={state.cpuFreq || selectedCPU.frequency}
                    onChange={(v) => setState((p) => ({ ...p, cpuFreq: v }))}
                    className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                    <span>{selectedCPU.frequency} {t('mhz')}</span><span>{selectedCPU.max_freq} {t('mhz')}</span>
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
            options={availableGPUs} value={state.selectedGPU}
            onChange={(id) => setState((p) => {
              const gpu = gpus.find((g) => g.id === id)
              const qty = gpu && supportsSli(gpu) ? p.gpuQuantity : 1
              return { ...p, selectedGPU: id, gpuQuantity: qty, gpuCoreFreq: gpu?.base_core_clock_freq ?? 0, gpuMemFreq: gpu?.base_mem_clock_freq ?? 0 }
            })}
            placeholder={t('select_gpu')} getLabel={(gpu) => `${gpu.manufacturer} ${gpu.part_name}`} noResultsText={t('no_results')}
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
                    <button type="button" onClick={() => setState((p) => ({ ...p, gpuQuantity: 1 }))}
                      className={clsx('px-3 py-1 text-xs font-medium rounded-lg transition-colors', state.gpuQuantity === 1 ? 'bg-green-600 text-white shadow-sm' : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700')}
                    >1x</button>
                    <button type="button" onClick={() => setState((p) => ({ ...p, gpuQuantity: 2 }))}
                      className={clsx('px-3 py-1 text-xs font-medium rounded-lg transition-colors', state.gpuQuantity === 2 ? 'bg-green-600 text-white shadow-sm' : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700')}
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
                  <Slider min={selectedGPU.base_core_clock_freq} max={selectedGPU.gpu_max_clock} step={1}
                    value={state.gpuCoreFreq || selectedGPU.base_core_clock_freq || 0}
                    onChange={(v) => setState((p) => ({ ...p, gpuCoreFreq: v }))}
                    className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                    <span>{selectedGPU.base_core_clock_freq} {t('mhz')}</span><span>{selectedGPU.gpu_max_clock} {t('mhz')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-gray-400">{t('mem_clock')}</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">{state.gpuMemFreq || selectedGPU.base_mem_clock_freq} {t('mhz')}</span>
                  </div>
                  <Slider min={selectedGPU.base_mem_clock_freq} max={selectedGPU.gpu_max_mem_clock} step={1}
                    value={state.gpuMemFreq || selectedGPU.base_mem_clock_freq || 0}
                    onChange={(v) => setState((p) => ({ ...p, gpuMemFreq: v }))}
                    className="w-full h-1.5 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                    <span>{selectedGPU.base_mem_clock_freq} {t('mhz')}</span><span>{selectedGPU.gpu_max_mem_clock} {t('mhz')}</span>
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
            options={availableRAMs} value={state.selectedRAM}
            onChange={(id) => setState((p) => ({ ...p, selectedRAM: id, effectiveRamFreq: null }))}
            placeholder={t('select_ram')}
            getLabel={(ram) => `${ram.manufacturer} ${ram.part_name} ${ram.total_size_gb}GB ${ram.frequency}MHz`}
            noResultsText={t('no_results')}
          />
          {selectedRAM && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-slate-600 dark:text-gray-400">{t('qty')}</span>
                <button type="button" onClick={() => setState((p) => ({ ...p, ramQuantity: Math.max(1, (p.ramQuantity || 1) - 1) }))}
                  className="w-8 h-8 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('decrease') || 'Decrease'}>−</button>
                <span className="w-6 text-center font-semibold text-slate-900 dark:text-gray-100">{state.ramQuantity || 1}</span>
                <button type="button" onClick={() => setState((p) => ({ ...p, ramQuantity: Math.min(maxRamQuantity, (p.ramQuantity || 1) + 1) }))}
                  className="w-8 h-8 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('increase') || 'Increase'}>+</button>
              </div>
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
                          <input type="number" min={defFreq} max={maxFreq} step={100} value={curVal}
                            onChange={(e) => { const v = e.target.value ? Math.min(Math.max(Number(e.target.value), defFreq), maxFreq) : defFreq; setFreq(v) }}
                            className="w-24 p-1 pr-9 text-right border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 font-semibold text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label={t('frequency_bios')}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-gray-500 pointer-events-none select-none">{t('mhz')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        <button type="button" onClick={() => setFreq(null)}
                          className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', !isCustom && curVal === defFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                        >{t('default')}</button>
                        <button type="button" onClick={() => setFreq(xmpFreq)}
                          className={clsx('flex-1 py-1 rounded text-xs font-medium transition-colors', isCustom && curVal === xmpFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                        >{t('xmp')}</button>
                      </div>
                      {isCustom && curVal !== xmpFreq && <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 p-1.5 rounded mt-1">{t('xmp_disabled', String(curVal), String(xmpFreq))}</div>}
                      {!isCustom && xmpFreq > cpuDef && <div className="text-xs text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 p-1.5 rounded mt-1">{t('capped', String(defFreq), String(xmpFreq))}</div>}
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {(gameVersion === 'pcbs' ? (['standard'] as BenchmarkTest[]) : (['standard', 'timespy_extreme', 'port_royal', 'speedway'] as BenchmarkTest[])).map((mode) => {
          const gpuUnsupported = mode !== 'standard' && selectedGPU && !(mode === 'timespy_extreme' ? selectedGPU.allow_timespy_extreme : mode === 'port_royal' ? selectedGPU.allow_port_royal : selectedGPU.allow_speedway)
          const multiGpuBlocked = state.gpuQuantity > 1 && mode !== 'standard'
          const disabled = gpuUnsupported || multiGpuBlocked
          return (
            <button type="button" key={mode} onClick={() => setState((p) => ({ ...p, testMode: mode }))}
              disabled={!!disabled}
              className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                state.testMode === mode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : disabled
                    ? 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600'
              )}
            >
              {mode === 'standard' ? 'Time Spy' : mode === 'timespy_extreme' ? 'Time Spy Extreme' : mode === 'port_royal' ? 'Port Royal' : 'Speedway'}
            </button>
          )
        })}
      </div>

      <CalculatorScoreCard
        cpuScore={cpuScore} gpuScore={gpuScore} totalScore={totalScore}
        rank={rank} testMode={state.testMode || 'standard'}
        hasSelection={!!(selectedCPU && selectedGPU && selectedRAM)}
        onReset={() => setState({ selectedCPU: null, selectedGPU: null, selectedRAM: null, ramQuantity: 1, cpuFreq: 0, gpuQuantity: 1, gpuCoreFreq: 0, gpuMemFreq: 0, effectiveRamFreq: null, testMode: 'standard' })}
      />
    </>
  )
}
