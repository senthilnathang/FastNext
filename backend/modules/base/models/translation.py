"""
Translation System Models

Provides i18n support with translatable fields and language management.
Similar to Odoo's ir.translation.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class TranslationType(str, Enum):
    """Types of translations."""
    MODEL = "model"  # Model field translation
    CODE = "code"  # Code string translation
    SELECTION = "selection"  # Selection field options
    CONSTRAINT = "constraint"  # Constraint messages
    VIEW = "view"  # UI view labels
    REPORT = "report"  # Report content


class TranslationState(str, Enum):
    """Translation states."""
    TO_TRANSLATE = "to_translate"
    TRANSLATED = "translated"
    VALIDATED = "validated"


class Language(Base, TimestampMixin):
    """
    Installed languages.

    Tracks available languages for translation.
    One language should be marked as default.

    Example:
        Language(code="en_US", name="English (US)", is_default=True)
        Language(code="fr_FR", name="French", direction="ltr")
    """

    __tablename__ = "languages"
    __table_args__ = (
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Language identification
    code = Column(
        String(10),
        unique=True,
        nullable=False,
        index=True,
        comment="Locale code: en_US, fr_FR, ar_SA"
    )
    name = Column(
        String(100),
        nullable=False,
        comment="Display name: English (US)"
    )
    iso_code = Column(
        String(5),
        nullable=True,
        comment="ISO 639-1 code: en, fr, ar"
    )

    # Display settings
    direction = Column(
        String(3),
        default="ltr",
        comment="Text direction: ltr or rtl"
    )
    date_format = Column(
        String(50),
        nullable=True,
        comment="Date format pattern: %m/%d/%Y"
    )
    time_format = Column(
        String(50),
        nullable=True,
        comment="Time format pattern: %H:%M:%S"
    )
    decimal_separator = Column(
        String(1),
        default=".",
        comment="Decimal separator: . or ,"
    )
    thousands_separator = Column(
        String(1),
        default=",",
        comment="Thousands separator: , or space"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this language is available for selection"
    )
    is_default = Column(
        Boolean,
        default=False,
        comment="Default language (only one should be true)"
    )

    # Translation completeness
    translation_count = Column(
        Integer,
        default=0,
        comment="Number of translations in this language"
    )

    def __repr__(self) -> str:
        return f"<Language({self.code}: {self.name})>"

    @classmethod
    def get_default(cls, db: Session) -> Optional["Language"]:
        """Get the default language."""
        return db.query(cls).filter(
            cls.is_default == True,
            cls.is_active == True
        ).first()

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["Language"]:
        """Get language by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()

    @classmethod
    def get_active(cls, db: Session) -> List["Language"]:
        """Get all active languages."""
        return db.query(cls).filter(cls.is_active == True).order_by(cls.name).all()


