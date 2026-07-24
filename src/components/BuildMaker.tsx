'use client'

import { useState, useMemo } from 'react'
import { Wrench, Cpu, Gpu, MemoryStick, TrendingUp, Search, DollarSign, Target, Sliders, Info, Layers, Radio, PanelRight, HardDrive, Fan } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { estimateBuildScore, formatNumber } from '@/lib/calculator'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler } from '@/lib/types'

const SOCKETS = ['AM4', 'LGA 1151 (Coffee Lake)', 'LGA 1151 (Kaby Lake)', 'LGA 1151 (Skylake)', 'LGA 1200', 'LGA 2066', 'TR4', 'sTRX4'] as const
const RAM_SIZES = [8, 16, 32]
const MB_SIZES = ['Mini-ITX', 'Micro-ATX', 'S-ATX', 'E-ATX', 'XL-ATX'] as const
const STORAGE_TYPES = ['Any', 'SSD', 'HDD', 'NVMe'] as const

interface BuildResult {
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
  /* full build fields */
  motherboard?: Motherboard
  psu?: PSU
  storage?: StorageDrive
  case?: Case
  cooler?: Cooler
}

interface Props {
  cpus: CPU[]
  gpus: GPU[]
  rams: RAM[]
  motherboards: Motherboard[]
  psus: PSU[]
  storageDrives: StorageDrive[]
  cases: Case[]
  coolers: Cooler[]
}

function coolerSupportsSocket(cooler: Cooler, socket: string | undefined): boolean {
  if (!socket) return true
  const s = socket.toLowerCase()
  if (cooler.cpu_socket_list?.toLowerCase().includes(s)) return true
  const key = s.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return !!(cooler as any)[key]
}

function moboFitsCase(mobo: Motherboard, c: Case): boolean {
  if (c.motherboard_size?.toLowerCase().includes(mobo.motherboard_size?.toLowerCase() ?? '')) return true
  const size = mobo.motherboard_size?.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return !!(c as any)[size ?? '']
}

function estimateTotalWattage(cpu: CPU, gpu: GPU, gpuQty: number): number {
  return (cpu.wattage || 0) + (gpu.wattage || 0) * gpuQty + 100
}

