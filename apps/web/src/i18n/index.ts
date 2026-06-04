import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zh } from './locales/zh';

export const defaultNS = 'translation';

void i18n.use(initReactI18next).init({
  resources: { zh },
  lng: 'zh',
  fallbackLng: 'zh',
  defaultNS,
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