class IrTranslation(Base, TimestampMixin):
    """
    Translation storage.

    Stores translations for various types of content:
    - Model field values (per-record translations)
    - Code strings (static text in code)
    - Selection field options
    - UI labels and messages

    Example:
        # Model field translation
        IrTranslation(
            lang="fr_FR",
            type="model",
            name="product.product,name",
            res_id=123,
            source="Widget",
            value="Gadget"
        )

        # Code string translation
        IrTranslation(
            lang="es_ES",
            type="code",
            name="base.welcome_message",
            source="Welcome!",
            value="Bienvenido!"
        )
    """

    __tablename__ = "ir_translations"
    __table_args__ = (
        Index("ix_ir_translations_lookup", "lang", "type", "name", "res_id"),
        Index("ix_ir_translations_source", "source"),
        UniqueConstraint(
            "lang", "type", "name", "res_id",
            name="uq_ir_translations_entry"
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Translation context
    lang = Column(
        String(10),
        nullable=False,
        index=True,
        comment="Language code: en_US, fr_FR"
    )
    type = Column(
        String(30),
        nullable=False,
        index=True,
        comment="Translation type: model, code, selection, view"
    )
    name = Column(
        String(200),
        nullable=False,
        index=True,
        comment="Key: model.field or translation key"
    )
    res_id = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Record ID for model translations (NULL for code strings)"
    )

    # Translation values
    source = Column(
        Text,
        nullable=False,
        comment="Original text (usually in default language)"
    )
    value = Column(
        Text,
        nullable=True,
        comment="Translated text (NULL if not yet translated)"
    )

    # Module ownership
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that owns this translation"
    )

    # State tracking
    state = Column(
        String(20),
        default=TranslationState.TO_TRANSLATE.value,
        comment="Translation state: to_translate, translated, validated"
    )

    # Metadata
    comments = Column(
        Text,
        nullable=True,
        comment="Translator comments or context"
    )

    def __repr__(self) -> str:
        return f"<IrTranslation({self.lang}/{self.type}/{self.name}: '{self.value[:30] if self.value else ''}...')>"

    @property
    def is_translated(self) -> bool:
        """Check if translation is complete."""
        return self.value is not None and len(self.value.strip()) > 0

    # Class methods for translation operations
    @classmethod
    def translate(
        cls,
        db: Session,
        text: str,
        lang: str,
        type: str = "code",
        name: str = None,
        res_id: int = None
    ) -> str:
        """
        Get translation for a text.

        Args:
            db: Database session
            text: Source text to translate
            lang: Target language code
            type: Translation type
            name: Translation key (optional, uses text hash if not provided)
            res_id: Record ID for model translations

        Returns:
            Translated text or original if not found
        """
        if name is None:
            name = f"_auto_{hash(text)}"

        query = db.query(cls).filter(
            cls.lang == lang,
            cls.type == type,
            cls.name == name
        )

        if res_id is not None:
            query = query.filter(cls.res_id == res_id)
        else:
            query = query.filter(cls.res_id.is_(None))

        translation = query.first()

        if translation and translation.value:
            return translation.value
        return text

    @classmethod
    def set_translation(
        cls,
        db: Session,
        source: str,
        value: str,
        lang: str,
        type: str = "code",
        name: str = None,
        res_id: int = None,
        module_name: str = None,
        state: str = None
    ) -> "IrTranslation":
        """
        Set or update a translation.

        Args:
            db: Database session
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
        if name is None:
            name = f"_auto_{hash(source)}"

        query = db.query(cls).filter(
            cls.lang == lang,
            cls.type == type,
            cls.name == name
        )

        if res_id is not None:
            query = query.filter(cls.res_id == res_id)
        else:
            query = query.filter(cls.res_id.is_(None))

        translation = query.first()

        if translation:
            translation.source = source
            translation.value = value
            if state:
                translation.state = state
            elif value:
                translation.state = TranslationState.TRANSLATED.value
        else:
            translation = cls(
                lang=lang,
                type=type,
                name=name,
                res_id=res_id,
                source=source,
                value=value,
                module_name=module_name,
                state=state or (TranslationState.TRANSLATED.value if value else TranslationState.TO_TRANSLATE.value)
            )
            db.add(translation)

        db.flush()
        return translation

    @classmethod
    def get_model_translations(
        cls,
        db: Session,
        model_name: str,
        res_id: int,
        lang: str
    ) -> Dict[str, str]:
        """
        Get all translations for a model record.

        Args:
            db: Database session
            model_name: Model name (e.g., "product.product")
            res_id: Record ID
            lang: Target language

        Returns:
            Dictionary of field_name -> translated_value
        """
        translations = db.query(cls).filter(
            cls.lang == lang,
            cls.type == TranslationType.MODEL.value,
            cls.name.like(f"{model_name},%"),
            cls.res_id == res_id
        ).all()

        result = {}
        for t in translations:
            # name format: "model.name,field_name"
            parts = t.name.split(",")
            if len(parts) == 2:
                field_name = parts[1]
                result[field_name] = t.value or t.source

        return result

    @classmethod
    def get_module_translations(
        cls,
        db: Session,
        module_name: str,
        lang: str
    ) -> List["IrTranslation"]:
        """
        Get all translations for a module.

        Args:
            db: Database session
            module_name: Module name
            lang: Target language

        Returns:
            List of translations
        """
        return db.query(cls).filter(
            cls.module_name == module_name,
            cls.lang == lang
        ).order_by(cls.name).all()

    @classmethod
    def get_untranslated(
        cls,
        db: Session,
        lang: str,
        module_name: str = None,
        limit: int = 100
    ) -> List["IrTranslation"]:
        """
        Get untranslated entries.

        Args:
            db: Database session
            lang: Target language
            module_name: Optional module filter
            limit: Maximum entries to return

        Returns:
            List of untranslated entries
        """
        query = db.query(cls).filter(
            cls.lang == lang,
            cls.state == TranslationState.TO_TRANSLATE.value
        )

        if module_name:
            query = query.filter(cls.module_name == module_name)

        return query.limit(limit).all()

    @classmethod
    def delete_module_translations(cls, db: Session, module_name: str) -> int:
        """
        Delete all translations for a module.

        Args:
            db: Database session
            module_name: Module name

        Returns:
            Number of deleted translations
        """
        return db.query(cls).filter(cls.module_name == module_name).delete()


def translatable(field_name: str):
    """
    Decorator to mark a model field as translatable.

    Usage:
        class Product(Base):
            @translatable("name")
            name = Column(String(200))

    Note: This is a marker decorator. The actual translation
    is handled by the TranslationService.
    """
    def decorator(func):
        func._translatable = True
        func._field_name = field_name
        return func
    return decorator