export default function BuildMaker({ cpus, gpus, rams, motherboards, psus, storageDrives, cases, coolers }: Props) {
  const { t } = useLang()

  const [fullMode, setFullMode] = useState(false)
  const [budget, setBudget] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [targetScore, setTargetScore] = useState(0)
  const [socket, setSocket] = useState('')
  const [cpuBrand, setCpuBrand] = useState('')
  const [gpuBrand, setGpuBrand] = useState('')
  const [useSli, setUseSli] = useState(false)
  const [cpuOc, setCpuOc] = useState(false)
  const [gpuOc, setGpuOc] = useState(false)
  const [minRamGb, setMinRamGb] = useState(0)
  const [mbSize, setMbSize] = useState('')
  const [storageType, setStorageType] = useState('Any')
  const [results, setResults] = useState<BuildResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  const availableBudget = fullMode ? budget : budget - remaining

  const doSearch = () => {
    const available = availableBudget
    if (available <= 0) return
    setSearching(true)
    setSearched(false)

    setTimeout(() => {
      const cpuCandidates = cpus.filter((c) => {
        if (socket && c.cpu_socket !== socket) return false
        if (cpuBrand && c.manufacturer !== cpuBrand) return false
        if (c.price > available * 0.5) return false
        if (cpuOc && !c.can_overclock) return false
        return true
      }).sort((a, b) => a.price - b.price)

      const gpuCandidates = gpus.filter((g) => {
        if (gpuBrand && g.manufacturer !== gpuBrand) return false
        if (useSli && !g.double_gpu_graphics_score) return false
        if (g.price > available * 0.5) return false
        return true
      }).sort((a, b) => a.price - b.price)

      const ramCandidates = rams.filter((r) => {
        if (r.total_size_gb < minRamGb) return false
        if (r.price > available * 0.15) return false
        return true
      }).sort((a, b) => a.price - b.price)

      const found: BuildResult[] = []
      const gpuQty = useSli ? 2 : 1
      const ramQty = 2

      if (fullMode) {
        const baseCost = Math.min(...ramCandidates.map(r => r.price * ramQty)) + Math.min(...storageDrives.map(s => s.price))

        for (const cpu of cpuCandidates) {
          const compatMobos = motherboards.filter(m => m.cpu_socket === cpu.cpu_socket && m.price <= available * 0.3).sort((a, b) => a.price - b.price)
          const compatCoolers = coolers.filter(c => coolerSupportsSocket(c, cpu.cpu_socket) && c.price <= available * 0.15).sort((a, b) => a.price - b.price)
          if (!compatMobos.length || !compatCoolers.length) continue

          for (const mobo of compatMobos) {
            const compatCases = cases.filter(c => moboFitsCase(mobo, c) && c.price <= available * 0.25).sort((a, b) => a.price - b.price)
            if (!compatCases.length) continue

            for (const cooler of compatCoolers) {
              if (cooler.height && compatCases[0].max_cpu_fan_height && cooler.height > compatCases[0].max_cpu_fan_height) continue

              for (const gpu of gpuCandidates) {
                const gpuPrice = gpu.price * gpuQty
                for (const c of compatCases) {
                  if (c.max_gpu_length && gpu.length && gpu.length > c.max_gpu_length) continue

                  const compatPsus = psus.filter(p =>
                    p.wattage >= estimateTotalWattage(cpu, gpu, gpuQty) &&
                    p.price <= available * 0.15 &&
                    (!c.psu_size || p.size === c.psu_size)
                  ).sort((a, b) => a.price - b.price)
                  if (!compatPsus.length) continue

                  for (const psu of compatPsus) {
                    for (const storage of storageDrives) {
                      if (storageType !== 'Any' && storage.type !== storageType) continue
                      if (storage.price > available * 0.1) continue

                      for (const ram of ramCandidates) {
                        const totalPrice = cpu.price + gpuPrice + mobo.price + psu.price + storage.price + c.price + cooler.price + ram.price * ramQty
                        if (totalPrice > available) continue

                        const score = estimateBuildScore(cpu, gpu, ram, ramQty, gpuQty, cpuOc, gpuOc)
                        if (score.totalScore < targetScore) continue

                        found.push({
                          cpu, gpu, ram, ramQty, gpuQty,
                          motherboard: mobo, psu, storage, case: c, cooler,
                          totalPrice,
                          cpuScore: score.cpuScore,
                          gpuScore: score.gpuScore,
                          totalScore: score.totalScore,
                          rank: score.rank,
                        })
                        if (found.length >= 200) break
                      }
                      if (found.length >= 200) break
                    }
                    if (found.length >= 200) break
                  }
                  if (found.length >= 200) break
                }
                if (found.length >= 200) break
              }
              if (found.length >= 200) break
            }
            if (found.length >= 200) break
          }
          if (found.length >= 200) break
        }

        found.sort((a, b) => b.totalScore - a.totalScore)
      } else {
        for (const cpu of cpuCandidates) {
          for (const gpu of gpuCandidates) {
            for (const ram of ramCandidates) {
              const totalPrice = cpu.price + gpu.price * gpuQty + ram.price * ramQty
              if (totalPrice > available) continue

              const score = estimateBuildScore(cpu, gpu, ram, ramQty, gpuQty, cpuOc, gpuOc)
              if (score.totalScore < targetScore) continue

              found.push({
                cpu, gpu, ram, ramQty, gpuQty,
                totalPrice,
                cpuScore: score.cpuScore,
                gpuScore: score.gpuScore,
                totalScore: score.totalScore,
                rank: score.rank,
              })
            }
          }
        }

        found.sort((a, b) => a.totalPrice - b.totalPrice)
      }

      setResults(found.slice(0, 10))
      setSearched(true)
      setSearching(false)
    }, 0)
  }

  const tooManyCombos = useMemo(() => {
    const cpuC = cpus.filter(c => !socket || c.cpu_socket === socket).length
    const gpuC = gpus.filter(g => !gpuBrand || g.manufacturer === gpuBrand).length
    const ramC = rams.filter(r => r.total_size_gb >= minRamGb).length
    if (fullMode) {
      return cpuC * gpuC * ramC * motherboards.length * cases.length > 500000
    }
    return cpuC * gpuC * ramC > 50000
  }, [cpus, gpus, rams, motherboards, cases, socket, gpuBrand, minRamGb, fullMode])

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setFullMode(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!fullMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700'}`}
        >
          <Radio className="h-4 w-4" />
          {t('bm_simple')}
        </button>
        <button onClick={() => setFullMode(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${fullMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700'}`}
        >
          <PanelRight className="h-4 w-4" />
          {t('bm_full_build')}
        </button>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            {t('bm_budget')}
          </label>
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          />
        </div>

        {!fullMode && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Info className="h-4 w-4 text-sky-500" />
              {t('bm_remaining')}
            </label>
            <input type="number" value={remaining} onChange={(e) => setRemaining(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
            />
            <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
              {t('bm_available')}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${availableBudget}</span>
            </div>
          </div>
        )}

        {fullMode && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Info className="h-4 w-4 text-sky-500" />
              {t('bm_available')}
            </label>
            <div className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ${budget}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <Target className="h-4 w-4 text-rose-500" />
            {t('bm_target_score')}
          </label>
          <input type="number" value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            {t('bm_socket')}
          </label>
          <select value={socket} onChange={(e) => setSocket(e.target.value)}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="">{t('bm_any')}</option>
            {SOCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <Layers className="h-4 w-4 text-purple-500" />
            {t('bm_cpu_brand')}
          </label>
          <select value={cpuBrand} onChange={(e) => setCpuBrand(e.target.value)}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="">{t('bm_any')}</option>
            <option value="AMD">AMD</option>
            <option value="Intel">Intel</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <Gpu className="h-4 w-4 text-green-500" />
            {t('bm_gpu_brand')}
          </label>
          <select value={gpuBrand} onChange={(e) => setGpuBrand(e.target.value)}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="">{t('bm_any')}</option>
            <option value="AMD">AMD</option>
            <option value="NVIDIA">NVIDIA</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <MemoryStick className="h-4 w-4 text-purple-500" />
            {t('bm_min_ram')}
          </label>
          <select value={minRamGb} onChange={(e) => setMinRamGb(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="0">{t('bm_any')}</option>
            {RAM_SIZES.map((s) => <option key={s} value={s}>{s} GB</option>)}
          </select>
        </div>

        {fullMode && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <PanelRight className="h-4 w-4 text-indigo-500" />
                {t('bm_mobo_size')}
              </label>
              <select value={mbSize} onChange={(e) => setMbSize(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
              >
                <option value="">{t('bm_any')}</option>
                {MB_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <HardDrive className="h-4 w-4 text-cyan-500" />
                {t('bm_storage_type')}
              </label>
              <select value={storageType} onChange={(e) => setStorageType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
              >
                {STORAGE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
            <Sliders className="h-4 w-4 text-indigo-500" />
            {t('bm_options')}
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>SLI / Crossfire</span>
              <button onClick={() => setUseSli((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${useSli ? 'bg-green-600' : 'bg-slate-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useSli && 'translate-x-5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>{t('bm_cpu_oc')}</span>
              <button onClick={() => setCpuOc((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${cpuOc ? 'bg-blue-600' : 'bg-slate-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cpuOc && 'translate-x-5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>{t('bm_gpu_oc')}</span>
              <button onClick={() => setGpuOc((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${gpuOc ? 'bg-green-600' : 'bg-slate-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${gpuOc && 'translate-x-5'}`} />
              </button>
            </label>
          </div>
        </div>
      </div>

      {/* Search button */}
      <div className="text-center mb-8">
        <button onClick={doSearch} disabled={searching || (!fullMode && availableBudget <= 0)}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          {searching ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : <Search className="h-5 w-5" />}
          {searching ? t('bm_searching') : t('bm_find')}
        </button>
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
                      {i === 0 ? t('bm_best_match') : `${t('bm_option')} #${i + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_total')}:</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${r.totalPrice}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.cpu.part_name}</div>
                        <div className="text-xs text-slate-400">${r.cpu.price} · {formatNumber(r.cpuScore)} {t('bm_pts')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gpu className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.gpu.part_name}{r.gpuQty > 1 ? ` ×${r.gpuQty}` : ''}</div>
                        <div className="text-xs text-slate-400">${r.gpu.price * r.gpuQty} · {formatNumber(r.gpuScore)} {t('bm_pts')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.ram.part_name} ×{r.ramQty}</div>
                        <div className="text-xs text-slate-400">${r.ram.price * r.ramQty} · {r.ram.total_size_gb * r.ramQty}GB</div>
                      </div>
                    </div>
                    {r.motherboard && (
                      <div className="flex items-center gap-2 text-sm">
                        <PanelRight className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.motherboard.part_name}</div>
                          <div className="text-xs text-slate-400">${r.motherboard.price}</div>
                        </div>
                      </div>
                    )}
                    {r.psu && (
                      <div className="flex items-center gap-2 text-sm">
                        <Radio className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.psu.part_name}</div>
                          <div className="text-xs text-slate-400">${r.psu.price} · {r.psu.wattage}W</div>
                        </div>
                      </div>
                    )}
                    {r.storage && (
                      <div className="flex items-center gap-2 text-sm">
                        <HardDrive className="h-4 w-4 text-cyan-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.storage.part_name}</div>
                          <div className="text-xs text-slate-400">${r.storage.price} · {r.storage.size_gb}GB</div>
                        </div>
                      </div>
                    )}
                    {r.case && (
                      <div className="flex items-center gap-2 text-sm">
                        <Layers className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.case.part_name}</div>
                          <div className="text-xs text-slate-400">${r.case.price}</div>
                        </div>
                      </div>
                    )}
                    {r.cooler && (
                      <div className="flex items-center gap-2 text-sm">
                        <Fan className="h-4 w-4 text-sky-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-gray-100 truncate">{r.cooler.part_name}</div>
                          <div className="text-xs text-slate-400">${r.cooler.price}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_3dmark_score')}:</span>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(r.totalScore)}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.rank === 'Elite' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                      r.rank === 'Performance' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                      r.rank === 'Good' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                      r.rank === 'Average' ? 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300' :
                      'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                    }`}>
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
