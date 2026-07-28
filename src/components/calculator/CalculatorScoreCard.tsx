'use client'

import clsx from 'clsx'
import { Calculator as CalcIcon, Cpu, Gpu, TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/calculator'
import { useLang } from '@/lib/i18n/context'
import type { ScoreResult, BenchmarkTest } from '@/lib/types'

interface Props {
  cpuScore: number
  gpuScore: number
  totalScore: number
  rank: ScoreResult['rank']
  testMode: BenchmarkTest
  onReset: () => void
  hasSelection: boolean
}

export default function CalculatorScoreCard({ cpuScore, gpuScore, totalScore, rank, testMode, onReset, hasSelection }: Props) {
  const { t } = useLang()
  const isGpuOnly = testMode === 'port_royal' || testMode === 'speedway'

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-2xl p-8 text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">{t('score_title')}</h2>
      {hasSelection && rank !== 'Error' ? (
        <div className="space-y-6">
          <div className={clsx('grid gap-4', isGpuOnly ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
            {!isGpuOnly && (
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="bg-blue-500/20 dark:bg-blue-400/20 p-2.5 rounded-lg"><Cpu className="h-5 w-5 text-blue-400" /></div>
                <div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('cpu_score')}</div>
                  <div className="text-2xl font-bold text-blue-400">{formatNumber(cpuScore)}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="bg-green-500/20 dark:bg-green-400/20 p-2.5 rounded-lg"><Gpu className="h-5 w-5 text-green-400" /></div>
              <div>
                <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('gpu_score')}</div>
                <div className="text-2xl font-bold text-green-400">{formatNumber(gpuScore)}</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center">
              <span className="bg-slate-800 px-4 py-1 rounded-full text-xs text-slate-400 dark:text-gray-500 border border-white/10">{t('total_label')}</span>
            </div>
          </div>
          <div className="text-center py-2">
            <div className="text-6xl font-bold tracking-tight">{formatNumber(totalScore)}</div>
            <div className={clsx('inline-flex items-center gap-2 px-5 py-2 mt-3 rounded-full text-sm font-semibold border',
              rank === 'Elite' && 'bg-green-500/20 text-green-300 border-green-500/30',
              rank === 'Performance' && 'bg-blue-500/20 dark:bg-blue-400/20 text-blue-300 border-blue-500/30',
              rank === 'Good' && 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
              rank === 'Average' && 'bg-orange-500/20 text-orange-300 border-orange-500/30',
              rank === 'Budget' && 'bg-red-500/20 text-red-300 border-red-500/30',
            )}>
              <TrendingUp className="h-4 w-4" />
              {t('rank_performance', t(rank.toLowerCase()))}
            </div>
          </div>
          <div className="flex justify-center">
            <button type="button" onClick={onReset}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
            >{t('reset')}</button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <CalcIcon className="h-16 w-16 mx-auto mb-4 text-slate-400 dark:text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">{t('no_selection')}</h3>
          <p className="text-slate-400 dark:text-gray-500">{t('no_selection_desc')}</p>
        </div>
      )}
    </div>
  )
}
