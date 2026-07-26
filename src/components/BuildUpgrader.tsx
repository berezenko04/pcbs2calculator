'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import { ArrowUp, Cpu, Gpu, MemoryStick, TrendingUp, DollarSign, Target, Search, Layers, Box, Info } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { calcCpuScore, calcGpuScore, calcTotalScore, getRank, formatNumber, supportsSli, isLocked } from '@/lib/calculator'
import type { CPU, GPU, RAM, Motherboard, Case, LevelSettings } from '@/lib/types'
import InputCard from '@/components/ui/InputCard'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ToggleSwitch from '@/components/ui/ToggleSwitch'

interface UpgradeResult {
  strategy: string
  label: string
  cost: number
  oldTotalScore: number
  newTotalScore: number
  scoreDelta: number
  cpu: CPU
  gpu: GPU
  ram: RAM
  ramQty: number
  gpuQty: number
  rank: string
  newCpu?: CPU
  newGpu?: GPU
  newRam?: RAM
  newRamQty?: number
}

interface Props {
  cpus: CPU[]
  gpus: GPU[]
  rams: RAM[]
  motherboards: Motherboard[]
  cases: Case[]
  levelSettings: LevelSettings | null
}

export default function BuildUpgrader({ cpus, gpus, rams, motherboards, cases, levelSettings }: Props) {
  const { t } = useLang()

  const [budget, setBudget] = useState(0)
  const [reserve, setReserve] = useState(0)
  const [targetScore, setTargetScore] = useState(0)
  const [offset, setOffset] = useState(1000)

  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [selectedCPU, setSelectedCPU] = useState<string | null>(null)
  const [selectedGPU, setSelectedGPU] = useState<string | null>(null)
  const [selectedRAM, setSelectedRAM] = useState<string | null>(null)
  const [selectedMobo, setSelectedMobo] = useState<string | null>(null)

  const [ramQuantity, setRamQuantity] = useState(1)
  const [effectiveRamFreq, setEffectiveRamFreq] = useState<number | null>(null)
  const [useSli, setUseSli] = useState(false)

  const [results, setResults] = useState<UpgradeResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [budgetError, setBudgetError] = useState('')

  const levelSettingsKey = levelSettings ? `${levelSettings.level}-${levelSettings.percent}` : null

  const availableBudget = Math.max(0, budget - reserve)

  const availableCPUs = levelSettings?.isSandbox ? cpus : levelSettings ? cpus.filter((c) => !isLocked(c.level, c.percent_through, levelSettings.level, levelSettings.percent)) : cpus
  const availableGPUs = levelSettings?.isSandbox ? gpus : levelSettings ? gpus.filter((g) => !isLocked(g.level, g.percent_through, levelSettings.level, levelSettings.percent)) : gpus
  const availableRAMs = levelSettings?.isSandbox ? rams : levelSettings ? rams.filter((r) => !isLocked(r.level, r.percent_through, levelSettings.level, levelSettings.percent)) : rams

  const currentCase = selectedCase ? cases.find(c => c.id === selectedCase) ?? null : null
  const currentCPU = selectedCPU ? cpus.find(c => c.id === selectedCPU) ?? null : null
  const currentGPU = selectedGPU ? gpus.find(g => g.id === selectedGPU) ?? null : null
  const currentRAM = selectedRAM ? rams.find(r => r.id === selectedRAM) ?? null : null
  const currentMobo = selectedMobo ? motherboards.find(m => m.id === selectedMobo) ?? null : null
  const maxRamQuantity = (currentCPU?.max_memory_channels ?? 2) * 2

  const gpuQty = useSli && currentGPU && supportsSli(currentGPU) ? 2 : 1

  const currentTotalScore = useMemo(() => {
    if (!currentCPU || !currentGPU || !currentRAM) return 0
    const cs = calcCpuScore(currentCPU, currentRAM, ramQuantity || 1, undefined, effectiveRamFreq ?? undefined)
    const gs = calcGpuScore(currentGPU, undefined, undefined, gpuQty)
    return calcTotalScore(cs, gs)
  }, [currentCPU, currentGPU, currentRAM, ramQuantity, effectiveRamFreq, gpuQty])

  const currentRank = currentTotalScore > 0 ? getRank(currentTotalScore) : null

  const doUpgradeSearch = () => {
    const available = availableBudget
    if (available <= 0 || !currentCPU || !currentGPU || !currentRAM) return

    const cpuCandidates = availableCPUs.filter(c =>
      c.id !== currentCPU.id && c.price <= available &&
      (!currentMobo || !currentMobo.cpu_socket || c.cpu_socket === currentMobo.cpu_socket)
    )
    const gpuCandidates = availableGPUs.filter(g =>
      g.id !== currentGPU.id && g.price <= available &&
      (!useSli || supportsSli(g))
    )
    const ramCandidates = availableRAMs.filter(r =>
      r.id !== currentRAM.id && r.price * (ramQuantity || 1) <= available
    )

    const found: UpgradeResult[] = []
    const oldTotalScore = currentTotalScore

    function tryStrategy(
      strategy: string, label: string,
      newCpu?: CPU, newGpu?: GPU, newRam?: RAM, newRamQty?: number
    ) {
      const cpu = newCpu ?? currentCPU!
      const gpu = newGpu ?? currentGPU!
      const ram = newRam ?? currentRAM!
      const rq = newRamQty ?? ramQuantity
      const gq = useSli && supportsSli(gpu) ? 2 : 1
      const cost = (newCpu ? newCpu.price : 0) + (newGpu ? newGpu.price * gq : 0) + (newRam ? newRam.price * rq : 0)
      if (cost > available) return
      const cs = calcCpuScore(cpu, ram, rq, undefined, effectiveRamFreq ?? undefined)
      const gs = calcGpuScore(gpu, undefined, undefined, gq)
      const totalScore = calcTotalScore(cs, gs)
      if (totalScore < targetScore || totalScore > targetScore + offset) return
      found.push({
        strategy, label, cost,
        oldTotalScore, newTotalScore: totalScore,
        scoreDelta: totalScore - oldTotalScore,
        cpu, gpu, ram, ramQty: rq, gpuQty: gq,
        rank: getRank(totalScore),
        newCpu, newGpu, newRam, newRamQty,
      })
    }

    for (const nc of cpuCandidates) {
      tryStrategy('cpu', t('bu_cpu_upgrade'), nc, undefined, undefined)
    }
    for (const ng of gpuCandidates) {
      tryStrategy('gpu', t('bu_gpu_upgrade'), undefined, ng, undefined)
    }
    for (const nr of ramCandidates) {
      tryStrategy('ram', t('bu_ram_upgrade'), undefined, undefined, nr, ramQuantity)
    }
    for (const nc of cpuCandidates) {
      for (const ng of gpuCandidates) {
        tryStrategy('cpu_gpu', t('bu_cpu_gpu_upgrade'), nc, ng, undefined)
      }
    }
    for (const nc of cpuCandidates) {
      for (const nr of ramCandidates) {
        tryStrategy('cpu_ram', t('bu_cpu_ram_upgrade'), nc, undefined, nr, ramQuantity)
      }
    }
    for (const ng of gpuCandidates) {
      for (const nr of ramCandidates) {
        tryStrategy('gpu_ram', t('bu_gpu_ram_upgrade'), undefined, ng, nr, ramQuantity)
      }
    }
    for (const nc of cpuCandidates) {
      for (const ng of gpuCandidates) {
        for (const nr of ramCandidates) {
          tryStrategy('all', t('bu_all_upgrade'), nc, ng, nr, ramQuantity)
        }
      }
    }

    const bestPerStrategy = new Map<string, UpgradeResult>()
    for (const r of found) {
      const existing = bestPerStrategy.get(r.strategy)
      if (!existing || r.scoreDelta > existing.scoreDelta || (r.scoreDelta === existing.scoreDelta && r.cost < existing.cost)) {
        bestPerStrategy.set(r.strategy, r)
      }
    }

    const sorted = [...bestPerStrategy.values()].sort((a, b) => b.scoreDelta - a.scoreDelta || a.cost - b.cost)
    setResults(sorted)
    setSearched(true)
  }

  const doSearch = async () => {
    if (budget <= 0) {
      setBudgetError(t('bm_enter_budget'))
      setTimeout(() => setBudgetError(''), 2500)
      return
    }
    if (!selectedCPU || !selectedGPU || !selectedRAM) {
      setBudgetError(t('bu_select_components'))
      setTimeout(() => setBudgetError(''), 2500)
      return
    }
    setSearching(true)
    setResults([])
    setSearched(false)
    await new Promise(r => setTimeout(r, 50))
    doUpgradeSearch()
    setSearching(false)
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <InputCard icon={<DollarSign className="h-4 w-4 text-emerald-500" />} label={t('bm_budget')} value={budget} onChange={setBudget} min={0} />
        <InputCard icon={<Info className="h-4 w-4 text-sky-500" />} label={t('bu_reserve_budget')} value={reserve} onChange={setReserve} min={0} />
        <InputCard icon={<Target className="h-4 w-4 text-rose-500" />} label={t('bm_target_score')} value={targetScore} onChange={setTargetScore} min={0} />
        <InputCard icon={<TrendingUp className="h-4 w-4 text-orange-500" />} label={t('bm_score_offset')} value={offset} onChange={setOffset} min={0} />
      </div>

      {budget > 0 && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            {t('bm_available')}: ${formatNumber(availableBudget)}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-gray-100 mb-6">
          <Info className="h-5 w-5 text-indigo-500" />
          {t('bu_current_system')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">
              <Box className="h-4 w-4 text-gray-500" />
              {t('bu_case')}
            </label>
            <SearchableSelect
              options={cases} value={selectedCase}
              onChange={setSelectedCase}
              placeholder={t('bu_case')}
              getLabel={(c) => `${c.manufacturer} ${c.part_name}`}
              noResultsText={t('no_results')}
            />
            {currentCase && (
              <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                {currentCase.case_size ?? currentCase.motherboard_size ?? ''}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              {t('bu_cpu')}
            </label>
            <SearchableSelect
              options={availableCPUs} value={selectedCPU}
              onChange={(id) => {
                setSelectedCPU(id)
                const cpu = cpus.find(c => c.id === id)
                const maxCh = cpu?.max_memory_channels ?? 2
                setRamQuantity(Math.min(ramQuantity, maxCh * 2))
              }}
              placeholder={t('select_cpu')}
              getLabel={(cpu) => `${cpu.manufacturer} ${cpu.part_name}`}
              noResultsText={t('no_results')}
            />
            {currentCPU && (
              <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 space-y-0.5">
                <div>{currentCPU.cores} {t('cores')} · {currentCPU.frequency} {t('mhz')}</div>
                <div>{t('tdp')} {currentCPU.wattage}W</div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">
              <Gpu className="h-4 w-4 text-green-500" />
              {t('bu_gpu')}
            </label>
            <SearchableSelect
              options={availableGPUs} value={selectedGPU}
              onChange={(id) => {
                setSelectedGPU(id)
                const gpu = gpus.find(g => g.id === id)
                if (gpu && !supportsSli(gpu)) setUseSli(false)
              }}
              placeholder={t('select_gpu')}
              getLabel={(gpu) => `${gpu.manufacturer} ${gpu.part_name}`}
              noResultsText={t('no_results')}
            />
            {currentGPU && (
              <div className="mt-2">
                <ToggleSwitch label="SLI / Crossfire" checked={useSli} onChange={setUseSli} />
              </div>
            )}
            {currentGPU && (
              <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                {currentGPU.vram_gb}GB VRAM · {currentGPU.wattage}W
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">
              <MemoryStick className="h-4 w-4 text-purple-500" />
              {t('bu_ram')}
            </label>
            <SearchableSelect
              options={availableRAMs} value={selectedRAM}
              onChange={(id) => setSelectedRAM(id)}
              placeholder={t('select_ram')}
              getLabel={(ram) => `${ram.manufacturer} ${ram.part_name} ${ram.total_size_gb}GB ${ram.frequency}MHz`}
              noResultsText={t('no_results')}
            />
            {currentRAM && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-gray-400">{t('qty')}</span>
                  <button onClick={() => setRamQuantity(Math.max(1, ramQuantity - 1))}
                    className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-sm"
                  >−</button>
                  <span className="w-5 text-center font-semibold text-slate-900 dark:text-gray-100 text-sm">{ramQuantity}</span>
                  <button onClick={() => setRamQuantity(Math.min(maxRamQuantity, ramQuantity + 1))}
                    className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-sm"
                  >+</button>
                </div>
                {(() => {
                  const cpuDef = currentCPU?.default_memory_speed ?? currentRAM.frequency
                  const defFreq = Math.min(currentRAM.frequency, cpuDef)
                  const xmpFreq = currentRAM.frequency
                  const maxFreq = currentRAM.max_speed ?? xmpFreq
                  const curVal = effectiveRamFreq ?? defFreq
                  const isCustom = effectiveRamFreq !== null
                  const setFreq = (freq: number | null) => setEffectiveRamFreq(freq)

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-gray-400">{t('frequency_bios')}</span>
                        <div className="relative">
                          <input type="number" min={defFreq} max={maxFreq} step={100} value={curVal}
                            onChange={(e) => { const v = e.target.value ? Math.min(Math.max(Number(e.target.value), defFreq), maxFreq) : defFreq; setFreq(v) }}
                            className="w-20 p-1 pr-7 text-right border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 font-semibold text-xs outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-gray-500 pointer-events-none select-none">{t('mhz')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setFreq(null)}
                          className={clsx('flex-1 py-0.5 rounded text-xs font-medium transition-colors', !isCustom && curVal === defFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                        >{t('default')}</button>
                        <button type="button" onClick={() => setFreq(xmpFreq)}
                          className={clsx('flex-1 py-0.5 rounded text-xs font-medium transition-colors', isCustom && curVal === xmpFreq ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700')}
                        >{t('xmp')}</button>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">
              <Layers className="h-4 w-4 text-orange-500" />
              {t('bu_motherboard')}
            </label>
            <SearchableSelect
              options={motherboards} value={selectedMobo}
              onChange={setSelectedMobo}
              placeholder={t('bu_motherboard')}
              getLabel={(m) => `${m.manufacturer} ${m.part_name}`}
              noResultsText={t('no_results')}
            />
            {currentMobo && (
              <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 space-y-0.5">
                {currentMobo.cpu_socket && <div>{t('bm_socket')}: {currentMobo.cpu_socket}</div>}
                {currentMobo.motherboard_size && <div>{currentMobo.motherboard_size}</div>}
              </div>
            )}
          </div>
        </div>

        {currentTotalScore > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <span className="text-slate-500 dark:text-gray-400">{t('bu_old_score')}:</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(currentTotalScore)}</span>
            {currentRank && (
              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold',
                currentRank === 'Elite' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                currentRank === 'Performance' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                currentRank === 'Good' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                currentRank === 'Average' ? 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300' :
                'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
              )}>
                {t(currentRank.toLowerCase())}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="text-center mb-8">
        <button
          onClick={doSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-5 w-5" />
          {searching ? t('bu_searching') : t('bu_find')}
        </button>
        {budgetError && (
          <div className="mt-3 text-sm text-rose-500 dark:text-rose-400 font-medium animate-pulse">
            {budgetError}
          </div>
        )}
      </div>

      {searched && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <ArrowUp className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-gray-500" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-1">{t('bu_no_results')}</h3>
              <p className="text-sm text-slate-400 dark:text-gray-500 max-w-md mx-auto">{t('bu_no_results_desc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-500 dark:text-gray-400 mb-2">
                {t('bm_found', String(results.length))}
              </div>
              {results.map((r, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-emerald-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <ArrowUp className="h-4 w-4" />
                      {r.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_upgrade_cost')}:</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${formatNumber(r.cost)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <div className={clsx('font-medium', r.newCpu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
                          {r.newCpu
                            ? <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_upgrade_to')}: </span>{r.newCpu.manufacturer} {r.newCpu.part_name}</>
                            : <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_current_label')}: </span>{r.cpu.manufacturer} {r.cpu.part_name}</>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gpu className="h-4 w-4 text-green-500 shrink-0" />
                      <div>
                        <div className={clsx('font-medium', r.newGpu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
                          {r.newGpu
                            ? <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_upgrade_to')}: </span>{r.newGpu.manufacturer} {r.newGpu.part_name}{r.gpuQty > 1 ? ' x' + r.gpuQty : ''}</>
                            : <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_current_label')}: </span>{r.gpu.manufacturer} {r.gpu.part_name}{r.gpuQty > 1 ? ' x' + r.gpuQty : ''}</>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
                      <div>
                        <div className={clsx('font-medium', r.newRam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
                          {r.newRam
                            ? <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_upgrade_to')}: </span>{r.newRam.manufacturer} {r.newRam.part_name} {r.newRam.frequency}MHz x{r.newRamQty ?? r.ramQty}</>
                            : <><span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_current_label')}: </span>{r.ram.manufacturer} {r.ram.part_name} {r.ram.frequency}MHz x{r.ramQty}</>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_3dmark_score')}:</span>
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(r.newTotalScore)}</span>
                        <span className="text-xs text-slate-400 dark:text-gray-500 line-through">{formatNumber(r.oldTotalScore)}</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatNumber(r.scoreDelta)}</span>
                      </div>
                    </div>
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold',
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
