import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler, ScoreResult } from '@/lib/types'

function supportsSli(gpu: GPU): boolean {
  return gpu.double_gpu_graphics_score !== undefined
    && gpu.double_gpu_graphics_score !== null
    && gpu.double_gpu_graphics_score !== 'false'
}

function calcCpuScore(cpu: CPU, ram: RAM, ramQty: number, cpuFreq?: number): number {
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
  const ramFreq = Number(Math.min(ram.frequency, cpu.default_memory_speed)) || 0
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

function calcGpuScore(gpu: GPU, gpuQuantity: number): number {
  const isDual = gpuQuantity === 2 && supportsSli(gpu)
  return isDual ? Number(gpu.double_gpu_graphics_score) || 0 : Number(gpu.single_gpu_graphics_score) || 0
}

function calcTotalScore(cpuScore: number, gpuScore: number): number {
  if (cpuScore <= 0 || gpuScore <= 0) return 0
  return Math.trunc(1 / (0.15 / cpuScore + 0.85 / gpuScore))
}

function getRank(totalScore: number): ScoreResult['rank'] {
  if (totalScore >= 30000) return 'Elite'
  if (totalScore >= 20000) return 'Performance'
  if (totalScore >= 15000) return 'Good'
  if (totalScore >= 8000) return 'Average'
  return 'Budget'
}

function estimateScore(cpu: CPU, gpu: GPU, ram: RAM, ramQty: number, gpuQty: number, cpuOc: boolean, gpuOc: boolean): ScoreResult {
  const cpuFreq = cpuOc && cpu.can_overclock && cpu.max_freq ? cpu.max_freq : cpu.frequency
  const cpuScore = calcCpuScore(cpu, ram, ramQty, cpuOc ? cpuFreq : undefined)
  const gpuScore = calcGpuScore(gpu, gpuQty)
  const totalScore = calcTotalScore(cpuScore, gpuScore)
  return { cpuScore, gpuScore, totalScore, rank: getRank(totalScore) }
}

function isCoolerSocketCompatible(cpuSocket: string, cooler: Cooler): boolean {
  if (cooler.cpu_socket_list) {
    if (cooler.cpu_socket_list.split(',').map(s => s.trim()).includes(cpuSocket)) return true
  }
  const fieldMap: Record<string, keyof Cooler> = {
    'AM4': 'am4', 'AM3': 'am3', 'FM2': 'fm2',
    'LGA 1151 (Coffee Lake)': 'lga_1151_coffee_lake',
    'LGA 1151 (Kaby Lake)': 'lga_1151_kaby_lake',
    'LGA 1151 (Skylake)': 'lga_1151_skylake',
    'LGA 1200': 'lga_1200', 'LGA 2011 v3': 'lga_2011_v3',
    'LGA 2066': 'lga_2066', 'TR4': 'tr4', 'sTRX4': 'strx4',
  }
  const field = fieldMap[cpuSocket]
  return field ? cooler[field] === true : false
}

function isCaseCompatible(caseItem: Case, moboSize: string): boolean {
  if (caseItem.motherboard_size) {
    if (caseItem.motherboard_size.split(',').map(s => s.trim()).filter(Boolean).includes(moboSize)) return true
  }
  const fieldMap: Record<string, keyof Case> = {
    'Mini-ITX': 'mini_itx', 'Micro-ATX': 'micro_atx',
    'S-ATX': 's_atx', 'E-ATX': 'e_atx', 'XL-ATX': 'xl_atx',
  }
  const field = fieldMap[moboSize]
  return field ? caseItem[field] === true : false
}

function getTotalTdp(cpu: CPU, gpu: GPU, gpuQty: number): number {
  return (Number(cpu.wattage) || 0) + (Number(gpu.wattage) || 0) * gpuQty + 100
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

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    budget = 0, targetScore = 0, socket = '', cpuBrand = '', gpuBrand = '',
    useSli = false, cpuOc = false, gpuOc = false, minRamGb = 0,
    moboSize = '', storageType = '',
    level = 0, levelPercent = 0, levelSandbox = false,
  } = body

  if (budget <= 0) return NextResponse.json({ builds: [] })

  const avail = budget

  const [cpuRows, gpuRows, ramRows, mbRows, psuRows, storageRows, caseRows, coolerRows] = await Promise.all([
    query('SELECT * FROM cpu ORDER BY id'),
    query('SELECT * FROM gpu ORDER BY id'),
    query('SELECT * FROM ram ORDER BY id'),
    query('SELECT * FROM motherboard ORDER BY id'),
    query('SELECT * FROM psu ORDER BY id'),
    query('SELECT * FROM storage ORDER BY id'),
    query('SELECT * FROM cases ORDER BY id'),
    query('SELECT * FROM coolers ORDER BY id'),
  ])

  const cpus = cpuRows as unknown as CPU[]
  const gpus = gpuRows as unknown as GPU[]
  const rams = ramRows as unknown as RAM[]
  const motherboards = mbRows as unknown as Motherboard[]
  const psus = psuRows as unknown as PSU[]
  const storageDrives = storageRows as unknown as StorageDrive[]
  const cases = caseRows as unknown as Case[]
  const coolers = coolerRows as unknown as Cooler[]

  const lvlFilter = level > 0 && !levelSandbox
    ? (lvl: number, pct: number | boolean | undefined | null) => isLocked(lvl, pct, level, levelPercent)
    : () => false

  const cpuCandidates = cpus.filter(c => {
    if (socket && c.cpu_socket !== socket) return false
    if (cpuBrand && c.manufacturer !== cpuBrand) return false
    if (Number(c.price) > avail * 0.35) return false
    if (cpuOc && !c.can_overclock) return false
    if (lvlFilter(c.level, c.percent_through)) return false
    return true
  })

  const gpuCandidates = gpus.filter(g => {
    if (gpuBrand && g.manufacturer !== gpuBrand) return false
    if (useSli && !supportsSli(g)) return false
    if (Number(g.price) > avail * 0.40) return false
    if (lvlFilter(g.level, g.percent_through)) return false
    return true
  })

  const ramCandidates = rams.filter(r => {
    if (r.total_size_gb < minRamGb) return false
    if (Number(r.price) * 2 > avail * 0.10) return false
    if (lvlFilter(r.level, r.percent_through)) return false
    return true
  })

  const mbCandidates = motherboards.filter(mb => {
    if (socket && mb.cpu_socket !== socket) return false
    if (moboSize && mb.motherboard_size !== moboSize) return false
    if (Number(mb.price) > avail * 0.18) return false
    if (cpuOc && !mb.can_overclock) return false
    if (lvlFilter(mb.level, mb.percent_through)) return false
    return true
  })

  const psuCandidates = psus.filter(p => {
    if (Number(p.price) <= 0 || Number(p.price) > avail * 0.12) return false
    if (lvlFilter(p.level, p.percent_through)) return false
    return true
  })
  const storageCandidates = storageDrives.filter(s => {
    if (storageType && s.type !== storageType) return false
    if (Number(s.price) > avail * 0.08) return false
    if (lvlFilter(s.level, s.percent_through)) return false
    return true
  })
  const caseCandidates = cases.filter(c => {
    if (Number(c.price) <= 0 || Number(c.price) > avail * 0.12) return false
    if (lvlFilter(c.level, c.percent_through)) return false
    return true
  })
  const coolerCandidates = coolers.filter(cl => {
    if (Number(cl.price) <= 0 || Number(cl.price) > avail * 0.08) return false
    if (lvlFilter(cl.level, cl.percent_through)) return false
    return true
  })

  const gpuQty = useSli ? 2 : 1
  const ramQty = 2

  const psusSorted = [...psuCandidates].sort((a, b) => Number(a.price) - Number(b.price))
  const storageSorted = [...storageCandidates].sort((a, b) => Number(a.price) - Number(b.price))

  const allSockets = [...new Set(cpus.map(c => c.cpu_socket).filter(Boolean))]
  const coolersBySocket: Record<string, Cooler[]> = {}
  for (const sock of allSockets) {
    coolersBySocket[sock!] = coolerCandidates
      .filter(cl => isCoolerSocketCompatible(sock!, cl))
      .sort((a, b) => Number(a.price) - Number(b.price))
  }

  const allMoboSizes = [...new Set(motherboards.map(mb => mb.motherboard_size).filter(Boolean))]
  const casesBySize: Record<string, Case[]> = {}
  for (const size of allMoboSizes) {
    casesBySize[size!] = caseCandidates
      .filter(c => isCaseCompatible(c, size!))
      .sort((a, b) => Number(a.price) - Number(b.price))
  }

  const mbBySocket: Record<string, Motherboard[]> = {}
  for (const mb of mbCandidates) {
    const s = mb.cpu_socket || ''
    if (!mbBySocket[s]) mbBySocket[s] = []
    mbBySocket[s].push(mb)
  }

  const found: any[] = []
  const seen = new Set<string>()

  for (const cpu of cpuCandidates) {
    const cpuSocket = cpu.cpu_socket || ''
    const compatMbs = mbBySocket[cpuSocket] || []
    if (compatMbs.length === 0) continue
    const compatCoolers = coolersBySocket[cpuSocket] || []
    if (compatCoolers.length === 0) continue

    for (const gpu of gpuCandidates) {
      const totalTdp = getTotalTdp(cpu, gpu, gpuQty)

      for (const ram of ramCandidates) {
        const coreKey = `${cpu.id}|${gpu.id}|${ram.id}`
        if (seen.has(coreKey)) continue
        seen.add(coreKey)

        const score = estimateScore(cpu, gpu, ram, ramQty, gpuQty, cpuOc, gpuOc)
        if (score.totalScore < targetScore) continue

        const cpuPrice = Number(cpu.price)
        const gpuPrice = Number(gpu.price) * gpuQty
        const ramPrice = Number(ram.price) * ramQty
        let best: any = null

        for (const mb of compatMbs) {
          const mbPrice = Number(mb.price)
          const coreTotal = cpuPrice + gpuPrice + ramPrice + mbPrice
          let rem = avail - coreTotal
          if (rem < 0) continue

          const mbSize = mb.motherboard_size || ''
          const compatCases = casesBySize[mbSize] || []
          if (compatCases.length === 0) continue

          let cooler: Cooler | null = null
          for (const cl of compatCoolers) {
            if (Number(cl.price) <= rem) { cooler = cl; break }
          }
          if (!cooler) continue
          rem -= Number(cooler.price)

          let psu: PSU | null = null
          for (const p of psusSorted) {
            if (Number(p.wattage) >= totalTdp && Number(p.price) <= rem) { psu = p; break }
          }
          if (!psu) continue
          rem -= Number(psu.price)

          let caseItem: Case | null = null
          for (const c of compatCases) {
            if (Number(c.price) > rem) continue
            if (psu.size && c.max_psu_length && parseInt(String(psu.size)) > Number(c.max_psu_length)) continue
            if (cooler.type?.toLowerCase().includes('air') && cooler.height && c.max_cpu_fan_height && Number(cooler.height) > Number(c.max_cpu_fan_height)) continue
            caseItem = c; break
          }
          if (!caseItem) continue

          let storage: StorageDrive | null = null
          for (const s of storageSorted) {
            if (Number(s.price) <= rem) { storage = s; break }
          }
          if (!storage) continue

          const totalPrice = coreTotal + Number(cooler.price) + Number(psu.price) + Number(caseItem.price) + Number(storage.price)

          if (!best || totalPrice < best.totalPrice) {
            best = {
              cpu: { id: cpu.id, part_name: cpu.part_name, manufacturer: cpu.manufacturer, price: cpu.price },
              gpu: { id: gpu.id, part_name: gpu.part_name, manufacturer: gpu.manufacturer, price: gpu.price },
              ram: { id: ram.id, part_name: ram.part_name, manufacturer: ram.manufacturer, price: ram.price, total_size_gb: ram.total_size_gb },
              ramQty, gpuQty,
              motherboard: { id: mb.id, part_name: mb.part_name, manufacturer: mb.manufacturer, price: mb.price, motherboard_size: mb.motherboard_size },
              cooler: { id: cooler.id, part_name: cooler.part_name, manufacturer: cooler.manufacturer, price: cooler.price },
              psu: { id: psu.id, part_name: psu.part_name, manufacturer: psu.manufacturer, price: psu.price, wattage: psu.wattage },
              case: { id: caseItem.id, part_name: caseItem.part_name, manufacturer: caseItem.manufacturer, price: caseItem.price },
              storage: { id: storage.id, part_name: storage.part_name, manufacturer: storage.manufacturer, price: storage.price, size_gb: storage.size_gb },
              totalPrice,
              cpuScore: score.cpuScore,
              gpuScore: score.gpuScore,
              totalScore: score.totalScore,
              rank: score.rank,
            }
          }
        }

        if (best) found.push(best)
      }
    }
  }

  function selectDiverseBuilds(builds: any[], maxCount: number): any[] {
    if (builds.length <= 1) return builds.slice(0, maxCount)
    const sorted = [...builds].sort((a, b) => b.totalScore - a.totalScore)
    const selected = [sorted[0]]
    for (let i = 1; i < sorted.length && selected.length < maxCount; i++) {
      const b = sorted[i]
      let ok = true
      for (const s of selected) {
        let diff = 0
        if (b.cpu.id !== s.cpu.id) diff++
        if (b.gpu.id !== s.gpu.id) diff++
        if (b.ram.id !== s.ram.id) diff++
        if (b.motherboard?.id !== s.motherboard?.id) diff++
        if (b.cooler?.id !== s.cooler?.id) diff++
        if (b.psu?.id !== s.psu?.id) diff++
        if (b.case?.id !== s.case?.id) diff++
        if (b.storage?.id !== s.storage?.id) diff++
        if (diff < 3) { ok = false; break }
      }
      if (ok) selected.push(b)
    }
    return selected
  }

  found.sort((a, b) => b.totalScore - a.totalScore)
  return NextResponse.json({ builds: selectDiverseBuilds(found, 10) })
}