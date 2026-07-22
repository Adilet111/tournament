import { createContext, useContext, useState } from 'react';
import { translations } from './i18n';
import { getLang, setCurrentLang } from './lib/lang';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getLang);
  // Every language switch also updates the module-level store in lib/lang.js
  // so api.js / auth.js (plain modules, no React context) can read it when
  // building the Accept-Language header on each request.
  const setLang = (l) => {
    setCurrentLang(l);
    setLangState(l);
  };
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
