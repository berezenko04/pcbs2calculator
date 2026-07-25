'use client'

import { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  icon: ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  anyLabel: string
}

export default function SelectCard({ icon, label, value, onChange, options, anyLabel }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2.5 pr-10 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-gray-100 appearance-none cursor-pointer"
        >
          <option value="">{anyLabel}</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
      </div>
    </div>
  )
}
