import {useTranslation} from 'react-i18next';

/**
 * Custom hook for accessing translations
 * Usage: const { t } = useT();
 */
export const useT = () => {
  return useTranslation();
};

/**
 * Get translation value directly
 * Usage: const loginTitle = getT('login.title');
 */
let i18nInstance: any = null;

export const setI18nInstance = (instance: any) => {
  i18nInstance = instance;
};

export const getT = (key: string) => {
  if (!i18nInstance) {
    console.warn('i18n instance not initialized');
    return key;
  }
  return i18nInstance.t(key);
};
