/**
 * Internationalization Provider for React applications
 */

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, options?: any, variables?: Record<string, any>) => string;
  formatDate: (date: Date, format?: string) => string;
  formatTime: (time: Date, format?: string) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
  supportedLocales: string[];
  direction: 'ltr' | 'rtl';
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: string;
  supportedLocales?: string[];
}

// Default translations (in production, load from API)
const DEFAULT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.min_length': 'Minimum length is {min} characters',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.showing': 'Showing {start} to {end} of {total} entries',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
  },
  es: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.view': 'Ver',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.warning': 'Advertencia',
    'common.info': 'Información',
    'validation.required': 'Este campo es obligatorio',
    'validation.email': 'Por favor ingrese un correo electrónico válido',
    'validation.min_length': 'La longitud mínima es de {min} caracteres',
    'pagination.previous': 'Anterior',
    'pagination.next': 'Siguiente',
    'pagination.showing': 'Mostrando {start} a {end} de {total} entradas',
    'nav.dashboard': 'Panel de Control',
    'nav.settings': 'Configuración',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar Sesión',
  },
  fr: {
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.view': 'Voir',
    'common.create': 'Créer',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.warning': 'Avertissement',
    'common.info': 'Information',
    'validation.required': 'Ce champ est obligatoire',
    'validation.email': 'Veuillez saisir une adresse e-mail valide',
    'validation.min_length': 'La longueur minimale est de {min} caractères',
    'pagination.previous': 'Précédent',
    'pagination.next': 'Suivant',
    'pagination.showing': 'Affichage de {start} à {end} sur {total} entrées',
    'nav.dashboard': 'Tableau de Bord',
    'nav.settings': 'Paramètres',
    'nav.profile': 'Profil',
    'nav.logout': 'Déconnexion',
  },
  de: {
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.view': 'Ansehen',
    'common.create': 'Erstellen',
    'common.search': 'Suchen',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.warning': 'Warnung',
    'common.info': 'Information',
    'validation.required': 'Dieses Feld ist erforderlich',
    'validation.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    'validation.min_length': 'Mindestlänge beträgt {min} Zeichen',
    'pagination.previous': 'Vorherige',
    'pagination.next': 'Nächste',
    'pagination.showing': 'Zeige {start} bis {end} von {total} Einträgen',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Einstellungen',
    'nav.profile': 'Profil',
    'nav.logout': 'Abmelden',
  },
  ar: {
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.view': 'عرض',
    'common.create': 'إنشاء',
    'common.search': 'بحث',
    'common.loading': 'جارٍ التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.warning': 'تحذير',
    'common.info': 'معلومات',
    'validation.required': 'هذا الحقل مطلوب',
    'validation.email': 'يرجى إدخال عنوان بريد إلكتروني صالح',
    'validation.min_length': 'الحد الأدنى للطول هو {min} أحرف',
    'pagination.previous': 'السابق',
    'pagination.next': 'التالي',
    'pagination.showing': 'عرض {start} إلى {end} من {total} إدخالات',
    'nav.dashboard': 'لوحة التحكم',
    'nav.settings': 'الإعدادات',
    'nav.profile': 'الملف الشخصي',
    'nav.logout': 'تسجيل الخروج',
  },
};

const RTL_LOCALES = ['ar', 'fa', 'ur', 'he'];

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'en',
  supportedLocales = ['en', 'es', 'fr', 'de', 'ar']
}) => {
  const [locale, setLocaleState] = useState<string>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(DEFAULT_TRANSLATIONS);

  // Detect browser locale on mount
  useEffect(() => {
    const browserLocale = navigator.language.split('-')[0];
    if (supportedLocales.includes(browserLocale)) {
      setLocaleState(browserLocale);
    }

    // Load translations from localStorage if available
    const savedLocale = localStorage.getItem('i18n-locale');
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, [supportedLocales]);

  // Load translations for current locale
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // In production, load from API
        // const response = await fetch(`/api/i18n/${locale}`);
        // const data = await response.json();
        // setTranslations(prev => ({ ...prev, [locale]: data }));

        // For now, use default translations
        setTranslations(DEFAULT_TRANSLATIONS);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };

    loadTranslations();
  }, [locale]);

  const setLocale = useCallback((newLocale: string) => {
    if (supportedLocales.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('i18n-locale', newLocale);

      // Update document direction for RTL languages
      document.documentElement.dir = RTL_LOCALES.includes(newLocale) ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    }
  }, [supportedLocales]);

  const t = useCallback(
    (key: string, options: any = {}, variables: Record<string, any> = {}): string => {
      const { count } = options;
      let translation = translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;

      // Handle pluralization
      if (count !== undefined) {
        const pluralKey = `${key}_${count === 1 ? 'one' : 'other'}`;
        const pluralTranslation = translations[locale]?.[pluralKey] || translations[defaultLocale]?.[pluralKey];
        if (pluralTranslation) {
          translation = pluralTranslation;
        }
      }

      // Interpolate variables
      return Object.keys(variables).reduce((str, varKey) => {
        return str.replace(new RegExp(`{${varKey}}`, 'g'), String(variables[varKey]));
      }, translation);
    },
    [locale, defaultLocale, translations]
  );

  const formatDate = useCallback((date: Date, format: string = 'short'): string => {
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: format as any,
      }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }, [locale]);

  const formatTime = useCallback((time: Date, format: string = 'short'): string => {
    try {
      return new Intl.DateTimeFormat(locale, {
        timeStyle: format as any,
      }).format(time);
    } catch {
      return time.toLocaleTimeString();
    }
  }, [locale]);

  const formatNumber = useCallback((number: number): string => {
    try {
      return new Intl.NumberFormat(locale).format(number);
    } catch {
      return number.toString();
    }
  }, [locale]);

  const formatCurrency = useCallback((amount: number, currency: string): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }, [locale]);

  const direction: 'ltr' | 'rtl' = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    supportedLocales,
    direction,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};