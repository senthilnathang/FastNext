"""
Validation service that bridges TypeScript Zod schemas with Python Pydantic models.
Provides centralized validation logic and error handling for the FastNext backend.
"""

import json
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Type, Union, get_args, get_origin
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ValidationError, validator
from pydantic.fields import FieldInfo


class ValidationService:
    """Central validation service that provides Zod-like validation for Python backend"""

    @staticmethod
    def validate_email(email: str) -> Dict[str, Any]:
        """Validate email address with detailed feedback"""
        try:
            # Use email-validator for comprehensive validation
            valid = validate_email(email)
            return {
                "is_valid": True,
                "normalized_email": valid.email,
                "domain": valid.domain,
                "local": valid.local,
            }
        except EmailNotValidError as e:
            return {"is_valid": False, "error": str(e), "suggestion": None}

    @staticmethod
    def validate_password(password: str) -> Dict[str, Any]:
        """Validate password strength according to Zod schema rules"""
        errors = []
        score = 0

        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        elif len(password) >= 12:
            score += 2
        else:
            score += 1

        if len(password) > 128:
            errors.append("Password must be less than 128 characters")

        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        else:
            score += 1

        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        else:
            score += 1

        if not re.search(r"\d", password):
            errors.append("Password must contain at least one number")
        else:
            score += 1

        if not re.search(r"[@$!%*?&]", password):
            errors.append(
                "Password must contain at least one special character (@$!%*?&)"
            )
        else:
            score += 1

        # Additional checks for strong passwords
        if re.search(r"(.)\1{2,}", password):  # Repeated characters
            score -= 1

        if password.lower() in ["password", "123456", "qwerty", "admin"]:
            errors.append("Password is too common")
            score = 0

        strength = "weak"
        if score >= 6:
            strength = "very_strong"
        elif score >= 5:
            strength = "strong"
        elif score >= 3:
            strength = "medium"

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "strength": strength,
            "score": max(0, score),
        }

    @staticmethod
    def validate_username(username: str) -> Dict[str, Any]:
        """Validate username according to Zod schema rules"""
        errors = []

        if len(username) < 3:
            errors.append("Username must be at least 3 characters")

        if len(username) > 50:
            errors.append("Username must be less than 50 characters")

        if not re.match(r"^[a-zA-Z0-9_-]+$", username):
            errors.append(
                "Username can only contain letters, numbers, hyphens, and underscores"
            )

        if username.lower() in ["admin", "root", "user", "test", "api", "system"]:
            errors.append("Username is reserved")

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "normalized": username.lower(),
        }

    @staticmethod
    def validate_url(url: str) -> Dict[str, Any]:
        """Validate URL format"""
        try:
            # Use Pydantic's HttpUrl for validation
            HttpUrl(url)
            return {"is_valid": True}
        except Exception as e:
            return {"is_valid": False, "error": "Invalid URL format"}

    @staticmethod
    def validate_uuid(uuid_str: str) -> Dict[str, Any]:
        """Validate UUID format"""
        try:
            UUID(uuid_str)
            return {"is_valid": True}
        except ValueError:
            return {"is_valid": False, "error": "Invalid UUID format"}

    @staticmethod
    def validate_slug(slug: str) -> Dict[str, Any]:
        """Validate slug format (lowercase, alphanumeric, hyphens)"""
        errors = []

        if not re.match(r"^[a-z0-9-]+$", slug):
            errors.append(
                "Slug can only contain lowercase letters, numbers, and hyphens"
            )

        if slug.startswith("-") or slug.endswith("-"):
            errors.append("Slug cannot start or end with a hyphen")

        if "--" in slug:
            errors.append("Slug cannot contain consecutive hyphens")

        if len(slug) < 1:
            errors.append("Slug cannot be empty")

        if len(slug) > 50:
            errors.append("Slug must be less than 50 characters")

        return {"is_valid": len(errors) == 0, "errors": errors}

    @staticmethod
    def validate_color_hex(color: str) -> Dict[str, Any]:
        """Validate hex color format"""
        if not re.match(r"^#[0-9A-Fa-f]{6}$", color):
            return {
                "is_valid": False,
                "error": "Color must be a valid 6-digit hex color (e.g., #FF0000)",
            }

        return {"is_valid": True}

    @staticmethod
    def validate_cron_expression(expression: str) -> Dict[str, Any]:
        """Validate cron expression format"""
        # Basic 5-field cron validation (minute hour day month weekday)
        pattern = r"^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$"

        if not re.match(pattern, expression):
            return {"is_valid": False, "error": "Invalid cron expression format"}

        return {"is_valid": True}

    @staticmethod
    def validate_file_upload(
        file_size: int,
        file_name: str,
        file_type: str,
        max_size: int = 10 * 1024 * 1024,  # 10MB default
        allowed_types: Optional[List[str]] = None,
        allowed_extensions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Validate file upload constraints"""
        errors = []

        # Check file size
        if file_size > max_size:
            errors.append(f"File size must be less than {max_size // 1024 // 1024}MB")

        # Check file type
        if allowed_types and file_type not in allowed_types:
            errors.append(f"File type {file_type} is not allowed")

        # Check file extension
        if allowed_extensions:
            extension = file_name.split(".")[-1].lower() if "." in file_name else ""
            if extension not in allowed_extensions:
                errors.append(f"File extension .{extension} is not allowed")

        # Check filename
        if not file_name or len(file_name.strip()) == 0:
            errors.append("File name cannot be empty")

        if len(file_name) > 255:
            errors.append("File name is too long")

        # Check for dangerous file names
        dangerous_names = ["..", ".", "con", "prn", "aux", "nul"]
        if file_name.lower() in dangerous_names:
            errors.append("File name is not allowed")

        return {"is_valid": len(errors) == 0, "errors": errors}

    @staticmethod
    def validate_json_field(json_str: str) -> Dict[str, Any]:
        """Validate JSON string format"""
        if not json_str:
            return {"is_valid": True, "parsed": {}}

        try:
            parsed = json.loads(json_str)
            return {"is_valid": True, "parsed": parsed}
        except json.JSONDecodeError as e:
            return {"is_valid": False, "error": f"Invalid JSON format: {str(e)}"}

    @staticmethod
    def validate_date_range(start_date: date, end_date: date) -> Dict[str, Any]:
        """Validate date range (end date must be after start date)"""
        if end_date <= start_date:
            return {"is_valid": False, "error": "End date must be after start date"}

        return {"is_valid": True}

    @staticmethod
    def validate_tags(
        tags: List[str], max_tags: int = 10, max_tag_length: int = 50
    ) -> Dict[str, Any]:
        """Validate tags array"""
        errors = []

        if len(tags) > max_tags:
            errors.append(f"Maximum {max_tags} tags allowed")

        for tag in tags:
            if len(tag) > max_tag_length:
                errors.append(
                    f"Tag '{tag}' is too long (max {max_tag_length} characters)"
                )

            if not re.match(r"^[a-zA-Z0-9\s-_]+$", tag):
                errors.append(f"Tag '{tag}' contains invalid characters")

        # Check for duplicates
        if len(tags) != len(set(tags)):
            errors.append("Duplicate tags are not allowed")

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "unique_tags": list(set(tags)),
        }

    @staticmethod
    def sanitize_html(html_content: str) -> str:
        """Basic HTML sanitization (remove script tags, etc.)"""
        import html

        # Escape HTML entities
        sanitized = html.escape(html_content)

        # Remove script tags and their content
        sanitized = re.sub(
            r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
            "",
            sanitized,
            flags=re.IGNORECASE,
        )

        # Remove on* event handlers
        sanitized = re.sub(
            r'\s*on\w+\s*=\s*["\'][^"\']*["\']', "", sanitized, flags=re.IGNORECASE
        )

        return sanitized

    @classmethod
    def validate_pydantic_model(
        cls, model_class: Type[BaseModel], data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate data against a Pydantic model"""
        try:
            validated_data = model_class(**data)
            return {
                "is_valid": True,
                "data": validated_data.dict(),
                "model": validated_data,
            }
        except ValidationError as e:
            return {
                "is_valid": False,
                "errors": [
                    {
                        "field": ".".join(str(loc) for loc in error["loc"]),
                        "message": error["msg"],
                        "type": error["type"],
                    }
                    for error in e.errors()
                ],
            }

    @classmethod
    def create_field_validator(
        cls, validation_func, error_message: str = "Validation failed"
    ):
        """Create a Pydantic validator from a validation function"""

        def validator_wrapper(cls, v):
            result = validation_func(v)
            if not result.get("is_valid", False):
                raise ValueError(result.get("error", error_message))
            return v

        return validator_wrapper

    @staticmethod
    def normalize_phone_number(phone: str) -> Dict[str, Any]:
        """Normalize and validate phone number"""
        # Remove all non-digit characters
        digits_only = re.sub(r"\D", "", phone)

        if len(digits_only) < 10:
            return {
                "is_valid": False,
                "error": "Phone number must have at least 10 digits",
            }

        if len(digits_only) > 15:
            return {
                "is_valid": False,
                "error": "Phone number cannot have more than 15 digits",
            }

        # Format as international number if it looks like US number
        if len(digits_only) == 10:
            formatted = f"+1{digits_only}"
        elif len(digits_only) == 11 and digits_only.startswith("1"):
            formatted = f"+{digits_only}"
        else:
            formatted = f"+{digits_only}"

        return {"is_valid": True, "normalized": formatted, "digits_only": digits_only}

    @staticmethod
    def validate_timezone(timezone_str: str) -> Dict[str, Any]:
        """Validate timezone string"""
        try:
            import pytz

            pytz.timezone(timezone_str)
            return {"is_valid": True}
        except:
            return {"is_valid": False, "error": "Invalid timezone"}

    @staticmethod
    def validate_currency_code(currency: str) -> Dict[str, Any]:
        """Validate ISO 4217 currency code"""
        # Common currency codes - in a real app, you'd have a complete list
        valid_currencies = [
            "USD",
            "EUR",
            "GBP",
            "JPY",
            "AUD",
            "CAD",
            "CHF",
            "CNY",
            "SEK",
            "NZD",
            "MXN",
            "SGD",
            "HKD",
            "NOK",
            "TRY",
            "ZAR",
            "BRL",
            "INR",
            "KRW",
            "TWD",
        ]

        if len(currency) != 3:
            return {"is_valid": False, "error": "Currency code must be 3 characters"}

        if currency.upper() not in valid_currencies:
            return {
                "is_valid": False,
                "error": f"Currency code {currency} is not supported",
            }

        return {"is_valid": True, "normalized": currency.upper()}


# Pydantic model decorators for common validations
class EnhancedValidationMixin:
    """Mixin that adds enhanced validation methods to Pydantic models"""

    @validator("email", pre=True, always=True)
    def validate_email_field(cls, v):
        if v:
            result = ValidationService.validate_email(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
            return result["normalized_email"]
        return v

    @validator("password", pre=True, always=True)
    def validate_password_field(cls, v):
        if v:
            result = ValidationService.validate_password(v)
            if not result["is_valid"]:
                raise ValueError("; ".join(result["errors"]))
        return v


# Custom field types that mirror Zod schemas
def EmailField(**kwargs) -> EmailStr:
    """Email field with Zod-like validation"""
    return Field(**kwargs)


def PasswordField(**kwargs) -> str:
    """Password field with strength validation"""
    return Field(min_length=8, max_length=128, **kwargs)


def UsernameField(**kwargs) -> str:
    """Username field with format validation"""
    return Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$", **kwargs)


def SlugField(**kwargs) -> str:
    """Slug field with format validation"""
    return Field(pattern=r"^[a-z0-9-]+$", **kwargs)


def ColorField(**kwargs) -> str:
    """Hex color field with format validation"""
    return Field(pattern=r"^#[0-9A-Fa-f]{6}$", **kwargs)


def UuidField(**kwargs) -> str:
    """UUID field with format validation"""
    return Field(
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        **kwargs,
    )


def PhoneField(**kwargs) -> str:
    """Phone number field with format validation"""
    return Field(pattern=r"^\+?[1-9]\d{1,14}$", **kwargs)


def CronField(**kwargs) -> str:
    """Cron expression field with format validation"""
    return Field(**kwargs)


# Export validation service as default
__all__ = [
    "ValidationService",
    "EnhancedValidationMixin",
    "EmailField",
    "PasswordField",
    "UsernameField",
    "SlugField",
    "ColorField",
    "UuidField",
    "PhoneField",
    "CronField",
]
