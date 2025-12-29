"""
Translation API Routes

Endpoints for managing translations and languages.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.translation import (
    Language,
    IrTranslation,
    TranslationType,
    TranslationState,
)
from ..services.translation_service import TranslationService


router = APIRouter(prefix="/translations", tags=["Translations"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class LanguageResponse(BaseModel):
    """Language response model."""

    id: int
    code: str
    name: str
    iso_code: Optional[str] = None
    direction: str = "ltr"
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    decimal_separator: str = "."
    thousands_separator: str = ","
    is_active: bool = True
    is_default: bool = False
    translation_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_language(cls, lang: Language) -> "LanguageResponse":
        return cls(
            id=lang.id,
            code=lang.code,
            name=lang.name,
            iso_code=lang.iso_code,
            direction=lang.direction,
            date_format=lang.date_format,
            time_format=lang.time_format,
            decimal_separator=lang.decimal_separator,
            thousands_separator=lang.thousands_separator,
            is_active=lang.is_active,
            is_default=lang.is_default,
            translation_count=lang.translation_count or 0,
            created_at=lang.created_at.isoformat() if lang.created_at else None,
            updated_at=lang.updated_at.isoformat() if lang.updated_at else None,
        )


class TranslationResponse(BaseModel):
    """Translation response model."""

    id: int
    lang: str
    type: str
    name: str
    res_id: Optional[int] = None
    source: str
    value: Optional[str] = None
    module_name: Optional[str] = None
    state: str
    comments: Optional[str] = None
    is_translated: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_translation(cls, t: IrTranslation) -> "TranslationResponse":
        return cls(
            id=t.id,
            lang=t.lang,
            type=t.type,
            name=t.name,
            res_id=t.res_id,
            source=t.source,
            value=t.value,
            module_name=t.module_name,
            state=t.state,
            comments=t.comments,
            is_translated=t.is_translated,
            created_at=t.created_at.isoformat() if t.created_at else None,
            updated_at=t.updated_at.isoformat() if t.updated_at else None,
        )


class LanguageCreate(BaseModel):
    """Create language request."""

    code: str = Field(..., min_length=2, max_length=10)
    name: str = Field(..., min_length=1, max_length=100)
    iso_code: Optional[str] = Field(None, max_length=5)
    direction: str = Field("ltr", pattern="^(ltr|rtl)$")
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    decimal_separator: str = "."
    thousands_separator: str = ","
    is_default: bool = False


class LanguageUpdate(BaseModel):
    """Update language request."""

    name: Optional[str] = None
    direction: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    decimal_separator: Optional[str] = None
    thousands_separator: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class TranslationCreate(BaseModel):
    """Create translation request."""

    source: str = Field(..., min_length=1)
    value: Optional[str] = None
    lang: str = Field(..., min_length=2)
    type: str = Field(default="code")
    name: Optional[str] = None
    res_id: Optional[int] = None
    module_name: Optional[str] = None
    comments: Optional[str] = None


class TranslationUpdate(BaseModel):
    """Update translation request."""

    value: Optional[str] = None
    comments: Optional[str] = None
    state: Optional[str] = None


class BulkTranslationCreate(BaseModel):
    """Bulk create translations request."""

    translations: List[TranslationCreate]
    lang: str
    module_name: Optional[str] = None


class TranslationStats(BaseModel):
    """Translation statistics."""

    lang: str
    module_name: Optional[str] = None
    total: int
    translated: int
    validated: int
    to_translate: int
    completion_rate: float


class TranslateRequest(BaseModel):
    """Simple translation request."""

    text: str
    lang: str
    type: str = "code"
    name: Optional[str] = None
    res_id: Optional[int] = None


class TranslateResponse(BaseModel):
    """Simple translation response."""

    source: str
    translation: str
    lang: str


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_translation_service(db: Session = Depends(get_db)) -> TranslationService:
    """Get translation service."""
    return TranslationService(db)


# -------------------------------------------------------------------------
# Language Endpoints
# -------------------------------------------------------------------------


@router.get("/languages/", response_model=List[LanguageResponse])
def list_languages(
    active_only: bool = Query(True, description="Only return active languages"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[LanguageResponse]:
    """List all languages."""
    service = TranslationService(db)
    languages = service.get_languages(active_only=active_only)
    return [LanguageResponse.from_language(lang) for lang in languages]


@router.get("/languages/{code}", response_model=LanguageResponse)
def get_language(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LanguageResponse:
    """Get a language by code."""
    service = TranslationService(db)
    language = service.get_language(code)

    if not language:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Language '{code}' not found"
        )

    return LanguageResponse.from_language(language)


@router.post("/languages/", response_model=LanguageResponse, status_code=status.HTTP_201_CREATED)
def create_language(
    data: LanguageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> LanguageResponse:
    """Create a new language. Requires superuser permissions."""
    service = TranslationService(db)

    # Check if already exists
    existing = service.get_language(data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language '{data.code}' already exists"
        )

    language = service.create_language(
        code=data.code,
        name=data.name,
        iso_code=data.iso_code,
        direction=data.direction,
        date_format=data.date_format,
        time_format=data.time_format,
        decimal_separator=data.decimal_separator,
        thousands_separator=data.thousands_separator,
        is_default=data.is_default,
    )
    db.commit()

    return LanguageResponse.from_language(language)


@router.put("/languages/{code}", response_model=LanguageResponse)
def update_language(
    code: str,
    data: LanguageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> LanguageResponse:
    """Update a language. Requires superuser permissions."""
    service = TranslationService(db)

    update_data = data.model_dump(exclude_unset=True)
    language = service.update_language(code, **update_data)

    if not language:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Language '{code}' not found"
        )

    db.commit()
    return LanguageResponse.from_language(language)


@router.delete("/languages/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_language(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete a language and its translations. Requires superuser permissions."""
    service = TranslationService(db)

    try:
        deleted = service.delete_language(code)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language '{code}' not found"
            )
        db.commit()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# -------------------------------------------------------------------------
