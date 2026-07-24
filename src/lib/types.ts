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
  length?: number
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

export interface Motherboard {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  chipset?: string
  cpu_socket?: string
  motherboard_size?: string
  default_memory_speed?: number
  max_memory_speed?: number
  support_sli?: boolean
  support_crossfire?: boolean
  can_overclock?: boolean
}

export interface PSU {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  wattage: number
  size?: string
  modularity?: string
}

export interface StorageDrive {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  size_gb: number
  type: string
  speed?: number
}

export interface Case {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  case_size?: string
  motherboard_size?: string
  max_gpu_length?: number
  max_cpu_fan_height?: number
  max_psu_length?: number
  psu_size?: string
  mini_itx?: boolean
  micro_atx?: boolean
  s_atx?: boolean
  e_atx?: boolean
  xl_atx?: boolean
  restricted_gpu_length?: number
}

export interface Cooler {
  id: string
  part_name: string
  manufacturer: string
  price: number
  level: number
  percent_through?: number | boolean
  type: string
  height?: number
  air_flow?: number
  size?: string
  no_fan?: boolean
  cpu_socket_list?: string
  am4?: boolean
  am3?: boolean
  fm2?: boolean
  lga_1151_coffee_lake?: boolean
  lga_1151_kaby_lake?: boolean
  lga_1151_skylake?: boolean
  lga_1200?: boolean
  lga_2011_v3?: boolean
  lga_2066?: boolean
  tr4?: boolean
  strx4?: boolean
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
