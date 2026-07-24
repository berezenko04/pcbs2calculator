export interface CPU {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  chipset: string
  series: string
  frequency: number
  basic_cpu_score: number
  cores: number
  can_overclock?: boolean
  wattage: number
  default_memory_speed: number
  max_freq?: number
  overclock_basic_cpu_score?: number
  max_memory_channels?: number
  cpu_socket?: string
  coreclockmultiplier?: number
  memchannelsmultiplier?: number
  memclockmultiplier?: number
  finaladjustment?: number
}

export interface GPU {
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

export interface RAM {
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

export interface ScoreResult {
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: 'Elite' | 'Performance' | 'Good' | 'Average' | 'Budget' | 'Error'
}

export function supportsSli(gpu: GPU): boolean {
  return gpu.double_gpu_graphics_score !== undefined
    && gpu.double_gpu_graphics_score !== null
    && gpu.double_gpu_graphics_score !== 'false'
}

export function calcCpuScore(cpu: CPU, ram: RAM, ramQty: number, cpuFreq?: number, effectiveRamFreq?: number): number {
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

export function calcTotalScore(cpuScore: number, gpuScore: number): number {
  if (cpuScore <= 0 || gpuScore <= 0) return 0
  const w = 0.15
  return Math.trunc(1 / (w / cpuScore + (1 - w) / gpuScore))
}

export function calcGpuScore(gpu: GPU, coreFreq?: number, memFreq?: number, gpuQuantity?: number): number {
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

export function getRank(totalScore: number): ScoreResult['rank'] {
  if (totalScore >= 30000) return 'Elite'
  if (totalScore >= 20000) return 'Performance'
  if (totalScore >= 15000) return 'Good'
  if (totalScore >= 8000) return 'Average'
  return 'Budget'
}

export function estimateBuildScore(
  cpu: CPU, gpu: GPU, ram: RAM,
  ramQty: number, gpuQuantity: number,
  cpuOc: boolean, gpuOc: boolean
): ScoreResult {
  const cpuFreq = cpuOc && cpu.can_overclock && cpu.max_freq ? cpu.max_freq : cpu.frequency
  const effectiveRamFreq = ram.max_speed
    ? Math.min(ram.max_speed, cpu.default_memory_speed)
    : Math.min(ram.frequency, cpu.default_memory_speed)

  const cpuScore = cpuOc
    ? calcCpuScore(cpu, ram, ramQty, cpuFreq, effectiveRamFreq)
    : calcCpuScore(cpu, ram, ramQty, undefined, effectiveRamFreq)
  const gpuScore = gpuOc
    ? calcGpuScore(gpu, gpu.gpu_max_clock, gpu.gpu_max_mem_clock, gpuQuantity)
    : calcGpuScore(gpu, undefined, undefined, gpuQuantity)
  const totalScore = calcTotalScore(cpuScore, gpuScore)
  const rank = getRank(totalScore)

  return { cpuScore, gpuScore, totalScore, rank }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}
