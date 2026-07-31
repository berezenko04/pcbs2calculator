'use client'

import clsx from 'clsx'
import { ArrowUp, Cpu, Gpu, MemoryStick, TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/calculator'
import { useLang } from '@/lib/i18n/context'

interface Props {
  label: string
  cost: number
  oldTotalScore: number
  newTotalScore: number
  scoreDelta: number
  rank: string
  cpuLabel: string
  gpuLabel: string
  ramLabel: string
  hasNewCpu: boolean
  hasNewGpu: boolean
  hasNewRam: boolean
}

export default function BuildUpgraderResultCard({ label, cost, oldTotalScore, newTotalScore, scoreDelta, rank, cpuLabel, gpuLabel, ramLabel, hasNewCpu, hasNewGpu, hasNewRam }: Props) {
  const { t } = useLang()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-emerald-500">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <ArrowUp className="h-4 w-4" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-gray-500">{t('bu_upgrade_cost')}:</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${formatNumber(cost)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <div className={clsx('font-medium', hasNewCpu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
              {cpuLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Gpu className="h-4 w-4 text-green-500 shrink-0" />
          <div>
            <div className={clsx('font-medium', hasNewGpu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
              {gpuLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MemoryStick className="h-4 w-4 text-purple-500 shrink-0" />
          <div>
            <div className={clsx('font-medium', hasNewRam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-gray-100')}>
              {ramLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span className="text-sm text-slate-500 dark:text-gray-400">{t('bm_3dmark_score')}:</span>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(newTotalScore)}</span>
            <span className="text-xs text-slate-400 dark:text-gray-500 line-through">{formatNumber(oldTotalScore)}</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatNumber(scoreDelta)}</span>
          </div>
        </div>
        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold',
          rank === 'Elite' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
          rank === 'Performance' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
          rank === 'Good' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
          rank === 'Average' ? 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300' :
          'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
        )}>
          {t(rank.toLowerCase())}
        </span>
      </div>
    </div>
  )
}
