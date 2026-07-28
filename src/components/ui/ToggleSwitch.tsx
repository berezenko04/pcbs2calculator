'use client'

interface Props {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  activeColor?: string
}

export default function ToggleSwitch({ label, checked, onChange, activeColor = 'bg-green-600' }: Props) {
  return (
    <label className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
      <span>{label}</span>
      <button type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={'relative w-10 h-5 rounded-full transition-colors ' + (checked ? activeColor : 'bg-slate-300 dark:bg-gray-600')}
      >
        <span className={'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ' + (checked ? 'translate-x-5' : '')} />
      </button>
    </label>
  )
}
