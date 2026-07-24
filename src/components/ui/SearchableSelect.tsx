'use client'

import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

interface Props<T extends { id: string }> {
  options: T[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder: string
  getLabel: (item: T) => string
  noResultsText?: string
  anyLabel?: string
}

export default function SearchableSelect<T extends { id: string }>({ options, value, onChange, placeholder, getLabel, noResultsText, anyLabel }: Props<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayText = value
    ? (options.find((o) => o.id === value) ? getLabel(options.find((o) => o.id === value)!) : '')
    : anyLabel ?? ''

  const filtered = search
    ? options.filter((o) => getLabel(o).toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative mb-4">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? search : displayText}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true) }}
        onFocus={() => { setIsOpen(true); setSearch('') }}
        placeholder={value && !anyLabel ? placeholder : undefined}
        className={clsx('w-full p-2.5 pr-10 border border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 text-sm', !value ? 'text-slate-400 dark:text-gray-500' : 'dark:text-gray-100')}
      />
      <ChevronDown className="absolute right-3 top-4 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {anyLabel && (
            <button
              type="button"
              className={clsx('w-full text-left p-3 text-sm dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors', !value && 'bg-blue-100 dark:bg-blue-900 dark:text-white font-semibold')}
              onClick={() => { onChange(null); setIsOpen(false); setSearch('') }}
            >
              {anyLabel}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="p-3 text-slate-400 dark:text-gray-500 text-sm">{noResultsText || 'No results'}</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={clsx('w-full text-left p-3 text-sm dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors', item.id === value && 'bg-blue-100 dark:bg-blue-900 dark:text-white font-semibold')}
                onClick={() => { onChange(item.id); setIsOpen(false); setSearch('') }}
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
