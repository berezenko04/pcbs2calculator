'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { LANGUAGES, type Lang, useT, type TFunction } from './translations'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunction
}

const LangContext = createContext<LangContextValue | null>(null)

const VALID_LANGS = LANGUAGES.map((l) => l.code)

function applyDir(l: Lang) {
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = l
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('pcbs2_lang') as Lang | null
    if (stored && VALID_LANGS.includes(stored)) {
      setLangState(stored)
    }
  }, [])

  useEffect(() => {
    applyDir(lang)
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('pcbs2_lang', l)
    document.documentElement.lang = l
  }, [])

  const t = useT(lang)

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
