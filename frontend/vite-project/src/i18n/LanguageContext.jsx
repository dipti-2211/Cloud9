/**
 * LanguageContext.jsx
 *
 * React context that stores the active language (EN | HI) in localStorage
 * and exposes a t() translation function to any component in the tree.
 *
 * Usage:
 *   import { useLang } from '../i18n/LanguageContext';
 *   const { lang, setLang, t } = useLang();
 *   toast.success(t('incident_reported'));
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { strings } from './strings';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('sih_lang') || 'en'
  );

  const setLang = useCallback((l) => {
    const next = (l === 'hi' || l === 'bn') ? l : 'en';
    localStorage.setItem('sih_lang', next);
    setLangState(next);
  }, []);

  /**
   * t(key) — look up key in the current language, fall back to English,
   * then to the key itself if missing from both.
   */
  const t = useCallback(
    (key) => strings[lang]?.[key] ?? strings.en?.[key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
};
