import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { en, type TranslationKey } from './en'
import { ml } from './ml'

export type Lang = 'en' | 'ml'

const STORAGE_KEY_LANG = 'sahayam_preferred_lang'

const dictionaries: Record<Lang, typeof en> = {
  en,
  ml,
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: TranslationKey) => en[key] || key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_LANG) as Lang
      if (saved === 'en' || saved === 'ml') return saved
    }
    return 'en'
  })

  const setLang = (nextLang: Lang) => {
    setLangState(nextLang)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LANG, nextLang)
    }
  }

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ml' : 'en')
  }

  const t = (key: TranslationKey): string => {
    const dict = dictionaries[lang] || en
    return dict[key] || en[key] || key
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useT() {
  const { t } = useI18n()
  return t
}
