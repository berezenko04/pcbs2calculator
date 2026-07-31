'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { X, TrendingUp } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'

interface Props {
  initialLevel: number
  initialPercent: number
  initialSandbox: boolean
  maxLevel: number
  hasExistingSettings: boolean
  onClose: () => void
  onSave: (level: number, percent: number, sandbox: boolean) => void
}

export default function LevelSettingsModal({ initialLevel, initialPercent, initialSandbox, maxLevel, hasExistingSettings, onClose, onSave }: Props) {
  const { t } = useLang()
  const [sandbox, setSandbox] = useState(initialSandbox)
  const [level, setLevel] = useState(initialLevel)
  const [percent, setPercent] = useState(initialPercent)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:text-gray-400 transition-colors" aria-label={t('close') || 'Close'}>
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="bg-indigo-100 dark:bg-indigo-900 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{t('your_level')}</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">{t('level_desc')}</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('sandbox_mode')}</span>
            <button type="button"
              onClick={() => setSandbox((p) => !p)}
              role="switch"
              aria-checked={sandbox}
              className={clsx(
                'relative w-11 h-6 rounded-full transition-colors',
                sandbox ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-600'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                sandbox && 'translate-x-5'
              )} />
            </button>
          </div>

          <div className={clsx('space-y-6', sandbox && 'hidden')}>
            <div>
              <label htmlFor="level-slider" className="flex justify-between text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <span>{t('level')}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{level}</span>
              </label>
              <input id="level-slider"
                type="range" min={1} max={maxLevel} value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                aria-label={t('level')}
              />
              <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
                <span>1</span>
                <span>{maxLevel}</span>
              </div>
            </div>

            <div>
              <label htmlFor="percent-slider" className="flex justify-between text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <span>{t('progress_through')}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{percent}%</span>
              </label>
              <input id="percent-slider"
                type="range" min={0} max={100} value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                aria-label={t('progress_through')}
              />
              <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <button type="button"
            onClick={() => onSave(level, percent, sandbox)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            {hasExistingSettings ? t('save') : t('get_started')}
          </button>
        </div>
      </div>
    </div>
  )
}
