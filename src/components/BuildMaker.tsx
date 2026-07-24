'use client'

import { useState, useMemo } from 'react'
import { Wrench, Cpu, Gpu, MemoryStick, TrendingUp, Search, DollarSign, Target, Sliders, Info, Layers, HardDrive, Box, Zap, Fan } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { estimateBuildScore, formatNumber, supportsSli } from '@/lib/calculator'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler } from '@/lib/types'

const SOCKETS = ['AM4', 'LGA 1151 (Coffee Lake)', 'LGA 1151 (Kaby Lake)', 'LGA 1151 (Skylake)', 'LGA 1200', 'LGA 2066', 'TR4', 'sTRX4'] as const
const RAM_SIZES = [8, 16, 32]
const STORAGE_TYPES = ['SSD', 'HDD', 'NVMe']
const CASE_SIZES = ['Mini-ITX', 'Micro-ATX', 'S-ATX', 'E-ATX', 'XL-ATX']

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
}

function isCoolerSocketCompatible(cpuSocket: string, cooler: Cooler): boolean {
  if (cooler.cpu_socket_list) {
    const list = cooler.cpu_socket_list.split(',').map(s => s.trim())
    if (list.includes(cpuSocket)) return true
  }
  const fieldMap: Record<string, keyof Cooler> = {
    'AM4': 'am4',
    'AM3': 'am3',
    'FM2': 'fm2',
    'LGA 1151 (Coffee Lake)': 'lga_1151_coffee_lake',
    'LGA 1151 (Kaby Lake)': 'lga_1151_kaby_lake',
    'LGA 1151 (Skylake)': 'lga_1151_skylake',
    'LGA 1200': 'lga_1200',
    'LGA 2011 v3': 'lga_2011_v3',
    'LGA 2066': 'lga_2066',
    'TR4': 'tr4',
    'sTRX4': 'strx4',
  }
  const field = fieldMap[cpuSocket]
  return field ? cooler[field] === true : false
}

function isCaseCompatible(caseItem: Case, moboSize: string): boolean {
  if (caseItem.motherboard_size) {
    const supported = caseItem.motherboard_size.split(',').map(s => s.trim()).filter(Boolean)
    if (supported.includes(moboSize)) return true
  }
  const fieldMap: Record<string, keyof Case> = {
    'Mini-ITX': 'mini_itx',
    'Micro-ATX': 'micro_atx',
    'S-ATX': 's_atx',
    'E-ATX': 'e_atx',
    'XL-ATX': 'xl_atx',
  }
  const field = fieldMap[moboSize]
  return field ? caseItem[field] === true : false
}

function getTotalTdp(cpu: CPU, gpu: GPU, gpuQty: number): number {
  return (Number(cpu.wattage) || 0) + (Number(gpu.wattage) || 0) * gpuQty + 100
}

