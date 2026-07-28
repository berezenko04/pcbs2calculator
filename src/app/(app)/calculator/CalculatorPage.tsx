'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Calculator from '@/components/calculator/Calculator'
import { useLevelSettings } from '@/lib/levelSettingsContext'
import type { CPU, GPU, RAM, CalculatorState, BenchmarkTest } from '@/lib/types'
import type { GameVersion } from '@/lib/gameVersion'

interface Props {
  cpus: CPU[]; gpus: GPU[]; rams: RAM[]; gameVersion: GameVersion
}

function parseInitialState(params: URLSearchParams, cpus: CPU[], gpus: GPU[], rams: RAM[]): Partial<CalculatorState> {
  const s: Partial<CalculatorState> = {}
  const cpuId = params.get('cpu')
  if (cpuId && cpus.some(c => String(c.id) === cpuId)) s.selectedCPU = cpuId
  const gpuId = params.get('gpu')
  if (gpuId && gpus.some(g => String(g.id) === gpuId)) s.selectedGPU = gpuId
  const ramId = params.get('ram')
  if (ramId && rams.some(r => String(r.id) === ramId)) s.selectedRAM = ramId
  const mode = params.get('mode') as BenchmarkTest | null
  if (mode && (['standard', 'timespy_extreme', 'port_royal', 'speedway'] as BenchmarkTest[]).includes(mode)) s.testMode = mode
  const cpuF = params.get('cpuFreq')
  if (cpuF) s.cpuFreq = Number(cpuF)
  const gq = params.get('gpuQty')
  if (gq === '1' || gq === '2') s.gpuQuantity = parseInt(gq)
  const gc = params.get('gpuCore')
  if (gc) s.gpuCoreFreq = Number(gc)
  const gm = params.get('gpuMem')
  if (gm) s.gpuMemFreq = Number(gm)
  const rq = params.get('ramQty')
  if (rq) s.ramQuantity = Number(rq)
  const rf = params.get('ramFreq')
  if (rf) s.effectiveRamFreq = Number(rf)
  return s
}

export default function CalculatorPage({ cpus, gpus, rams, gameVersion }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const levelSettings = useLevelSettings()

  const initialState = useMemo(() => parseInitialState(searchParams, cpus, gpus, rams), [searchParams, cpus, gpus, rams])

  const handleStateChange = useCallback((state: CalculatorState) => {
    const p = new URLSearchParams()
    if (state.selectedCPU) p.set('cpu', state.selectedCPU)
    if (state.selectedGPU) p.set('gpu', state.selectedGPU)
    if (state.selectedRAM) p.set('ram', state.selectedRAM)
    if (state.testMode && state.testMode !== 'standard') p.set('mode', state.testMode)
    if (state.cpuFreq) p.set('cpuFreq', String(state.cpuFreq))
    if (state.gpuQuantity > 1) p.set('gpuQty', String(state.gpuQuantity))
    if (state.gpuCoreFreq) p.set('gpuCore', String(state.gpuCoreFreq))
    if (state.gpuMemFreq) p.set('gpuMem', String(state.gpuMemFreq))
    if (state.ramQuantity > 1) p.set('ramQty', String(state.ramQuantity))
    if (state.effectiveRamFreq != null) p.set('ramFreq', String(state.effectiveRamFreq))
    const qs = p.toString()
    router.replace(`/calculator?version=${gameVersion}${qs ? '&' + qs : ''}`, { scroll: false })
  }, [gameVersion, router])

  return (
    <Calculator cpus={cpus} gpus={gpus} rams={rams} levelSettings={levelSettings} gameVersion={gameVersion}
      initialState={initialState} onStateChange={handleStateChange} />
  )
}
