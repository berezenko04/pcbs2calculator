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

const LOCALE_TO_LANG: Record<string, Lang> = {
  ru: 'ru', uk: 'uk', ko: 'ko', zh: 'zh', ja: 'ja', de: 'de',
  es: 'es', it: 'it', pl: 'pl', tr: 'tr', ar: 'ar', pt: 'pt', fr: 'fr', hi: 'hi',
}

function systemLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const base = (navigator.language || 'en').split('-')[0].toLowerCase()
  return LOCALE_TO_LANG[base] ?? 'en'
}

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
    } else {
      setLangState(systemLang())
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
