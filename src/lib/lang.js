/* Rally — current UI language, readable outside React.
   api.js and auth.js aren't components and can't call useLang(), but they
   need to know the selected language to send it as Accept-Language on every
   request. LangContext keeps this in sync on every setLang call. */
let currentLang = 'ru';

export function getLang() {
  return currentLang;
}

export function setCurrentLang(lang) {
  currentLang = lang;
}
