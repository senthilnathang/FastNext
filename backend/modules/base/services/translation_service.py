"""
Translation Service

Provides i18n functionality including:
- Translation management (get/set translations)
- Language file import/export (JSON, PO formats)
- Model field translation
- Code string translation
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.translation import (
    Language,
    IrTranslation,
    TranslationType,
    TranslationState,
)


class TranslationService:
    """
    Service for managing translations.

    Example:
        service = TranslationService(db)

        # Get translation
        translated = service.translate("Hello", "fr_FR")

        # Set translation
        service.set_translation("Hello", "Bonjour", "fr_FR")

        # Load translations from file
        service.load_language_file("/path/to/fr_FR.json", "fr_FR", "my_module")
    """

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Language Management
    # -------------------------------------------------------------------------

    def get_languages(self, active_only: bool = True) -> List[Language]:
        """Get all languages."""
        query = self.db.query(Language)
        if active_only:
            query = query.filter(Language.is_active == True)
        return query.order_by(Language.name).all()

    def get_language(self, code: str) -> Optional[Language]:
        """Get language by code."""
        return Language.get_by_code(self.db, code)

    def get_default_language(self) -> Optional[Language]:
        """Get the default language."""
        return Language.get_default(self.db)

    def create_language(
        self,
        code: str,
        name: str,
        iso_code: Optional[str] = None,
        direction: str = "ltr",
        date_format: Optional[str] = None,
        time_format: Optional[str] = None,
        decimal_separator: str = ".",
        thousands_separator: str = ",",
        is_default: bool = False,
    ) -> Language:
        """
        Create a new language.

        Args:
            code: Locale code (e.g., "en_US", "fr_FR")
            name: Display name (e.g., "English (US)")
            iso_code: ISO 639-1 code (e.g., "en", "fr")
            direction: Text direction ("ltr" or "rtl")
            date_format: Date format pattern
            time_format: Time format pattern
            decimal_separator: Decimal separator character
            thousands_separator: Thousands separator character
            is_default: Set as default language

        Returns:
            Created Language
        """
        # If setting as default, unset other defaults
        if is_default:
            self.db.query(Language).filter(
                Language.is_default == True
            ).update({"is_default": False})

        language = Language(
            code=code,
            name=name,
            iso_code=iso_code or code[:2],
            direction=direction,
            date_format=date_format,
            time_format=time_format,
            decimal_separator=decimal_separator,
            thousands_separator=thousands_separator,
            is_default=is_default,
            is_active=True,
        )
        self.db.add(language)
        self.db.flush()
        return language

    def update_language(
        self,
        code: str,
        **kwargs
    ) -> Optional[Language]:
        """
        Update a language.

        Args:
            code: Language code
            **kwargs: Fields to update

        Returns:
            Updated Language or None if not found
        """
        language = self.get_language(code)
        if not language:
            return None

        # Handle is_default specially
        if kwargs.get("is_default"):
            self.db.query(Language).filter(
                Language.is_default == True,
                Language.code != code
            ).update({"is_default": False})

        for key, value in kwargs.items():
            if hasattr(language, key):
                setattr(language, key, value)

        self.db.flush()
        return language

    def delete_language(self, code: str) -> bool:
        """
        Delete a language and its translations.

        Args:
            code: Language code

        Returns:
            True if deleted, False if not found
        """
        language = self.get_language(code)
        if not language:
            return False

        if language.is_default:
            raise ValueError("Cannot delete default language")

        # Delete all translations for this language
        self.db.query(IrTranslation).filter(
            IrTranslation.lang == code
        ).delete()

        self.db.delete(language)
        self.db.flush()
        return True

    # -------------------------------------------------------------------------
    # Translation Operations
    # -------------------------------------------------------------------------

    def translate(
        self,
        text: str,
        lang: str,
        type: str = TranslationType.CODE.value,
        name: Optional[str] = None,
        res_id: Optional[int] = None,
    ) -> str:
        """
        Get translation for a text.

        Args:
            text: Source text to translate
            lang: Target language code
            type: Translation type (code, model, selection, etc.)
            name: Translation key (optional)
            res_id: Record ID for model translations

        Returns:
            Translated text or original if not found
        """
        return IrTranslation.translate(
            self.db, text, lang, type, name, res_id
        )

    def set_translation(
        self,
        source: str,
        value: str,
        lang: str,
        type: str = TranslationType.CODE.value,
        name: Optional[str] = None,
        res_id: Optional[int] = None,
        module_name: Optional[str] = None,
        state: Optional[str] = None,
    ) -> IrTranslation:
        """
        Set or update a translation.

        Args:
            source: Original text
            value: Translated text
            lang: Target language
            type: Translation type
            name: Translation key
            res_id: Record ID
            module_name: Module name
            state: Translation state

        Returns:
            Created or updated IrTranslation
        """
        translation = IrTranslation.set_translation(
            self.db, source, value, lang, type, name, res_id, module_name, state
        )
        self._update_language_count(lang)
        return translation

    def get_translation(
        self,
        name: str,
        lang: str,
        type: str = TranslationType.CODE.value,
        res_id: Optional[int] = None,
    ) -> Optional[IrTranslation]:
        """
        Get a translation record by key.

        Args:
            name: Translation key
            lang: Language code
            type: Translation type
            res_id: Record ID

        Returns:
            IrTranslation or None
        """
        query = self.db.query(IrTranslation).filter(
            IrTranslation.lang == lang,
            IrTranslation.type == type,
            IrTranslation.name == name,
        )

        if res_id is not None:
            query = query.filter(IrTranslation.res_id == res_id)
        else:
            query = query.filter(IrTranslation.res_id.is_(None))

        return query.first()

    def delete_translation(
        self,
        name: str,
        lang: str,
        type: str = TranslationType.CODE.value,
        res_id: Optional[int] = None,
    ) -> bool:
        """
        Delete a translation.

        Args:
            name: Translation key
            lang: Language code
            type: Translation type
            res_id: Record ID

        Returns:
            True if deleted
        """
        translation = self.get_translation(name, lang, type, res_id)
        if translation:
            self.db.delete(translation)
            self.db.flush()
            self._update_language_count(lang)
            return True
        return False

    # -------------------------------------------------------------------------
    # Model Field Translations
    # -------------------------------------------------------------------------

    def get_model_translations(
        self,
        model_name: str,
        res_id: int,
        lang: str,
    ) -> Dict[str, str]:
        """
        Get all translations for a model record.

        Args:
            model_name: Model name (e.g., "product.product")
            res_id: Record ID
            lang: Target language

        Returns:
            Dictionary of field_name -> translated_value
        """
        return IrTranslation.get_model_translations(
            self.db, model_name, res_id, lang
        )

    def set_model_translation(
        self,
        model_name: str,
        field_name: str,
        res_id: int,
        source: str,
        value: str,
        lang: str,
        module_name: Optional[str] = None,
    ) -> IrTranslation:
        """
        Set translation for a model field.

        Args:
            model_name: Model name
            field_name: Field name
            res_id: Record ID
            source: Original value
            value: Translated value
            lang: Target language
            module_name: Module name

        Returns:
            Created or updated translation
        """
        name = f"{model_name},{field_name}"
        return self.set_translation(
            source=source,
            value=value,
            lang=lang,
            type=TranslationType.MODEL.value,
            name=name,
            res_id=res_id,
            module_name=module_name,
        )

    def delete_record_translations(
        self,
        model_name: str,
        res_id: int,
    ) -> int:
        """
        Delete all translations for a record.

        Args:
            model_name: Model name
            res_id: Record ID

        Returns:
            Number of deleted translations
        """
        result = self.db.query(IrTranslation).filter(
            IrTranslation.type == TranslationType.MODEL.value,
            IrTranslation.name.like(f"{model_name},%"),
            IrTranslation.res_id == res_id,
        ).delete(synchronize_session=False)
        self.db.flush()
        return result

    # -------------------------------------------------------------------------
    # Module Translations
    # -------------------------------------------------------------------------

    def get_module_translations(
        self,
        module_name: str,
        lang: str,
    ) -> List[IrTranslation]:
        """
        Get all translations for a module.

        Args:
            module_name: Module name
            lang: Target language

        Returns:
            List of translations
        """
        return IrTranslation.get_module_translations(
            self.db, module_name, lang
        )

    def delete_module_translations(
        self,
        module_name: str,
        lang: Optional[str] = None,
    ) -> int:
        """
        Delete all translations for a module.

        Args:
            module_name: Module name
            lang: Optional language filter

        Returns:
            Number of deleted translations
        """
        query = self.db.query(IrTranslation).filter(
            IrTranslation.module_name == module_name
        )
        if lang:
            query = query.filter(IrTranslation.lang == lang)

        result = query.delete(synchronize_session=False)
        self.db.flush()

        # Update language counts
        if lang:
            self._update_language_count(lang)
        else:
            for language in self.get_languages():
                self._update_language_count(language.code)

        return result

    # -------------------------------------------------------------------------
    # Untranslated Entries
    # -------------------------------------------------------------------------

    def get_untranslated(
        self,
        lang: str,
        module_name: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 100,
    ) -> List[IrTranslation]:
        """
        Get untranslated entries.

        Args:
            lang: Target language
            module_name: Optional module filter
            type: Optional type filter
            limit: Maximum entries to return

        Returns:
            List of untranslated entries
        """
        query = self.db.query(IrTranslation).filter(
            IrTranslation.lang == lang,
            IrTranslation.state == TranslationState.TO_TRANSLATE.value,
        )

        if module_name:
            query = query.filter(IrTranslation.module_name == module_name)
        if type:
            query = query.filter(IrTranslation.type == type)

        return query.limit(limit).all()

    def validate_translation(
        self,
        translation_id: int,
    ) -> Optional[IrTranslation]:
        """
        Mark a translation as validated.

        Args:
            translation_id: Translation ID

        Returns:
            Updated translation or None
        """
        translation = self.db.query(IrTranslation).filter(
            IrTranslation.id == translation_id
        ).first()

        if translation and translation.value:
            translation.state = TranslationState.VALIDATED.value
            self.db.flush()
            return translation
        return None

    # -------------------------------------------------------------------------
    # Import/Export
    # -------------------------------------------------------------------------

    def load_language_file(
        self,
        file_path: str,
        lang: str,
        module_name: str,
        type: str = TranslationType.CODE.value,
    ) -> Tuple[int, int]:
        """
        Load translations from a JSON or PO file.

        Supported formats:
        - JSON: {"source": "translation", ...}
        - PO: Standard gettext PO format

        Args:
            file_path: Path to translation file
            lang: Target language
            module_name: Module name
            type: Translation type

        Returns:
            Tuple of (created_count, updated_count)
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Translation file not found: {file_path}")

        suffix = path.suffix.lower()
        if suffix == ".json":
            return self._load_json_file(path, lang, module_name, type)
        elif suffix == ".po":
            return self._load_po_file(path, lang, module_name, type)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

    def _load_json_file(
        self,
        path: Path,
        lang: str,
        module_name: str,
        type: str,
    ) -> Tuple[int, int]:
        """Load translations from JSON file."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        created = 0
        updated = 0

        for source, value in data.items():
            if isinstance(value, str):
                name = f"{module_name}.{source}"
                existing = self.get_translation(name, lang, type)
                self.set_translation(
                    source=source,
                    value=value,
                    lang=lang,
                    type=type,
                    name=name,
                    module_name=module_name,
                )
                if existing:
                    updated += 1
                else:
                    created += 1

        self._update_language_count(lang)
        return created, updated

    def _load_po_file(
        self,
        path: Path,
        lang: str,
        module_name: str,
        type: str,
    ) -> Tuple[int, int]:
        """Load translations from PO file."""
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        created = 0
        updated = 0

        # Parse PO format
        # Pattern matches: msgid "..." msgstr "..."
        pattern = r'msgid\s+"(.+?)"\s*\nmsgstr\s+"(.+?)"'
        matches = re.findall(pattern, content, re.MULTILINE)

        for source, value in matches:
            if source and value:  # Skip empty translations
                # Unescape PO strings
                source = source.replace('\\"', '"').replace("\\n", "\n")
                value = value.replace('\\"', '"').replace("\\n", "\n")

                name = f"{module_name}.{source}"
                existing = self.get_translation(name, lang, type)
                self.set_translation(
                    source=source,
                    value=value,
                    lang=lang,
                    type=type,
                    name=name,
                    module_name=module_name,
                )
                if existing:
                    updated += 1
                else:
                    created += 1

        self._update_language_count(lang)
        return created, updated

    def export_translations(
        self,
        module_name: str,
        lang: str,
        format: str = "json",
        include_untranslated: bool = False,
    ) -> str:
        """
        Export translations to a string.

        Args:
            module_name: Module name
            lang: Target language
            format: Export format ("json" or "po")
            include_untranslated: Include untranslated entries

        Returns:
            Exported content as string
        """
        translations = self.get_module_translations(module_name, lang)

        if not include_untranslated:
            translations = [t for t in translations if t.is_translated]

        if format == "json":
            return self._export_json(translations)
        elif format == "po":
            return self._export_po(translations, lang, module_name)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_json(self, translations: List[IrTranslation]) -> str:
        """Export translations to JSON format."""
        data = {}
        for t in translations:
            data[t.source] = t.value or ""
        return json.dumps(data, ensure_ascii=False, indent=2)

    def _export_po(
        self,
        translations: List[IrTranslation],
        lang: str,
        module_name: str,
    ) -> str:
        """Export translations to PO format."""
        lines = [
            '# Translation file for {}'.format(module_name),
            '# Language: {}'.format(lang),
            '# Generated: {}'.format(datetime.utcnow().isoformat()),
            '',
            'msgid ""',
            'msgstr ""',
            '"Content-Type: text/plain; charset=UTF-8\\n"',
            '"Language: {}\\n"'.format(lang),
            '',
        ]

        for t in translations:
            # Escape PO strings
            source = t.source.replace('"', '\\"').replace("\n", "\\n")
            value = (t.value or "").replace('"', '\\"').replace("\n", "\\n")

            lines.append(f'#: {t.name}')
            lines.append(f'msgid "{source}"')
            lines.append(f'msgstr "{value}"')
            lines.append('')

        return "\n".join(lines)

    # -------------------------------------------------------------------------
    # Bulk Operations
    # -------------------------------------------------------------------------

    def bulk_set_translations(
        self,
        translations: List[Dict[str, Any]],
        lang: str,
        module_name: Optional[str] = None,
    ) -> Tuple[int, int]:
        """
        Set multiple translations at once.

        Args:
            translations: List of translation dicts with keys:
                - source: Original text
                - value: Translated text
                - name: Translation key (optional)
                - type: Translation type (optional)
                - res_id: Record ID (optional)
            lang: Target language
            module_name: Default module name

        Returns:
            Tuple of (created_count, updated_count)
        """
        created = 0
        updated = 0

        for t in translations:
            name = t.get("name")
            type_val = t.get("type", TranslationType.CODE.value)
            res_id = t.get("res_id")

            existing = None
            if name:
                existing = self.get_translation(name, lang, type_val, res_id)

            self.set_translation(
                source=t["source"],
                value=t["value"],
                lang=lang,
                type=type_val,
                name=name,
                res_id=res_id,
                module_name=t.get("module_name", module_name),
            )

            if existing:
                updated += 1
            else:
                created += 1

        self._update_language_count(lang)
        return created, updated

    def search_translations(
        self,
        query: str,
        lang: Optional[str] = None,
        type: Optional[str] = None,
        module_name: Optional[str] = None,
        limit: int = 100,
    ) -> List[IrTranslation]:
        """
        Search translations by source or value.

        Args:
            query: Search query
            lang: Optional language filter
            type: Optional type filter
            module_name: Optional module filter
            limit: Maximum results

        Returns:
            List of matching translations
        """
        search_pattern = f"%{query}%"
        filters = [
            or_(
                IrTranslation.source.ilike(search_pattern),
                IrTranslation.value.ilike(search_pattern),
            )
        ]

        if lang:
            filters.append(IrTranslation.lang == lang)
        if type:
            filters.append(IrTranslation.type == type)
        if module_name:
            filters.append(IrTranslation.module_name == module_name)

        return self.db.query(IrTranslation).filter(
            and_(*filters)
        ).limit(limit).all()

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    def get_translation_stats(
        self,
        lang: str,
        module_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get translation statistics.

        Args:
            lang: Language code
            module_name: Optional module filter

        Returns:
            Dictionary with statistics
        """
        query = self.db.query(IrTranslation).filter(
            IrTranslation.lang == lang
        )
        if module_name:
            query = query.filter(IrTranslation.module_name == module_name)

        total = query.count()
        translated = query.filter(
            IrTranslation.state == TranslationState.TRANSLATED.value
        ).count()
        validated = query.filter(
            IrTranslation.state == TranslationState.VALIDATED.value
        ).count()
        to_translate = query.filter(
            IrTranslation.state == TranslationState.TO_TRANSLATE.value
        ).count()

        return {
            "lang": lang,
            "module_name": module_name,
            "total": total,
            "translated": translated,
            "validated": validated,
            "to_translate": to_translate,
            "completion_rate": round((translated + validated) / total * 100, 2) if total > 0 else 0,
        }

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _update_language_count(self, lang: str) -> None:
        """Update translation count for a language."""
        language = self.get_language(lang)
        if language:
            count = self.db.query(IrTranslation).filter(
                IrTranslation.lang == lang,
                IrTranslation.value.isnot(None),
            ).count()
            language.translation_count = count
            self.db.flush()


# Convenience function for dependency injection
def get_translation_service(db: Session) -> TranslationService:
    """Get translation service instance."""
    return TranslationService(db)
