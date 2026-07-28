'use client'

import { useState } from 'react'

export default function Slider({ min, max, step, value, onChange, className }: {
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  const [local, setLocal] = useState<number | null>(null)
  const display = local ?? value

  return (
    <input type="range"
      min={min} max={max} step={step}
      value={display}
      aria-label="Slider"
      onChange={(e) => setLocal(Number(e.target.value))}
      onPointerUp={() => {
        if (local !== null) { onChange(local); setLocal(null) }
      }}
      onPointerLeave={() => {
        if (local !== null) { onChange(local); setLocal(null) }
      }}
      className={className}
    />
  )
}
