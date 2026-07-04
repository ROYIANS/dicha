import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18next.use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
  resources: {
    zh: {
      translation: {
        loading: '正在确认管理员身份',
      },
    },
  },
});
