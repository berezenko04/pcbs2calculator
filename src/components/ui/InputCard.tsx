'use client'

import { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  children?: ReactNode
}

export default function InputCard({ icon, label, value, onChange, min, children }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
        {icon}
        {label}
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full p-2.5 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {children}
    </div>
  )
}
