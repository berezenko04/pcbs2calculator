'use client'

import { useState, useEffect, ReactNode, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Calculator as CalcIcon, Wrench, ArrowUp, Moon, Sun, Star, TrendingUp, Settings } from 'lucide-react'
import LangSwitcher from './LangSwitcher'
import { useLang } from '@/lib/i18n/context'
import type { LevelSettings } from '@/lib/types'

export type TabId = 'calculator' | 'buildmaker' | 'upgrader'

interface Props {
  children: ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  levelSettings: LevelSettings | null
  onOpenSettings: () => void
}

export default function AppShell({ children, activeTab, onTabChange, levelSettings, onOpenSettings }: Props) {
  const { t } = useLang()
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pcbs2_dark')
      if (stored === 'true') {
        document.documentElement.classList.add('dark')
        return true
      }
    }
    return false
  })
  const [starCount, setStarCount] = useState<number | null>(null)
  const themeBtnRef = useRef<HTMLButtonElement>(null)

  const toggleDark = () => {
    const next = !document.documentElement.classList.contains('dark')
    if (
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => {
        flushSync(() => {
          document.documentElement.classList.toggle('dark', next)
          localStorage.setItem('pcbs2_dark', String(next))
          setDarkMode(next)
        })
      }).ready.then(() => {
        const btn = themeBtnRef.current
        if (!btn) return
        const { left, top, width, height } = btn.getBoundingClientRect()
        const x = left + width / 2
        const y = top + height / 2
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        )
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        )
      })
    } else {
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('pcbs2_dark', String(next))
      setDarkMode(next)
    }
  }

  useEffect(() => {
    fetch('https://api.github.com/repos/berezenko04/pcbs2calculator')
      .then(r => r.json())
      .then(d => setStarCount(d.stargazers_count))
      .catch(() => {})
  }, [])

  const tabs: { id: TabId; label: string; icon: typeof CalcIcon }[] = [
    { id: 'calculator', label: t('tab_calculator'), icon: CalcIcon },
    { id: 'buildmaker', label: t('tab_build_maker'), icon: Wrench },
    { id: 'upgrader', label: t('tab_build_upgrader'), icon: ArrowUp },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {starCount !== null && (
              <a
                href="https://github.com/berezenko04/pcbs2calculator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                <span className="hidden sm:inline">{t('star')}</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {starCount}
                </span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <button
              ref={themeBtnRef}
              onClick={toggleDark}
              className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all"
              title={t('toggle_dark')}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {levelSettings && (
              <button onClick={onOpenSettings} className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all" title={t('change_level')}>
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className="bg-indigo-100 dark:bg-indigo-900 p-2.5 rounded-xl inline-flex mb-3">
            <CalcIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">{t('subtitle')}</p>
          {levelSettings && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="inline-flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                {levelSettings.isSandbox ? t('sandbox_mode') : t('level_badge', String(levelSettings.level), String(levelSettings.percent))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div key={activeTab} className="animate-fadeIn">
          {children}
        </div>
      </div>
    </div>
  )
}