# Translation Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[TranslationResponse])
def list_translations(
    lang: Optional[str] = Query(None, description="Filter by language"),
    type: Optional[str] = Query(None, description="Filter by type"),
    module_name: Optional[str] = Query(None, description="Filter by module"),
    state: Optional[str] = Query(None, description="Filter by state"),
    search: Optional[str] = Query(None, description="Search in source/value"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[TranslationResponse]:
    """List translations with optional filters."""
    service = TranslationService(db)

    if search:
        translations = service.search_translations(
            query=search,
            lang=lang,
            type=type,
            module_name=module_name,
            limit=limit,
        )
    else:
        query = db.query(IrTranslation)

        if lang:
            query = query.filter(IrTranslation.lang == lang)
        if type:
            query = query.filter(IrTranslation.type == type)
        if module_name:
            query = query.filter(IrTranslation.module_name == module_name)
        if state:
            query = query.filter(IrTranslation.state == state)

        translations = query.offset(offset).limit(limit).all()

    return [TranslationResponse.from_translation(t) for t in translations]


@router.get("/{translation_id}", response_model=TranslationResponse)
def get_translation(
    translation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TranslationResponse:
    """Get a translation by ID."""
    translation = db.query(IrTranslation).filter(
        IrTranslation.id == translation_id
    ).first()

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation {translation_id} not found"
        )

    return TranslationResponse.from_translation(translation)


@router.post("/", response_model=TranslationResponse, status_code=status.HTTP_201_CREATED)
def create_translation(
    data: TranslationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> TranslationResponse:
    """Create a new translation. Requires superuser permissions."""
    service = TranslationService(db)

    translation = service.set_translation(
        source=data.source,
        value=data.value,
        lang=data.lang,
        type=data.type,
        name=data.name,
        res_id=data.res_id,
        module_name=data.module_name,
    )
    db.commit()

    return TranslationResponse.from_translation(translation)


@router.put("/{translation_id}", response_model=TranslationResponse)
def update_translation(
    translation_id: int,
    data: TranslationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> TranslationResponse:
    """Update a translation. Requires superuser permissions."""
    translation = db.query(IrTranslation).filter(
        IrTranslation.id == translation_id
    ).first()

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation {translation_id} not found"
        )

    if data.value is not None:
        translation.value = data.value
        if data.state is None and data.value:
            translation.state = TranslationState.TRANSLATED.value
    if data.comments is not None:
        translation.comments = data.comments
    if data.state is not None:
        translation.state = data.state

    db.commit()
    db.refresh(translation)

    return TranslationResponse.from_translation(translation)


@router.delete("/{translation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_translation(
    translation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete a translation. Requires superuser permissions."""
    translation = db.query(IrTranslation).filter(
        IrTranslation.id == translation_id
    ).first()

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation {translation_id} not found"
        )

    db.delete(translation)
    db.commit()


@router.post("/{translation_id}/validate", response_model=TranslationResponse)
def validate_translation(
    translation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> TranslationResponse:
    """Mark a translation as validated. Requires superuser permissions."""
    service = TranslationService(db)
    translation = service.validate_translation(translation_id)

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation {translation_id} not found or not translated"
        )

    db.commit()
    return TranslationResponse.from_translation(translation)


# -------------------------------------------------------------------------
# Translate Endpoint (Simple API)
# -------------------------------------------------------------------------


@router.post("/translate", response_model=TranslateResponse)
def translate_text(
    data: TranslateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TranslateResponse:
    """Get translation for a text."""
    service = TranslationService(db)

    translation = service.translate(
        text=data.text,
        lang=data.lang,
        type=data.type,
        name=data.name,
        res_id=data.res_id,
    )

    return TranslateResponse(
        source=data.text,
        translation=translation,
        lang=data.lang,
    )


# -------------------------------------------------------------------------
# Bulk Operations
# -------------------------------------------------------------------------


@router.post("/bulk", response_model=Dict[str, int])
def bulk_create_translations(
    data: BulkTranslationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> Dict[str, int]:
    """Bulk create/update translations. Requires superuser permissions."""
    service = TranslationService(db)

    translations = [
        {
            "source": t.source,
            "value": t.value,
            "name": t.name,
            "type": t.type,
            "res_id": t.res_id,
            "module_name": t.module_name or data.module_name,
        }
        for t in data.translations
    ]

    created, updated = service.bulk_set_translations(
        translations=translations,
        lang=data.lang,
        module_name=data.module_name,
    )
    db.commit()

    return {"created": created, "updated": updated}


# -------------------------------------------------------------------------
# Import/Export
# -------------------------------------------------------------------------


@router.post("/import/{lang}")
async def import_translations(
    lang: str,
    module_name: str = Query(..., description="Module name"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> Dict[str, Any]:
    """
    Import translations from file (JSON or PO format).
    Requires superuser permissions.
    """
    import tempfile
    import os

    service = TranslationService(db)

    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".json"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        created, updated = service.load_language_file(
            file_path=tmp_path,
            lang=lang,
            module_name=module_name,
        )
        db.commit()

        return {
            "success": True,
            "lang": lang,
            "module_name": module_name,
            "created": created,
            "updated": updated,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    finally:
        os.unlink(tmp_path)


@router.get("/export/{module_name}/{lang}")
def export_translations(
    module_name: str,
    lang: str,
    format: str = Query("json", pattern="^(json|po)$"),
    include_untranslated: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PlainTextResponse:
    """Export translations for a module in JSON or PO format."""
    service = TranslationService(db)

    content = service.export_translations(
        module_name=module_name,
        lang=lang,
        format=format,
        include_untranslated=include_untranslated,
    )

    media_type = "application/json" if format == "json" else "text/x-gettext-translation"
    filename = f"{module_name}_{lang}.{format}"

    return PlainTextResponse(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# -------------------------------------------------------------------------
# Module Translations
# -------------------------------------------------------------------------


@router.get("/module/{module_name}", response_model=List[TranslationResponse])
def get_module_translations(
    module_name: str,
    lang: str = Query(..., description="Language code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[TranslationResponse]:
    """Get all translations for a module."""
    service = TranslationService(db)
    translations = service.get_module_translations(module_name, lang)
    return [TranslationResponse.from_translation(t) for t in translations]


@router.delete("/module/{module_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module_translations(
    module_name: str,
    lang: Optional[str] = Query(None, description="Language code (optional)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete all translations for a module. Requires superuser permissions."""
    service = TranslationService(db)
    service.delete_module_translations(module_name, lang)
    db.commit()


# -------------------------------------------------------------------------
# Model Translations
# -------------------------------------------------------------------------


@router.get("/model/{model_name}/{res_id}", response_model=Dict[str, str])
def get_model_translations(
    model_name: str,
    res_id: int,
    lang: str = Query(..., description="Language code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, str]:
    """Get all field translations for a record."""
    service = TranslationService(db)
    return service.get_model_translations(model_name, res_id, lang)


@router.delete("/model/{model_name}/{res_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record_translations(
    model_name: str,
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete all translations for a record. Requires superuser permissions."""
    service = TranslationService(db)
    service.delete_record_translations(model_name, res_id)
    db.commit()


# -------------------------------------------------------------------------
# Statistics
# -------------------------------------------------------------------------


@router.get("/stats/{lang}", response_model=TranslationStats)
def get_translation_stats(
    lang: str,
    module_name: Optional[str] = Query(None, description="Filter by module"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TranslationStats:
    """Get translation statistics for a language."""
    service = TranslationService(db)
    stats = service.get_translation_stats(lang, module_name)
    return TranslationStats(**stats)


@router.get("/untranslated/{lang}", response_model=List[TranslationResponse])
def get_untranslated(
    lang: str,
    module_name: Optional[str] = Query(None, description="Filter by module"),
    type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[TranslationResponse]:
    """Get untranslated entries for a language."""
    service = TranslationService(db)
    translations = service.get_untranslated(
        lang=lang,
        module_name=module_name,
        type=type,
        limit=limit,
    )
    return [TranslationResponse.from_translation(t) for t in translations]


# -------------------------------------------------------------------------
# Types
# -------------------------------------------------------------------------


@router.get("/types/", response_model=List[str])
def list_translation_types(
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """Get list of translation types."""
    return [t.value for t in TranslationType]


@router.get("/states/", response_model=List[str])
def list_translation_states(
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """Get list of translation states."""
    return [s.value for s in TranslationState]
