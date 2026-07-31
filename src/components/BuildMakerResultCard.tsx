'use client'

import { Cpu, Gpu, MemoryStick, TrendingUp, Layers, HardDrive, Box, Zap, Fan } from 'lucide-react'
import { formatNumber, formatSizeGb } from '@/lib/calculator'
import { useLang } from '@/lib/i18n/context'
export default function BuildMakerResultCard({ result, index }: { result: any; index: number }) {
  const { t } = useLang()
  const isFull = 'motherboard' in result

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-indigo-500">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {index === 0 ? t('bm_best_match') : t('bm_option') + ' #' + (index + 1)}
        </span>
        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${formatNumber(result.totalPrice)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <div className="font-medium text-slate-800 dark:text-gray-100">{result.cpu.manufacturer} {result.cpu.part_name}</div>
            <div className="text-xs text-slate-400">{formatNumber(result.cpuScore)} {t('bm_pts')} · ${formatNumber(result.cpu.price)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Gpu className="h-4 w-4 text-green-500 shrink-0" />
          <div>
            <div className="font-medium text-slate-800 dark:text-gray-100">{result.gpu.manufacturer} {result.gpu.part_name}{result.gpuQty > 1 ? ' x' + result.gpuQty : ''}</div>
            <div className="text-xs text-slate-400">{formatNumber(result.gpuScore)} {t('bm_pts')} · ${formatNumber(result.gpu.price * result.gpuQty)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
          <div>
            <div className="font-medium text-slate-800 dark:text-gray-100">{result.ram.manufacturer} {result.ram.part_name} {result.ram.frequency}MHz x{result.ramQty}</div>
            <div className="text-xs text-slate-400">{result.ram.total_size_gb * result.ramQty}GB · ${formatNumber(result.ram.price * result.ramQty)}</div>
          </div>
        </div>
        {isFull && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <div className="font-medium text-slate-800 dark:text-gray-100">{result.motherboard.manufacturer} {result.motherboard.part_name}</div>
                <div className="text-xs text-slate-400">{result.motherboard.motherboard_size} · ${formatNumber(result.motherboard.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Fan className="h-4 w-4 text-cyan-500 shrink-0" />
              <div>
                <div className="font-medium text-slate-800 dark:text-gray-100">{result.cooler.manufacturer} {result.cooler.part_name}</div>
                <div className="text-xs text-slate-400">${formatNumber(result.cooler.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
              <div>
                <div className="font-medium text-slate-800 dark:text-gray-100">{result.psu.manufacturer} {result.psu.part_name}</div>
                <div className="text-xs text-slate-400">{result.psu.wattage}W · ${formatNumber(result.psu.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4 text-cyan-500 shrink-0" />
              <div>
                <div className="font-medium text-slate-800 dark:text-gray-100">{result.storage.manufacturer} {result.storage.part_name}</div>
                <div className="text-xs text-slate-400">{formatSizeGb(result.storage.size_gb)} · ${formatNumber(result.storage.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Box className="h-4 w-4 text-gray-500 shrink-0" />
              <div>
                <div className="font-medium text-slate-800 dark:text-gray-100">{result.case.manufacturer} {result.case.part_name}</div>
                <div className="text-xs text-slate-400">${formatNumber(result.case.price)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_3dmark_score')}:</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(result.totalScore)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-gray-500">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>{result.totalTdp}W</span>
          </div>
        </div>
        <span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (
          result.rank === 'Elite' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
          : result.rank === 'Performance' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
          : result.rank === 'Good' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          : result.rank === 'Average' ? 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
          : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
        )}>
          {t(result.rank.toLowerCase())}
        </span>
      </div>
    </div>
  )
}
