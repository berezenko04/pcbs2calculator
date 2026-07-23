"use client"

import { useState, useEffect } from 'react'
import PCBs2ScoreCalculator from '@/components/PCBs2ScoreCalculator'

export default function HomePage() {
  const [cpus, setCpus] = useState<any[]>([])
  const [gpus, setGpus] = useState<any[]>([])
  const [rams, setRams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-slate-400 text-lg">Loading components...</div>
    </div>
  )

  return <PCBs2ScoreCalculator cpus={cpus} gpus={gpus} rams={rams} />
}
