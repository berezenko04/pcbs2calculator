'use client'

import { useLang } from '@/lib/i18n/context'
import { Wrench } from 'lucide-react'

export default function BuildMaker() {
  const { t } = useLang()

  return (
    <div className="text-center py-16">
      <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full inline-flex mb-4">
        <Wrench className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100 mb-2">{t('build_maker')}</h2>
      <p className="text-slate-500 dark:text-gray-400 max-w-md mx-auto">{t('build_maker_soon')}</p>
    </div>
  )
}
