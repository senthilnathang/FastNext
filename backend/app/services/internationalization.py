"""
Internationalization (i18n) Service for FastNext Framework
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from dataclasses import dataclass
import json
import os
import logging
from pathlib import Path

from babel import Locale, dates, numbers, plural
from babel.support import Translations
import pytz

logger = logging.getLogger(__name__)


@dataclass
class LocalizedString:
    """Represents a localized string with metadata"""
    key: str
    value: str
    locale: str
    context: Optional[str] = None
    plural_form: Optional[str] = None
    last_updated: Optional[datetime] = None


@dataclass
class LocaleInfo:
    """Information about a locale"""
    code: str
    name: str
    native_name: str
    direction: str  # 'ltr' or 'rtl'
    date_format: str
    time_format: str
    number_format: str
    currency_format: str
    plural_rules: Dict[str, Any]


class Internationalization:
    """
    Internationalization Service
    """

    # Supported locales
    SUPPORTED_LOCALES = [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
        'ar', 'hi', 'bn', 'ur', 'fa', 'tr', 'pl', 'nl', 'sv', 'da',
        'no', 'fi', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'et',
        'lv', 'lt', 'el', 'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw'
    ]

    # In-memory storage for translations (in production, use database/cache)
    _translations: Dict[str, Dict[str, LocalizedString]] = {}
    _locale_info: Dict[str, LocaleInfo] = {}

    @staticmethod
    def initialize_locales():
        """
        Initialize locale information for all supported locales
        """
        for locale_code in Internationalization.SUPPORTED_LOCALES:
            try:
                locale = Locale.parse(locale_code)
                info = LocaleInfo(
                    code=locale_code,
                    name=locale.display_name,
                    native_name=locale.display_name,
                    direction='rtl' if locale_code in ['ar', 'fa', 'ur', 'he'] else 'ltr',
                    date_format=locale.date_formats['short'].pattern,
                    time_format=locale.time_formats['short'].pattern,
                    number_format=locale.number_symbols.get('decimal', '.'),
                    currency_format=locale.currency_formats['standard'].pattern,
                    plural_rules=Internationalization._get_plural_rules(locale)
                )
                Internationalization._locale_info[locale_code] = info
            except Exception as e:
                logger.error(f"Error initializing locale {locale_code}: {e}")

    @staticmethod
    def _get_plural_rules(locale: Locale) -> Dict[str, Any]:
        """Get plural rules for a locale"""
        try:
            plural_rules = {}
            # Get plural forms for different numbers
            for n in [0, 1, 2, 3, 5, 10, 21, 100]:
                category = plural.get_plural(locale, n)
                if category not in plural_rules:
                    plural_rules[category] = []
                plural_rules[category].append(n)
            return plural_rules
        except:
            return {"other": [0, 1, 2, 3, 4, 5]}  # Default fallback

    @staticmethod
    def load_translations(locale: str, translations_dict: Dict[str, Any]):
        """
        Load translations for a specific locale
        """
        if locale not in Internationalization._translations:
            Internationalization._translations[locale] = {}

        for key, value in translations_dict.items():
            localized_string = LocalizedString(
                key=key,
                value=value if isinstance(value, str) else str(value),
                locale=locale,
                last_updated=datetime.utcnow()
            )
            Internationalization._translations[locale][key] = localized_string

    @staticmethod
    def translate(
        key: str,
        locale: str = 'en',
        fallback_locale: str = 'en',
        **kwargs
    ) -> str:
        """
        Translate a key to the specified locale
        """
        # Try primary locale
        if locale in Internationalization._translations:
            translation = Internationalization._translations[locale].get(key)
            if translation:
                return Internationalization._interpolate(translation.value, kwargs)

        # Try fallback locale
        if fallback_locale != locale and fallback_locale in Internationalization._translations:
            translation = Internationalization._translations[fallback_locale].get(key)
            if translation:
                return Internationalization._interpolate(translation.value, kwargs)

        # Return key if no translation found
        return key

    @staticmethod
    def _interpolate(text: str, variables: Dict[str, Any]) -> str:
        """Interpolate variables into translated text"""
        try:
            return text.format(**variables)
        except (KeyError, ValueError):
            # Return original text if interpolation fails
            return text

    @staticmethod
    def format_date(
        date: datetime,
        locale: str = 'en',
        format_type: str = 'short'
    ) -> str:
        """
        Format a date according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            if format_type == 'long':
                pattern = babel_locale.date_formats['long'].pattern
            elif format_type == 'medium':
                pattern = babel_locale.date_formats['medium'].pattern
            else:
                pattern = babel_locale.date_formats['short'].pattern

            return dates.format_date(date, pattern, locale=babel_locale)
        except:
            return date.strftime('%Y-%m-%d')

    @staticmethod
    def format_time(
        time: datetime,
        locale: str = 'en',
        format_type: str = 'short'
    ) -> str:
        """
        Format a time according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            if format_type == 'long':
                pattern = babel_locale.time_formats['long'].pattern
            elif format_type == 'medium':
                pattern = babel_locale.time_formats['medium'].pattern
            else:
                pattern = babel_locale.time_formats['short'].pattern

            return dates.format_time(time, pattern, locale=babel_locale)
        except:
            return time.strftime('%H:%M:%S')

    @staticmethod
    def format_datetime(
        dt: datetime,
        locale: str = 'en',
        format_type: str = 'short'
    ) -> str:
        """
        Format a datetime according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            if format_type == 'long':
                pattern = babel_locale.datetime_formats['long'].pattern
            elif format_type == 'medium':
                pattern = babel_locale.datetime_formats['medium'].pattern
            else:
                pattern = babel_locale.datetime_formats['short'].pattern

            return dates.format_datetime(dt, pattern, locale=babel_locale)
        except:
            return dt.strftime('%Y-%m-%d %H:%M:%S')

    @staticmethod
    def format_number(
        number: Union[int, float],
        locale: str = 'en',
        decimal_places: Optional[int] = None
    ) -> str:
        """
        Format a number according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            return numbers.format_number(number, locale=babel_locale)
        except:
            return str(number)

    @staticmethod
    def format_currency(
        amount: Union[int, float],
        currency: str,
        locale: str = 'en'
    ) -> str:
        """
        Format currency according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            return numbers.format_currency(amount, currency, locale=babel_locale)
        except:
            return f"{currency} {amount}"

    @staticmethod
    def format_plural(
        key: str,
        count: int,
        locale: str = 'en',
        **kwargs
    ) -> str:
        """
        Format plural forms according to locale
        """
        try:
            babel_locale = Locale.parse(locale)
            category = plural.get_plural(babel_locale, count)

            # Look for plural-specific keys
            plural_key = f"{key}_{category}"
            translation = Internationalization.translate(plural_key, locale)

            if translation != plural_key:  # Found plural-specific translation
                return Internationalization._interpolate(translation, {'count': count, **kwargs})

            # Fall back to singular/plural distinction
            if count == 1:
                singular_key = f"{key}_one"
                translation = Internationalization.translate(singular_key, locale)
                if translation != singular_key:
                    return Internationalization._interpolate(translation, {'count': count, **kwargs})

            # Use base key
            translation = Internationalization.translate(key, locale)
            return Internationalization._interpolate(translation, {'count': count, **kwargs})

        except:
            return Internationalization._interpolate(key, {'count': count, **kwargs})

    @staticmethod
    def get_locale_info(locale: str) -> Optional[LocaleInfo]:
        """
        Get information about a locale
        """
        return Internationalization._locale_info.get(locale)

    @staticmethod
    def get_supported_locales() -> List[str]:
        """
        Get list of supported locales
        """
        return Internationalization.SUPPORTED_LOCALES.copy()

    @staticmethod
    def detect_locale_from_request(accept_language: str) -> str:
        """
        Detect locale from Accept-Language header
        """
        if not accept_language:
            return 'en'

        # Parse Accept-Language header
        locales = []
        for lang in accept_language.split(','):
            lang = lang.strip().split(';')[0]  # Remove quality values
            if lang in Internationalization.SUPPORTED_LOCALES:
                return lang
            # Try language prefix (e.g., 'en-US' -> 'en')
            lang_prefix = lang.split('-')[0]
            if lang_prefix in Internationalization.SUPPORTED_LOCALES:
                locales.append(lang_prefix)

        return locales[0] if locales else 'en'

    @staticmethod
    def get_timezone_aware_datetime(dt: datetime, timezone: str = 'UTC') -> datetime:
        """
        Convert datetime to timezone-aware
        """
        if dt.tzinfo is None:
            tz = pytz.timezone(timezone)
            return tz.localize(dt)
        return dt

    @staticmethod
    def format_relative_time(
        dt: datetime,
        locale: str = 'en',
        now: Optional[datetime] = None
    ) -> str:
        """
        Format relative time (e.g., "2 hours ago")
        """
        if now is None:
            now = datetime.utcnow()

        try:
            babel_locale = Locale.parse(locale)
            return dates.format_timedelta(dt - now, locale=babel_locale)
        except:
            # Simple fallback
            delta = now - dt
            if delta.days > 0:
                return f"{delta.days} days ago"
            elif delta.seconds > 3600:
                return f"{delta.seconds // 3600} hours ago"
            elif delta.seconds > 60:
                return f"{delta.seconds // 60} minutes ago"
            else:
                return "just now"

    # Default translations for common UI elements
    @staticmethod
    def load_default_translations():
        """
        Load default translations for common UI elements
        """
        default_translations = {
            'en': {
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
                'pagination.showing': 'Showing {start} to {end} of {total} entries'
            },
            'es': {
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
                'pagination.showing': 'Mostrando {start} a {end} de {total} entradas'
            },
            'fr': {
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
                'pagination.showing': 'Affichage de {start} à {end} sur {total} entrées'
            },
            'de': {
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
                'pagination.showing': 'Zeige {start} bis {end} von {total} Einträgen'
            }
        }

        for locale, translations in default_translations.items():
            Internationalization.load_translations(locale, translations)