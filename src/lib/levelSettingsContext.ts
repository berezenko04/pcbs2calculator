'use client'

import { createContext, useContext } from 'react'
import type { LevelSettings } from '@/lib/types'

const LevelSettingsContext = createContext<LevelSettings | null>(null)

export const LevelSettingsProvider = LevelSettingsContext.Provider
export const useLevelSettings = () => useContext(LevelSettingsContext)
