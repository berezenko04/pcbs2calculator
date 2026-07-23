'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Calculator, Wrench, Moon, Sun, Star } from 'lucide-react'
import LangSwitcher from './LangSwitcher'
import { useLang } from '@/lib/i18n/context'

export type TabId = 'calculator' | 'buildmaker'

interface Props {
  children: ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function AppShell({ children, activeTab, onTabChange }: Props) {
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

  useEffect(() => {
    fetch('https://api.github.com/repos/berezenko04/pcbs2calculator')
      .then(r => r.json())
      .then(d => setStarCount(d.stargazers_count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem('pcbs2_dark', String(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const tabs: { id: TabId; label: string; icon: typeof Calculator }[] = [
    { id: 'calculator', label: t('tab_calculator'), icon: Calculator },
    { id: 'buildmaker', label: t('tab_build_maker'), icon: Wrench },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
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
              onClick={() => setDarkMode((p) => !p)}
              className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-xl transition-all"
              title={t('toggle_dark')}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
