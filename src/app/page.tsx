"use client"

import { useState, useEffect } from 'react'
import { LangProvider } from '@/lib/i18n/context'
import AppShell, { type TabId } from '@/components/AppShell'
import type { CPU, GPU, RAM, Motherboard, PSU, StorageDrive, Case, Cooler } from '@/lib/types'
import Calculator from '@/components/calculator/Calculator'
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
  const [cpus, setCpus] = useState<CPU[]>([])
  const [gpus, setGpus] = useState<GPU[]>([])
  const [rams, setRams] = useState<RAM[]>([])
  const [motherboards, setMotherboards] = useState<Motherboard[]>([])
  const [psus, setPsus] = useState<PSU[]>([])
  const [storageDrives, setStorageDrives] = useState<StorageDrive[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [coolers, setCoolers] = useState<Cooler[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('calculator')

  useEffect(() => {
    Promise.all([
      fetch('/api/cpus').then(r => r.json()),
      fetch('/api/gpus').then(r => r.json()),
      fetch('/api/rams').then(r => r.json()),
      fetch('/api/motherboard').then(r => r.json()),
      fetch('/api/psu').then(r => r.json()),
      fetch('/api/storage').then(r => r.json()),
      fetch('/api/cases').then(r => r.json()),
      fetch('/api/coolers').then(r => r.json()),
    ]).then(([c, g, r, mb, p, s, cs, cl]) => {
      setCpus(c)
      setGpus(g)
      setRams(r)
      setMotherboards(mb)
      setPsus(p)
      setStorageDrives(s)
      setCases(cs)
      setCoolers(cl)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingFallback />

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'calculator' && <Calculator cpus={cpus} gpus={gpus} rams={rams} />}
      {activeTab === 'buildmaker' && <BuildMaker cpus={cpus} gpus={gpus} rams={rams} motherboards={motherboards} psus={psus} storageDrives={storageDrives} cases={cases} coolers={coolers} />}
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
