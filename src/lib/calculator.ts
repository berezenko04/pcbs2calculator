import type { CPU, GPU, RAM, ScoreResult, BenchmarkTest } from './types'

export function supportsSli(gpu: GPU): boolean {
  return gpu.double_gpu_graphics_score !== undefined
    && gpu.double_gpu_graphics_score !== null
    && gpu.double_gpu_graphics_score !== 'false'
}

export function calcCpuScoreBenchmark(cpu: CPU, ram: RAM, ramQty: number, testMode: BenchmarkTest, cpuFreq?: number, effectiveRamFreq?: number): number {
  if (testMode === 'port_royal' || testMode === 'speedway') return 0
  if (testMode === 'timespy_extreme' && cpu.basic_cpu_score_tsx) {
    return calcCpuScoreRaw(
      cpu, ram, ramQty,
      cpu.basic_cpu_score_tsx,
      cpu.coreclockmultiplier_tsx,
      cpu.memchannelsmultiplier_tsx,
      cpu.memclockmultiplier_tsx,
      cpu.finaladjustment_tsx,
      cpuFreq, effectiveRamFreq
    )
  }
  return calcCpuScore(cpu, ram, ramQty, cpuFreq, effectiveRamFreq)
}

function calcCpuScoreRaw(
  cpu: CPU, ram: RAM, ramQty: number,
  baseScore: number,
  coreMult: number | undefined,
  chanMult: number | undefined,
  memMult: number | undefined,
  adj: number | undefined,
  cpuFreq?: number, effectiveRamFreq?: number
): number {
  const freq = Number(cpuFreq && cpuFreq > 0 ? cpuFreq : cpu.frequency) || 0
  if (baseScore === 0) return 0

  const ramFreq = Number(effectiveRamFreq ?? Math.min(ram.frequency, cpu.default_memory_speed)) || 0
  const a = Number(coreMult) || 0
  const b = Number(chanMult) || 0
  const c = Number(memMult) || 0
  const d = Number(adj) || 0
  const defMem = Number(cpu.default_memory_speed) || 2666
  const sticks = Math.max(1, ramQty)
  const maxChannels = Number(cpu.max_memory_channels) || 2
  const channels = Math.min(sticks, maxChannels)

  const opt = a * freq + b * maxChannels + c * defMem + d
  const cur = a * freq + b * channels + c * ramFreq + d

  if (opt === 0) return Math.trunc(baseScore)
  const result = Math.trunc(baseScore * cur / opt)
  return Number.isFinite(result) ? result : Math.trunc(baseScore)
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
  return calcCpuScoreRaw(cpu, ram, ramQty, base, cpu.coreclockmultiplier, cpu.memchannelsmultiplier, cpu.memclockmultiplier, cpu.finaladjustment, cpuFreq, effectiveRamFreq)
}

export function calcTotalScore(cpuScore: number, gpuScore: number): number {
  if (cpuScore <= 0) return gpuScore > 0 ? gpuScore : 0
  if (gpuScore <= 0) return cpuScore > 0 ? cpuScore : 0
  const w = 0.15
  return Math.trunc(1 / (w / cpuScore + (1 - w) / gpuScore))
}

const SCALE_TSE = 39.46
const SCALE_PR = 227.14
const SCALE_SW = 100

function calcGpuScoreMultiplier(
  gpu: GPU, coreFreq: number, memFreq: number, gpuQuantity: number,
  coreMultKey: 'gt1_single_core_clock_multiplier' | 'pr_single_core_clock_multiplier',
  memMultKey: 'gt1_single_mem_clock_multiplier' | 'pr_single_mem_clock_multiplier',
  adjKey: 'gt1_single_benchmark_adjustment' | 'pr_single_benchmark_adjustment' |
          'gt2_single_benchmark_adjustment' | 'speedway_constant',
  scale: number,
  secondCoreMultKey?: 'gt2_single_core_clock_multiplier',
  secondMemMultKey?: 'gt2_single_mem_clock_multiplier',
  secondAdjKey?: 'gt2_single_benchmark_adjustment',
): number {
  const core = Number(coreFreq) || 0
  const mem = Number(memFreq) || 0
  let total = 0

  const c1 = Number((gpu as any)[coreMultKey]) || 0
  const m1 = Number((gpu as any)[memMultKey]) || 0
  const a1 = Number((gpu as any)[adjKey]) || 0
  total += c1 * core + m1 * mem + a1

  if (secondCoreMultKey && secondMemMultKey && secondAdjKey) {
    const c2 = Number((gpu as any)[secondCoreMultKey]) || 0
    const m2 = Number((gpu as any)[secondMemMultKey]) || 0
    const a2 = Number((gpu as any)[secondAdjKey]) || 0
    total += c2 * core + m2 * mem + a2
  }

  return Math.trunc(scale * total)
}

