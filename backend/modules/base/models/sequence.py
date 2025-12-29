"""
Sequence Model

Implements auto-incrementing sequences for document numbering.
Similar to Odoo's ir.sequence.

Supports:
- Prefix and suffix patterns with date placeholders
- Per-company sequences
- Gap-less numbering option
- Custom padding
"""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class Sequence(Base, TimestampMixin):
    """
    Sequence for generating unique document numbers.

    Example patterns:
    - "SO-%(year)s-%(month)s-" -> "SO-2024-12-00001"
    - "INV/%(y)s/" -> "INV/24/00001"
    - "PO-" -> "PO-00001"

    Placeholders:
    - %(year)s or %(Y)s: 4-digit year (2024)
    - %(y)s: 2-digit year (24)
    - %(month)s or %(m)s: 2-digit month (01-12)
    - %(day)s or %(d)s: 2-digit day (01-31)
    - %(doy)s: Day of year (001-366)
    - %(woy)s: Week of year (01-53)
    - %(h24)s: Hour 24-format
    - %(sec)s: Seconds
    """

    __tablename__ = "sequences"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Sequence identification
    name = Column(String(200), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True, comment="Unique sequence code")
    module_name = Column(String(100), nullable=True, index=True)

    # Number format
    prefix = Column(String(100), default="", comment="Prefix pattern with placeholders")
    suffix = Column(String(100), default="", comment="Suffix pattern with placeholders")
    padding = Column(Integer, default=5, comment="Number of digits for sequence number")

    # Current state
    number_next = Column(Integer, default=1, comment="Next number to use")
    number_increment = Column(Integer, default=1, comment="Increment step")

    # Company-specific (optional)
    company_id = Column(Integer, nullable=True, index=True)

    # Reset configuration
    reset_period = Column(
        String(20),
        nullable=True,
        comment="When to reset: 'year', 'month', 'day', or null for never"
    )
    last_reset_date = Column(DateTime(timezone=True), nullable=True)

    # Options
    is_active = Column(Boolean, default=True)
    use_date_range = Column(Boolean, default=False, comment="Use date-based sub-sequences")

    def __repr__(self) -> str:
        return f"<Sequence(code={self.code}, next={self.number_next})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "prefix": self.prefix,
            "suffix": self.suffix,
            "padding": self.padding,
            "number_next": self.number_next,
            "number_increment": self.number_increment,
            "company_id": self.company_id,
            "reset_period": self.reset_period,
            "is_active": self.is_active,
        }

    def format_number(self, number: int, date: Optional[datetime] = None) -> str:
        """
        Format a sequence number with prefix and suffix.

        Args:
            number: The sequence number
            date: Date to use for placeholders (default: now)

        Returns:
            Formatted sequence string
        """
        date = date or datetime.utcnow()

        # Build placeholder context
        context = {
            "year": date.strftime("%Y"),
            "Y": date.strftime("%Y"),
            "y": date.strftime("%y"),
            "month": date.strftime("%m"),
            "m": date.strftime("%m"),
            "day": date.strftime("%d"),
            "d": date.strftime("%d"),
            "doy": date.strftime("%j"),
            "woy": date.strftime("%W"),
            "h24": date.strftime("%H"),
            "sec": date.strftime("%S"),
        }

        # Format prefix and suffix
        prefix = self._format_pattern(self.prefix or "", context)
        suffix = self._format_pattern(self.suffix or "", context)

        # Format number with padding
        number_str = str(number).zfill(self.padding)

        return f"{prefix}{number_str}{suffix}"

    def _format_pattern(self, pattern: str, context: Dict[str, str]) -> str:
        """Format a pattern string with context variables."""
        try:
            return pattern % context
        except (KeyError, ValueError):
            # If pattern fails, return as-is
            return pattern

    def should_reset(self, current_date: Optional[datetime] = None) -> bool:
        """Check if the sequence should be reset based on reset_period."""
        if not self.reset_period or not self.last_reset_date:
            return False

        current = current_date or datetime.utcnow()
        last = self.last_reset_date

        if self.reset_period == "year":
            return current.year > last.year
        elif self.reset_period == "month":
            return (current.year, current.month) > (last.year, last.month)
        elif self.reset_period == "day":
            return current.date() > last.date()

        return False


class SequenceDateRange(Base, TimestampMixin):
    """
    Date-range specific sequence numbers.

    Used when use_date_range is True on the parent Sequence.
    Allows different number series for different date ranges.
    """

    __tablename__ = "sequence_date_ranges"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    sequence_id = Column(Integer, nullable=False, index=True)
    date_from = Column(DateTime(timezone=True), nullable=False)
    date_to = Column(DateTime(timezone=True), nullable=False)
    number_next = Column(Integer, default=1)

    def __repr__(self) -> str:
        return f"<SequenceDateRange(seq={self.sequence_id}, from={self.date_from}, next={self.number_next})>"
