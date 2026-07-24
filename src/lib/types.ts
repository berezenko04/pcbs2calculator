export interface CPU {
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
  chipset: string
  wattage: number
  default_memory_speed: number
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

export interface CalculatorState {
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

export interface LevelSettings {
  level: number
  percent: number
  isSandbox?: boolean
}

export interface ScoreResult {
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: 'Elite' | 'Performance' | 'Good' | 'Average' | 'Budget' | 'Error'
}