export function calcGpuScoreBenchmark(gpu: GPU, testMode: BenchmarkTest, coreFreq?: number, memFreq?: number, gpuQuantity?: number): number {
  const core = Number(coreFreq && coreFreq > 0 ? coreFreq : gpu.base_core_clock_freq) || 0
  const mem = Number(memFreq && memFreq > 0 ? memFreq : gpu.base_mem_clock_freq) || 0

  if (testMode === 'standard') {
    return calcGpuScore(gpu, coreFreq, memFreq, gpuQuantity)
  }

  if (testMode === 'timespy_extreme') {
    if (gpu.allow_timespy_extreme === false) return 0
    return calcGpuScoreMultiplier(gpu, core, mem, gpuQuantity || 1,
      'gt1_single_core_clock_multiplier', 'gt1_single_mem_clock_multiplier', 'gt1_single_benchmark_adjustment',
      SCALE_TSE,
      'gt2_single_core_clock_multiplier', 'gt2_single_mem_clock_multiplier', 'gt2_single_benchmark_adjustment')
  }

  if (testMode === 'port_royal') {
    if (gpu.allow_port_royal === false || (gpuQuantity && gpuQuantity > 1)) return 0
    return calcGpuScoreMultiplier(gpu, core, mem, gpuQuantity || 1,
      'pr_single_core_clock_multiplier', 'pr_single_mem_clock_multiplier', 'pr_single_benchmark_adjustment',
      SCALE_PR)
  }

  if (testMode === 'speedway') {
    if (gpu.allow_speedway === false || (gpuQuantity && gpuQuantity > 1)) return 0
    return calcGpuScoreMultiplier(gpu, core, mem, gpuQuantity || 1,
      'speedway_core_clock_coefficient' as any, 'speedway_memory_clock_coefficient' as any, 'speedway_constant' as any,
      SCALE_SW)
  }

  return 0
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
  cpuOc: boolean, gpuOc: boolean,
  testMode?: BenchmarkTest
): ScoreResult {
  const cpuFreq = cpuOc && cpu.can_overclock && cpu.max_freq ? cpu.max_freq : cpu.frequency
  const effectiveRamFreq = ram.max_speed
    ? Math.min(ram.max_speed, cpu.default_memory_speed)
    : Math.min(ram.frequency, cpu.default_memory_speed)

  const cpuScore = cpuOc
    ? calcCpuScoreBenchmark(cpu, ram, ramQty, testMode || 'standard', cpuFreq, effectiveRamFreq)
    : calcCpuScoreBenchmark(cpu, ram, ramQty, testMode || 'standard', undefined, effectiveRamFreq)
  const gpuCore = gpuOc ? gpu.gpu_max_clock : undefined
  const gpuMem = gpuOc ? gpu.gpu_max_mem_clock : undefined
  const gpuScore = testMode && testMode !== 'standard'
    ? calcGpuScoreBenchmark(gpu, testMode, gpuCore, gpuMem, gpuQuantity)
    : (gpuOc
      ? calcGpuScore(gpu, gpuCore, gpuMem, gpuQuantity)
      : calcGpuScore(gpu, undefined, undefined, gpuQuantity))
  const totalScore = calcTotalScore(cpuScore, gpuScore)
  const rank = getRank(totalScore)

  return { cpuScore, gpuScore, totalScore, rank }
}

const _nf = new Intl.NumberFormat('en-US')

export function formatNumber(num: number): string {
  return _nf.format(num)
}

export function formatSizeGb(gb: number): string {
  if (gb >= 1000) return Math.round(gb / 1000) + 'TB'
  return gb + 'GB'
}

export function isLocked(
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
