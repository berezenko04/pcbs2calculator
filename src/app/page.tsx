"use client"

import { useState, useEffect } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import PCBs2ScoreCalculator from '@/components/PCBs2ScoreCalculator'
import BuildMaker from '@/components/BuildMaker'
import { useLang } from '@/lib/i18n/context'

function LoadingFallback() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-slate-400 text-lg">{t('loading')}</div>
    </div>
  )
}

function HomeInner() {
  const [cpus, setCpus] = useState<any[]>([])
  const [gpus, setGpus] = useState<any[]>([])
  const [rams, setRams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('calculator')

  useEffect(() => {
    Promise.all([
      fetch('/api/cpus').then(r => r.json()),
      fetch('/api/gpus').then(r => r.json()),
      fetch('/api/rams').then(r => r.json()),
    ]).then(([c, g, r]) => {
      setCpus(c)
      setGpus(g)
      setRams(r)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingFallback />

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'calculator' && <PCBs2ScoreCalculator cpus={cpus} gpus={gpus} rams={rams} />}
      {activeTab === 'buildmaker' && <BuildMaker cpus={cpus as any} gpus={gpus as any} rams={rams as any} />}
    </AppShell>
  )
}

export default function HomePage() {
  return (
    <LangProvider>
      <HomeInner />
    </LangProvider>
  )
}
