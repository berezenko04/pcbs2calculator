'use client'

import { useState, useMemo, useCallback } from 'react'
import { Wrench, Cpu, Gpu, MemoryStick, TrendingUp, Search, DollarSign, Target, Sliders, Info, Layers, HardDrive, Box, Zap, Fan } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { estimateBuildScore, formatNumber, formatSizeGb, supportsSli, isLocked } from '@/lib/calculator'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, LevelSettings } from '@/lib/types'
import InputCard from '@/components/ui/InputCard'
import SelectCard from '@/components/ui/SelectCard'
import ToggleSwitch from '@/components/ui/ToggleSwitch'

const SOCKETS = ['AM4', 'LGA 1151 (Coffee Lake)', 'LGA 1151 (Kaby Lake)', 'LGA 1151 (Skylake)', 'LGA 1200', 'LGA 2066', 'TR4', 'sTRX4'] as const
const CASE_SIZES = ['Mini-ITX', 'Micro-ATX', 'S-ATX', 'E-ATX', 'XL-ATX']

const AMD_SOCKETS = new Set(['AM4', 'TR4', 'sTRX4'])
const INTEL_SOCKETS = new Set(['LGA 1151 (Coffee Lake)', 'LGA 1151 (Kaby Lake)', 'LGA 1151 (Skylake)', 'LGA 1200', 'LGA 2066'])

interface BuildResultSimple {
  cpu: CPU
  gpu: GPU
  ram: RAM
  ramQty: number
  gpuQty: number
  totalPrice: number
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: string
  totalTdp: number
}

interface BuildResultFull {
  cpu: CPU
  gpu: GPU
  ram: RAM
  ramQty: number
  gpuQty: number
  motherboard: Motherboard
  psu: PSU
  storage: StorageDrive
  case: Case
  cooler: Cooler
  totalPrice: number
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: string
  totalTdp: number
}

type BuildResult = BuildResultSimple | BuildResultFull

interface Props {
  cpus: CPU[]
  gpus: GPU[]
  rams: RAM[]
  motherboards: Motherboard[]
  psus: PSU[]
  storageDrives: StorageDrive[]
  cases: Case[]
  coolers: Cooler[]
  levelSettings: LevelSettings | null
}

