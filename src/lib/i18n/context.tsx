'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type Lang, useT, type TFunction } from './translations'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunction
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('pcbs2_lang') as Lang | null
    if (stored && ['en', 'ru', 'uk', 'ko', 'zh', 'de', 'es', 'it'].includes(stored)) {
      setLangState(stored)
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('pcbs2_lang', l)
    document.documentElement.lang = l
  }, [])

  const t = useT(lang)

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
