import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { voiceApi } from '../api/voice';

export interface VoiceLanguage {
  code: string;
  label: string;
  name: string;
}

interface LanguageContextValue {
  languages: VoiceLanguage[];
  language: string;
  setLanguage: (code: string, force?: boolean) => void;
  loading: boolean;
  voiceActive: boolean;
  setVoiceActive: (active: boolean) => void;
  hasStoredLanguage: boolean;
  dismissFirstUse: () => void;
}

const STORAGE_KEY = 'kisanseva_language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const initialLanguage = useRef(stored || 'hi-IN').current;
  const [languages, setLanguages] = useState<VoiceLanguage[]>([]);
  const [language, setLanguageState] = useState(initialLanguage);
  const [loading, setLoading] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [hasStoredLanguage, setHasStoredLanguage] = useState(Boolean(stored));

  useEffect(() => {
    voiceApi.getLanguages()
      .then(({ data }) => {
        setLanguages(data);
        const preferred = data.some((item) => item.code === initialLanguage)
          ? initialLanguage
          : data.find((item) => item.code === 'hi-IN')?.code || data[0]?.code || 'hi-IN';
        setLanguageState(preferred);
      })
      .catch(() => {
        setLanguages([]);
      })
      .finally(() => setLoading(false));
  }, [initialLanguage]);

  const setLanguage = useCallback((code: string, force = false) => {
    if ((!force && voiceActive) || !languages.some((item) => item.code === code)) return;
    setLanguageState(code);
    localStorage.setItem(STORAGE_KEY, code);
    setHasStoredLanguage(true);
  }, [languages, voiceActive]);

  const dismissFirstUse = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, language);
    setHasStoredLanguage(true);
  }, [language]);

  const value = useMemo(() => ({
    languages,
    language,
    setLanguage,
    loading,
    voiceActive,
    setVoiceActive,
    hasStoredLanguage,
    dismissFirstUse,
  }), [languages, language, loading, voiceActive, hasStoredLanguage, setLanguage, dismissFirstUse]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