export default function BuildMaker({ cpus, gpus, rams, motherboards, psus, storageDrives, cases, coolers, levelSettings }: Props) {
  const { t } = useLang()

  const [mode, setMode] = useState<'simple' | 'full'>('simple')
  const [budget, setBudget] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [targetScore, setTargetScore] = useState(0)
  const [scoreOffset, setScoreOffset] = useState(1000)
  const [socket, setSocket] = useState('')
  const [cpuBrand, setCpuBrand] = useState('')
  const [gpuBrand, setGpuBrand] = useState('')
  const [useSli, setUseSli] = useState(false)
  const [cpuOc, setCpuOc] = useState(false)
  const [gpuOc, setGpuOc] = useState(false)
  const [minRamGb, setMinRamGb] = useState(0)
  const [minStorageGb, setMinStorageGb] = useState(0)
  const [moboSize, setMoboSize] = useState('')
  const [storageType, setStorageType] = useState('')
  const [results, setResults] = useState<BuildResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [budgetError, setBudgetError] = useState('')

  const availableBudget = mode === 'full' ? budget : budget - remaining

  const storageTypes = useMemo(() => [...new Set(storageDrives.map(s => s.type).filter(Boolean))], [storageDrives]).sort()
  const storageSizeOptions = useMemo(() => {
    const seen = new Set<string>()
    return [...new Set(storageDrives.map(s => s.size_gb).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))
      .reduce<string[]>((acc, v) => {
        const f = formatSizeGb(Number(v))
        if (!seen.has(f)) { seen.add(f); acc.push(f) }
        return acc
      }, [])
  }, [storageDrives])
  const ramSizes = useMemo(() => {
    const sizes = new Set(rams.map(r => r.total_size_gb).filter(Boolean))
    sizes.add(64)
    return [...sizes].sort((a, b) => a - b)
  }, [rams])

  const cpuBrandOptions = useMemo(() => {
    if (!socket) return ['AMD', 'Intel']
    if (AMD_SOCKETS.has(socket)) return ['AMD']
    if (INTEL_SOCKETS.has(socket)) return ['Intel']
    return ['AMD', 'Intel']
  }, [socket])

  const handleSocketChange = useCallback((v: string) => {
    setSocket(v)
    if (v && cpuBrand && ((AMD_SOCKETS.has(v) && cpuBrand === 'Intel') || (INTEL_SOCKETS.has(v) && cpuBrand === 'AMD'))) setCpuBrand('')
  }, [cpuBrand])

  const handleCpuBrandChange = useCallback((v: string) => {
    setCpuBrand(v)
    if (v && socket && ((v === 'AMD' && INTEL_SOCKETS.has(socket)) || (v === 'Intel' && AMD_SOCKETS.has(socket)))) setSocket('')
  }, [socket])

  const isFull = (r: BuildResult): r is BuildResultFull => 'motherboard' in r

  const doSimpleSearch = () => {
    const available = budget - remaining
    if (available <= 0) return

    const levelFilter = levelSettings && !levelSettings.isSandbox
      ? (lvl: number, pct: number | boolean | undefined | null) => isLocked(lvl, pct, levelSettings.level, levelSettings.percent)
      : () => false

    const cpuCandidates = cpus.filter((c) => {
      if (c.price > available * 0.6) return false
      if (cpuOc && !c.can_overclock) return false
      if (levelFilter(c.level, c.percent_through)) return false
      return true
    })

    const gpuCandidates = gpus.filter((g) => {
      if (useSli && !supportsSli(g)) return false
      if (g.price > available * 0.6) return false
      if (levelFilter(g.level, g.percent_through)) return false
      return true
    })

    const ramCandidates = rams.filter((r) => {
      if (r.total_size_gb < minRamGb) return false
      if (r.price > available * 0.2) return false
      if (levelFilter(r.level, r.percent_through)) return false
      return true
    })

    const found: BuildResultSimple[] = []
    const gpuQty = useSli ? 2 : 1
    const ramQty = 2
    const bestBuilds = new Map<string, BuildResultSimple>()

    for (const cpu of cpuCandidates) {
      for (const gpu of gpuCandidates) {
        for (const ram of ramCandidates) {
          const totalPrice = cpu.price + gpu.price * gpuQty + ram.price * ramQty
          if (totalPrice > available) continue

          const score = estimateBuildScore(cpu, gpu, ram, ramQty, gpuQty, cpuOc, gpuOc)
          if (score.totalScore < targetScore || (scoreOffset > 0 && score.totalScore > targetScore + scoreOffset)) continue

          const key = `${cpu.id}|${gpu.id}|${gpuQty}|${ramQty}`
          const totalTdp = cpu.wattage + gpu.wattage * gpuQty
          if (!bestBuilds.has(key) || score.totalScore > bestBuilds.get(key)!.totalScore) {
            bestBuilds.set(key, {
              cpu, gpu, ram, ramQty, gpuQty,
              totalPrice,
              cpuScore: score.cpuScore,
              gpuScore: score.gpuScore,
              totalScore: score.totalScore,
              rank: score.rank,
              totalTdp,
            })
          }
        }
      }
    }
    found.push(...bestBuilds.values())

    function selectDiverseBuilds(builds: BuildResultSimple[], maxCount: number): BuildResultSimple[] {
      if (builds.length <= 1) return builds.slice(0, maxCount)
      const sorted = [...builds].sort((a, b) => b.totalScore - a.totalScore)
      const selected = [sorted[0]]
      const usedCpu = new Set([sorted[0].cpu.id])
      const usedGpu = new Set([sorted[0].gpu.id])

      for (let i = 1; i < sorted.length && selected.length < maxCount; i++) {
        const b = sorted[i]
        if (usedCpu.has(b.cpu.id) || usedGpu.has(b.gpu.id)) continue
        let ok = true
        for (const s of selected) {
          let diff = 0
          if (b.cpu.id !== s.cpu.id) diff++
          if (b.gpu.id !== s.gpu.id) diff++
          if (b.ram.id !== s.ram.id) diff++
          if (diff < 2) { ok = false; break }
        }
        if (ok) {
          selected.push(b)
          usedCpu.add(b.cpu.id)
          usedGpu.add(b.gpu.id)
        }
      }
      if (selected.length < maxCount) {
        for (const b of sorted) {
          if (selected.length >= maxCount) break
          if (selected.some(s => s === b)) continue
          selected.push(b)
        }
      }
      return selected
    }

    setResults(selectDiverseBuilds(found, 10))
    setSearched(true)
  }

  const doFullSearch = async () => {
    if (budget <= 0) return
    try {
      const res = await fetch('/api/build-maker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget, targetScore, scoreOffset, socket, cpuBrand, gpuBrand,
          useSli, cpuOc, gpuOc, minRamGb, minStorageGb, moboSize, storageType,
          level: levelSettings?.level ?? 0,
          levelPercent: levelSettings?.percent ?? 0,
          levelSandbox: levelSettings?.isSandbox ?? false,
        }),
      })
      const data = await res.json()
      setResults(data.builds)
      setSearched(true)
    } catch (e) {
      console.error(e)
      setSearched(true)
    }
  }

  const doSearch = useCallback(async () => {
    if (budget <= 0) {
      setBudgetError(t('bm_enter_budget'))
      setTimeout(() => setBudgetError(''), 2500)
      return
    }
    setSearching(true)
    setResults([])
    setSearched(false)
    await new Promise(r => setTimeout(r, 50))
    try {
      if (mode === 'full') {
        await doFullSearch()
      } else {
        doSimpleSearch()
      }
    } catch (e) {
      console.error(e)
    }
    setSearching(false)
  }, [mode, budget, remaining, targetScore, scoreOffset, socket, cpuBrand, gpuBrand, useSli, cpuOc, gpuOc, minRamGb, minStorageGb, moboSize, storageType, cpus, gpus, rams, levelSettings])

  // UI render below

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => { setMode('simple'); setResults([]); setSearched(false) }}
            className={'px-5 py-2 rounded-lg text-sm font-medium transition-all ' + (mode === 'simple' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400')}
          >
            {t('bm_simple')}
          </button>
          <button
            onClick={() => { setMode('full'); setResults([]); setSearched(false) }}
            className={'px-5 py-2 rounded-lg text-sm font-medium transition-all ' + (mode === 'full' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400')}
          >
            {t('bm_full_build')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <InputCard icon={<DollarSign className="h-4 w-4 text-emerald-500" />} label={t('bm_budget')} value={budget} onChange={setBudget} min={0} />

        {mode === 'simple' && (
          <InputCard icon={<Info className="h-4 w-4 text-sky-500" />} label={t('bm_remaining')} value={remaining} onChange={setRemaining} min={0}>
            <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
              {t('bm_available')}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${formatNumber(availableBudget)}</span>
            </div>
          </InputCard>
        )}

        <InputCard icon={<Target className="h-4 w-4 text-rose-500" />} label={t('bm_target_score')} value={targetScore} onChange={setTargetScore} min={0} />
        <InputCard icon={<TrendingUp className="h-4 w-4 text-orange-500" />} label={t('bm_score_offset')} value={scoreOffset} onChange={setScoreOffset} min={0} />

        {mode === 'full' && (
          <SelectCard icon={<Cpu className="h-4 w-4 text-blue-500" />} label={t('bm_socket')} value={socket} onChange={handleSocketChange} options={[...SOCKETS]} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && (
          <SelectCard icon={<Layers className="h-4 w-4 text-purple-500" />} label={t('bm_cpu_brand')} value={cpuBrand} onChange={handleCpuBrandChange} options={cpuBrandOptions} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && (
          <SelectCard icon={<Gpu className="h-4 w-4 text-green-500" />} label={t('bm_gpu_brand')} value={gpuBrand} onChange={setGpuBrand} options={['AMD', 'NVIDIA']} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && (
          <SelectCard icon={<MemoryStick className="h-4 w-4 text-purple-500" />} label={t('bm_min_ram')} value={minRamGb ? minRamGb + 'GB' : ''} onChange={(v) => setMinRamGb(Number(v.replace('GB', '')))} options={ramSizes.map(s => s + 'GB')} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && (
          <SelectCard icon={<Box className="h-4 w-4 text-orange-500" />} label={t('bm_mobo_size')} value={moboSize} onChange={setMoboSize} options={[...CASE_SIZES]} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && (
          <SelectCard icon={<HardDrive className="h-4 w-4 text-cyan-500" />} label={t('bm_storage_type')} value={storageType} onChange={setStorageType} options={storageTypes} anyLabel={t('bm_any')} />
        )}

        {mode === 'full' && storageSizeOptions.length > 0 && (
          <SelectCard icon={<HardDrive className="h-4 w-4 text-teal-500" />} label={t('bm_min_storage')} value={minStorageGb ? formatSizeGb(minStorageGb) : ''} onChange={(v) => setMinStorageGb(Number(v.replace('TB', '').replace('GB', '')) * (v.includes('TB') ? 1000 : 1))} options={storageSizeOptions} anyLabel={t('bm_any')} />
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
            <Sliders className="h-4 w-4 text-indigo-500" />
            {t('bm_options')}
          </label>
          <div className="space-y-3">
            <ToggleSwitch label="SLI / Crossfire" checked={useSli} onChange={setUseSli} />
            <ToggleSwitch label={t('bm_cpu_oc')} checked={cpuOc} onChange={setCpuOc} activeColor="bg-blue-600" />
            <ToggleSwitch label={t('bm_gpu_oc')} checked={gpuOc} onChange={setGpuOc} />
          </div>
        </div>
      </div>

      {/* Search button */}
      <div className="text-center mb-8">
        <button
          onClick={doSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-5 w-5" />
          {searching ? t('bm_searching') : t('bm_find')}
        </button>
        {budgetError && (
          <div className="mt-3 text-sm text-rose-500 dark:text-rose-400 font-medium animate-pulse">
            {budgetError}
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Wrench className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-gray-500" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-1">{t('bm_no_results')}</h3>
              <p className="text-sm text-slate-400 dark:text-gray-500 max-w-md mx-auto">{t('bm_no_results_desc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-500 dark:text-gray-400 mb-2">
                {t('bm_found', String(results.length))}
              </div>
              {results.map((r, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {i === 0 ? t('bm_best_match') : t('bm_option') + ' #' + (i + 1)}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${formatNumber(r.totalPrice)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.cpu.manufacturer} {r.cpu.part_name}</div>
                        <div className="text-xs text-slate-400">{formatNumber(r.cpuScore)} {t('bm_pts')} · ${formatNumber(r.cpu.price)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gpu className="h-4 w-4 text-green-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.gpu.manufacturer} {r.gpu.part_name}{r.gpuQty > 1 ? ' x' + r.gpuQty : ''}</div>
                        <div className="text-xs text-slate-400">{formatNumber(r.gpuScore)} {t('bm_pts')} · ${formatNumber(r.gpu.price * r.gpuQty)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.ram.manufacturer} {r.ram.part_name} x{r.ramQty}</div>
                        <div className="text-xs text-slate-400">{r.ram.total_size_gb * r.ramQty}GB {r.ram.frequency}MHz · ${formatNumber(r.ram.price * r.ramQty)}</div>
                      </div>
                    </div>
                    {isFull(r) && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Layers className="h-4 w-4 text-orange-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.motherboard.manufacturer} {r.motherboard.part_name}</div>
                            <div className="text-xs text-slate-400">{r.motherboard.motherboard_size} · ${formatNumber(r.motherboard.price)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Fan className="h-4 w-4 text-cyan-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.cooler.manufacturer} {r.cooler.part_name}</div>
                            <div className="text-xs text-slate-400">${formatNumber(r.cooler.price)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.psu.manufacturer} {r.psu.part_name}</div>
                            <div className="text-xs text-slate-400">{r.psu.wattage}W · ${formatNumber(r.psu.price)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-cyan-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.storage.manufacturer} {r.storage.part_name}</div>
                            <div className="text-xs text-slate-400">{formatSizeGb(r.storage.size_gb)} · ${formatNumber(r.storage.price)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Box className="h-4 w-4 text-gray-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.case.manufacturer} {r.case.part_name}</div>
                            <div className="text-xs text-slate-400">${formatNumber(r.case.price)}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_3dmark_score')}:</span>
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(r.totalScore)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-gray-500">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>{r.totalTdp}W</span>
                      </div>
                    </div>
                    <span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (
                      r.rank === 'Elite' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                      r.rank === 'Performance' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                      r.rank === 'Good' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                      r.rank === 'Average' ? 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300' :
                      'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                    )}>
                      {t(r.rank.toLowerCase())}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
