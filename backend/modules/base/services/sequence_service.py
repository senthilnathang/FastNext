"""
Sequence Service

Provides thread-safe sequence number generation.
Supports multiple sequence formats and auto-reset.
"""

import logging
import threading
from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.sequence import Sequence, SequenceDateRange

logger = logging.getLogger(__name__)

# Global lock for sequence generation (prevents race conditions)
_sequence_locks: dict = {}
_global_lock = threading.Lock()


def _get_sequence_lock(code: str) -> threading.Lock:
    """Get or create a lock for a specific sequence code."""
    with _global_lock:
        if code not in _sequence_locks:
            _sequence_locks[code] = threading.Lock()
        return _sequence_locks[code]


class SequenceService:
    """
    Service for generating sequence numbers.

    Provides thread-safe number generation with support for:
    - Custom prefixes and suffixes with date placeholders
    - Company-specific sequences
    - Automatic reset (yearly, monthly, daily)
    - Date-range based sub-sequences

    Usage:
        service = SequenceService(db)
        number = service.next_by_code("sale.order")
        # Returns: "SO-2024-12-00001"
    """

    def __init__(self, db: Session):
        self.db = db

    def get_sequence(
        self,
        code: str,
        company_id: Optional[int] = None,
    ) -> Optional[Sequence]:
        """
        Get a sequence by code.

        Args:
            code: Sequence code
            company_id: Optional company filter

        Returns:
            Sequence object or None
        """
        query = self.db.query(Sequence).filter(
            Sequence.code == code,
            Sequence.is_active == True,
        )

        if company_id:
            # Try company-specific first, then global
            company_seq = query.filter(Sequence.company_id == company_id).first()
            if company_seq:
                return company_seq

        return query.filter(Sequence.company_id.is_(None)).first()

    def next_by_code(
        self,
        code: str,
        company_id: Optional[int] = None,
        date: Optional[datetime] = None,
    ) -> Optional[str]:
        """
        Get the next formatted sequence number by code.

        Thread-safe implementation using database row locking.

        Args:
            code: Sequence code
            company_id: Optional company ID for company-specific sequences
            date: Date to use for formatting (default: now)

        Returns:
            Formatted sequence string or None if sequence not found
        """
        lock = _get_sequence_lock(code)

        with lock:
            sequence = self.get_sequence(code, company_id)

            if not sequence:
                logger.warning(f"Sequence not found: {code}")
                return None

            date = date or datetime.utcnow()

            # Check for reset
            if sequence.should_reset(date):
                self._reset_sequence(sequence, date)

            # Get the number (use date range if configured)
            if sequence.use_date_range:
                number = self._next_date_range_number(sequence, date)
            else:
                number = sequence.number_next
                sequence.number_next += sequence.number_increment
                sequence.last_reset_date = sequence.last_reset_date or date

            self.db.commit()

            return sequence.format_number(number, date)

    def next_by_id(
        self,
        sequence_id: int,
        date: Optional[datetime] = None,
    ) -> Optional[str]:
        """
        Get the next formatted sequence number by ID.

        Args:
            sequence_id: Sequence ID
            date: Date to use for formatting

        Returns:
            Formatted sequence string or None
        """
        sequence = self.db.query(Sequence).filter(Sequence.id == sequence_id).first()

        if not sequence:
            return None

        return self.next_by_code(sequence.code, sequence.company_id, date)

    def _next_date_range_number(
        self,
        sequence: Sequence,
        date: datetime,
    ) -> int:
        """Get the next number for a date-range sequence."""
        # Find or create date range
        date_range = (
            self.db.query(SequenceDateRange)
            .filter(
                SequenceDateRange.sequence_id == sequence.id,
                SequenceDateRange.date_from <= date,
                SequenceDateRange.date_to >= date,
            )
            .first()
        )

        if not date_range:
            # Create a new date range for the current year
            year_start = datetime(date.year, 1, 1)
            year_end = datetime(date.year, 12, 31, 23, 59, 59)

            date_range = SequenceDateRange(
                sequence_id=sequence.id,
                date_from=year_start,
                date_to=year_end,
                number_next=1,
            )
            self.db.add(date_range)
            self.db.flush()

        number = date_range.number_next
        date_range.number_next += sequence.number_increment

        return number

    def _reset_sequence(self, sequence: Sequence, date: datetime) -> None:
        """Reset a sequence to 1."""
        logger.info(f"Resetting sequence '{sequence.code}' for {sequence.reset_period}")
        sequence.number_next = 1
        sequence.last_reset_date = date

    def create_sequence(
        self,
        code: str,
        name: str,
        prefix: str = "",
        suffix: str = "",
        padding: int = 5,
        company_id: Optional[int] = None,
        module_name: Optional[str] = None,
        reset_period: Optional[str] = None,
    ) -> Sequence:
        """
        Create a new sequence.

        Args:
            code: Unique sequence code
            name: Human-readable name
            prefix: Prefix pattern
            suffix: Suffix pattern
            padding: Number of digits
            company_id: Optional company ID
            module_name: Module that owns this sequence
            reset_period: Reset period ('year', 'month', 'day', or None)

        Returns:
            Created Sequence object
        """
        sequence = Sequence(
            code=code,
            name=name,
            prefix=prefix,
            suffix=suffix,
            padding=padding,
            company_id=company_id,
            module_name=module_name,
            reset_period=reset_period,
            number_next=1,
            number_increment=1,
            is_active=True,
        )

        self.db.add(sequence)
        self.db.commit()
        self.db.refresh(sequence)

        logger.info(f"Created sequence: {code}")
        return sequence

    def preview_next(
        self,
        code: str,
        company_id: Optional[int] = None,
        count: int = 5,
    ) -> list:
        """
        Preview the next N sequence numbers without consuming them.

        Args:
            code: Sequence code
            company_id: Optional company ID
            count: Number of previews

        Returns:
            List of formatted sequence strings
        """
        sequence = self.get_sequence(code, company_id)
        if not sequence:
            return []

        date = datetime.utcnow()
        previews = []

        for i in range(count):
            number = sequence.number_next + (i * sequence.number_increment)
            previews.append(sequence.format_number(number, date))

        return previews


def get_sequence_service(db: Session) -> SequenceService:
    """Factory function for SequenceService."""
    return SequenceService(db)