export default function BuildMaker({ cpus, gpus, rams, motherboards, psus, storageDrives, cases, coolers }: Props) {
  const { t } = useLang()

  const [mode, setMode] = useState<'simple' | 'full'>('simple')
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
  const [moboSize, setMoboSize] = useState('')
  const [storageType, setStorageType] = useState('')
  const [results, setResults] = useState<BuildResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  const availableBudget = mode === 'full' ? budget : budget - remaining

  const isFull = (r: BuildResult): r is BuildResultFull => 'motherboard' in r

  const doSimpleSearch = () => {
    const available = budget - remaining
    if (available <= 0) return

    const cpuCandidates = cpus.filter((c) => {
      if (c.price > available * 0.6) return false
      if (cpuOc && !c.can_overclock) return false
      return true
    })

    const gpuCandidates = gpus.filter((g) => {
      if (useSli && !supportsSli(g)) return false
      if (g.price > available * 0.6) return false
      return true
    })

    const ramCandidates = rams.filter((r) => {
      if (r.total_size_gb < minRamGb) return false
      if (r.price > available * 0.2) return false
      return true
    })

    const found: BuildResultSimple[] = []
    const gpuQty = useSli ? 2 : 1
    const ramQty = 2

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

    found.sort((a, b) => b.totalScore - a.totalScore)
    setResults(found.slice(0, 10))
    setSearched(true)
  }

  const doFullSearch = () => {
    if (budget <= 0) return
    const avail = budget

    const cpuCandidates = cpus.filter((c) => {
      if (socket && c.cpu_socket !== socket) return false
      if (cpuBrand && c.manufacturer !== cpuBrand) return false
      if (Number(c.price) > avail * 0.35) return false
      if (cpuOc && !c.can_overclock) return false
      return true
    })

    const gpuCandidates = gpus.filter((g) => {
      if (gpuBrand && g.manufacturer !== gpuBrand) return false
      if (useSli && !supportsSli(g)) return false
      if (Number(g.price) > avail * 0.40) return false
      return true
    })

    const ramCandidates = rams.filter((r) => {
      if (r.total_size_gb < minRamGb) return false
      if (Number(r.price) * 2 > avail * 0.10) return false
      return true
    })

    const mbCandidates = motherboards.filter((mb) => {
      if (socket && mb.cpu_socket !== socket) return false
      if (moboSize && mb.motherboard_size !== moboSize) return false
      if (Number(mb.price) > avail * 0.18) return false
      if (cpuOc && !mb.can_overclock) return false
      return true
    })

    const psuCandidates = psus.filter((p) => Number(p.price) > 0 && Number(p.price) <= avail * 0.12)

    const storageCandidates = storageDrives.filter((s) => {
      if (storageType && s.type !== storageType) return false
      if (Number(s.price) > avail * 0.08) return false
      return true
    })

    const caseCandidates = cases.filter((c) => Number(c.price) > 0 && Number(c.price) <= avail * 0.12)

    const coolerCandidates = coolers.filter((cl) => Number(cl.price) > 0 && Number(cl.price) <= avail * 0.08)

    const found: BuildResultFull[] = []
    const gpuQty = useSli ? 2 : 1
    const ramQty = 2

    let iterations = 0
    const MAX_ITER = 500000

    for (const cpu of cpuCandidates) {
      const compatMbs = mbCandidates.filter(mb => mb.cpu_socket === cpu.cpu_socket)
      if (compatMbs.length === 0) continue

      const cpuSocket = cpu.cpu_socket || ''
      const compatCoolers = coolerCandidates.filter(cl => isCoolerSocketCompatible(cpuSocket, cl))
      if (compatCoolers.length === 0) continue

      for (const gpu of gpuCandidates) {
        const totalTdp = getTotalTdp(cpu, gpu, gpuQty)
        const compatPsus = psuCandidates.filter(p => Number(p.wattage) >= totalTdp)
        if (compatPsus.length === 0) continue

        for (const ram of ramCandidates) {
          for (const mb of compatMbs) {
            const mbSize = mb.motherboard_size || ''
            const compatCases = caseCandidates.filter(c => isCaseCompatible(c, mbSize))
            if (compatCases.length === 0) continue

            for (const cooler of compatCoolers) {
              const isAirCooler = cooler.type?.toLowerCase().includes('air')

              for (const psu of compatPsus) {
                for (const c of compatCases) {
                  if (psu.size && c.max_psu_length) {
                    const psuLen = parseInt(String(psu.size))
                    if (!isNaN(psuLen) && psuLen > Number(c.max_psu_length)) continue
                  }

                  if (isAirCooler && cooler.height && c.max_cpu_fan_height && Number(cooler.height) > Number(c.max_cpu_fan_height)) continue

                  for (const storage of storageCandidates) {
                    iterations++
                    if (iterations > MAX_ITER) break

                    const totalPrice = Number(cpu.price) + Number(gpu.price) * gpuQty + Number(ram.price) * ramQty
                      + Number(mb.price) + Number(psu.price) + Number(storage.price) + Number(c.price) + Number(cooler.price)

                    if (totalPrice > avail) continue

                    const score = estimateBuildScore(cpu, gpu, ram, ramQty, gpuQty, cpuOc, gpuOc)
                    if (score.totalScore < targetScore) continue

                    found.push({
                      cpu, gpu, ram, ramQty, gpuQty,
                      motherboard: mb,
                      psu,
                      storage,
                      case: c,
                      cooler,
                      totalPrice,
                      cpuScore: score.cpuScore,
                      gpuScore: score.gpuScore,
                      totalScore: score.totalScore,
                      rank: score.rank,
                    })
                  }
                  if (iterations > MAX_ITER) break
                }
                if (iterations > MAX_ITER) break
              }
              if (iterations > MAX_ITER) break
            }
            if (iterations > MAX_ITER) break
          }
          if (iterations > MAX_ITER) break
        }
        if (iterations > MAX_ITER) break
      }
      if (iterations > MAX_ITER) break
    }

    found.sort((a, b) => b.totalScore - a.totalScore)
    setResults(found.slice(0, 10))
    setSearched(true)
  }

  const doSearch = () => {
    setSearching(true)
    setResults([])
    setSearched(false)
    setTimeout(() => {
      if (mode === 'full') {
        doFullSearch()
      } else {
        doSimpleSearch()
      }
      setSearching(false)
    }, 50)
  }

  const tooManyCombos = useMemo(() => {
    const cpuC = cpus.filter(c => !socket || c.cpu_socket === socket).length
    const gpuC = gpus.filter(g => !gpuBrand || g.manufacturer === gpuBrand).length
    const ramC = rams.filter(r => r.total_size_gb >= minRamGb).length
    return cpuC * gpuC * ramC > 50000
  }, [cpus, gpus, rams, socket, gpuBrand, minRamGb])

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => { setMode('simple'); setResults([]); setSearched(false) }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'simple'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {t('bm_simple')}
          </button>
          <button
            onClick={() => { setMode('full'); setResults([]); setSearched(false) }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'full'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {t('bm_full_build')}
          </button>
        </div>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            {t('bm_budget')}
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          />
        </div>

        {mode === 'simple' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Info className="h-4 w-4 text-sky-500" />
              {t('bm_remaining')}
            </label>
            <input
              type="number"
              value={remaining}
              onChange={(e) => setRemaining(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
            />
            <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
              {t('bm_available')}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${availableBudget}</span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <Target className="h-4 w-4 text-rose-500" />
            {t('bm_target_score')}
          </label>
          <input
            type="number"
            value={targetScore}
            onChange={(e) => setTargetScore(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          />
        </div>

        {mode === 'full' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              {t('bm_socket')}
            </label>
            <select
              value={socket}
              onChange={(e) => setSocket(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
            >
              <option value="">{t('bm_any')}</option>
              {SOCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {mode === 'full' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Layers className="h-4 w-4 text-purple-500" />
              {t('bm_cpu_brand')}
            </label>
            <select
              value={cpuBrand}
              onChange={(e) => setCpuBrand(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
            >
              <option value="">{t('bm_any')}</option>
              <option value="AMD">AMD</option>
              <option value="Intel">Intel</option>
            </select>
          </div>
        )}

        {mode === 'full' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              <Gpu className="h-4 w-4 text-green-500" />
              {t('bm_gpu_brand')}
            </label>
            <select
              value={gpuBrand}
              onChange={(e) => setGpuBrand(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
            >
              <option value="">{t('bm_any')}</option>
              <option value="AMD">AMD</option>
              <option value="NVIDIA">NVIDIA</option>
            </select>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <MemoryStick className="h-4 w-4 text-purple-500" />
            {t('bm_min_ram')}
          </label>
          <select
            value={minRamGb}
            onChange={(e) => setMinRamGb(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="0">{t('bm_any')}</option>
            {RAM_SIZES.map((s) => <option key={s} value={s}>{s} GB</option>)}
          </select>
        </div>

        {mode === 'full' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <Box className="h-4 w-4 text-orange-500" />
                {t('bm_mobo_size')}
              </label>
              <select
                value={moboSize}
                onChange={(e) => setMoboSize(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
              >
                <option value="">{t('bm_any')}</option>
                {CASE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <HardDrive className="h-4 w-4 text-cyan-500" />
                {t('bm_storage_type')}
              </label>
              <select
                value={storageType}
                onChange={(e) => setStorageType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
              >
                <option value="">{t('bm_any')}</option>
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
              <button
                onClick={() => setUseSli((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${useSli ? 'bg-green-600' : 'bg-slate-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useSli && 'translate-x-5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>{t('bm_cpu_oc')}</span>
              <button
                onClick={() => setCpuOc((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${cpuOc ? 'bg-blue-600' : 'bg-slate-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cpuOc && 'translate-x-5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>{t('bm_gpu_oc')}</span>
              <button
                onClick={() => setGpuOc((p) => !p)}
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
        <button
          onClick={doSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-5 w-5" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.cpu.part_name}</div>
                        <div className="text-xs text-slate-400">${r.cpu.price} · {formatNumber(r.cpuScore)} {t('bm_pts')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gpu className="h-4 w-4 text-green-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.gpu.part_name}{r.gpuQty > 1 ? ` ×${r.gpuQty}` : ''}</div>
                        <div className="text-xs text-slate-400">${r.gpu.price * r.gpuQty} · {formatNumber(r.gpuScore)} {t('bm_pts')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-gray-100">{r.ram.part_name} ×{r.ramQty}</div>
                        <div className="text-xs text-slate-400">${r.ram.price * r.ramQty} · {r.ram.total_size_gb * r.ramQty}GB</div>
                      </div>
                    </div>
                    {isFull(r) && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Layers className="h-4 w-4 text-orange-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.motherboard.part_name}</div>
                            <div className="text-xs text-slate-400">${r.motherboard.price}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Fan className="h-4 w-4 text-cyan-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.cooler.part_name}</div>
                            <div className="text-xs text-slate-400">${r.cooler.price}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.psu.part_name}</div>
                            <div className="text-xs text-slate-400">${r.psu.price} · {r.psu.wattage}W</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-cyan-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.storage.part_name}</div>
                            <div className="text-xs text-slate-400">${r.storage.price} · {r.storage.size_gb}GB</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Box className="h-4 w-4 text-gray-500 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-gray-100">{r.case.part_name}</div>
                            <div className="text-xs text-slate-400">${r.case.price}</div>
                          </div>
                        </div>
                      </>
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