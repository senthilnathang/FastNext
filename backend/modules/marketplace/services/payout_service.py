"""
Marketplace Payout Service

Manages publisher payouts, balances, and financial transactions.
"""

import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session, joinedload

from ..models.payout import (
    PayoutBatch,
    PublisherPayoutItem,
    PayoutSchedule,
    PayoutAdjustment,
    PublisherBalance,
    BalanceTransaction,
)
from ..models.publisher import Publisher
from ..models.license import Order, OrderItem


class PayoutService:
    """Service for managing publisher payouts and balances."""

    # Platform fee percentage (e.g., 0.30 = 30%)
    DEFAULT_PLATFORM_FEE_RATE = Decimal("0.30")

    # Minimum payout threshold
    DEFAULT_MINIMUM_PAYOUT = Decimal("50.00")

    def __init__(self, db: Session):
        self.db = db

    # ==================== Balance Management ====================

    def get_or_create_balance(self, publisher_id: int) -> PublisherBalance:
        """Get or create a publisher's balance record."""
        balance = self.db.query(PublisherBalance).filter(
            PublisherBalance.publisher_id == publisher_id
        ).first()

        if not balance:
            balance = PublisherBalance(
                publisher_id=publisher_id,
                available_balance=Decimal("0.00"),
                pending_balance=Decimal("0.00"),
                reserved_balance=Decimal("0.00"),
                currency="USD",
                lifetime_earnings=Decimal("0.00"),
                lifetime_payouts=Decimal("0.00"),
                lifetime_adjustments=Decimal("0.00"),
            )
            self.db.add(balance)
            self.db.flush()

        return balance

    def get_publisher_balance(self, publisher_id: int) -> Dict[str, Any]:
        """Get publisher's current balance summary."""
        balance = self.get_or_create_balance(publisher_id)

        return {
            "publisher_id": publisher_id,
            "available_balance": float(balance.available_balance),
            "pending_balance": float(balance.pending_balance),
            "reserved_balance": float(balance.reserved_balance),
            "total_balance": float(balance.available_balance + balance.pending_balance),
            "currency": balance.currency,
            "lifetime_earnings": float(balance.lifetime_earnings),
            "lifetime_payouts": float(balance.lifetime_payouts),
            "lifetime_adjustments": float(balance.lifetime_adjustments),
            "last_earning_at": balance.last_earning_at.isoformat() if balance.last_earning_at else None,
            "last_payout_at": balance.last_payout_at.isoformat() if balance.last_payout_at else None,
            "auto_payout_enabled": balance.auto_payout_enabled,
            "payout_threshold": float(balance.payout_threshold) if balance.payout_threshold else None,
        }

    def add_earning(
        self,
        publisher_id: int,
        amount: Decimal,
        platform_fee_rate: Optional[Decimal] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None,
        to_pending: bool = True,
    ) -> BalanceTransaction:
        """
        Add earnings to publisher balance.

        Args:
            publisher_id: Publisher ID
            amount: Gross amount before platform fee
            platform_fee_rate: Override platform fee rate
            reference_type: Type of reference (order, adjustment)
            reference_id: ID of reference
            description: Transaction description
            to_pending: If True, add to pending balance (for hold period)
        """
        if platform_fee_rate is None:
            platform_fee_rate = self.DEFAULT_PLATFORM_FEE_RATE

        platform_fee = amount * platform_fee_rate
        net_amount = amount - platform_fee

        balance = self.get_or_create_balance(publisher_id)
        balance_type = "pending" if to_pending else "available"

        if to_pending:
            balance_before = balance.pending_balance
            balance.pending_balance += net_amount
            balance_after = balance.pending_balance
        else:
            balance_before = balance.available_balance
            balance.available_balance += net_amount
            balance_after = balance.available_balance

        balance.lifetime_earnings += net_amount
        balance.last_earning_at = datetime.utcnow()

        # Record transaction
        transaction = BalanceTransaction(
            publisher_id=publisher_id,
            transaction_type="sale",
            amount=net_amount,
            currency="USD",
            balance_type=balance_type,
            balance_before=balance_before,
            balance_after=balance_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Sale earning: ${amount} - ${platform_fee} fee = ${net_amount}",
            metadata={
                "gross_amount": str(amount),
                "platform_fee": str(platform_fee),
                "platform_fee_rate": str(platform_fee_rate),
            },
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    def move_pending_to_available(
        self,
        publisher_id: int,
        amount: Optional[Decimal] = None,
    ) -> Optional[BalanceTransaction]:
        """
        Move funds from pending to available balance.

        Args:
            publisher_id: Publisher ID
            amount: Amount to move (None = all pending)
        """
        balance = self.get_or_create_balance(publisher_id)

        if amount is None:
            amount = balance.pending_balance

        if amount <= 0 or balance.pending_balance < amount:
            return None

        # Deduct from pending
        balance.pending_balance -= amount

        # Add to available
        available_before = balance.available_balance
        balance.available_balance += amount

        # Record transaction
        transaction = BalanceTransaction(
            publisher_id=publisher_id,
            transaction_type="release",
            amount=amount,
            currency="USD",
            balance_type="available",
            balance_before=available_before,
            balance_after=balance.available_balance,
            description=f"Released ${amount} from pending to available",
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    def reserve_funds(
        self,
        publisher_id: int,
        amount: Decimal,
        reason: str,
    ) -> Optional[BalanceTransaction]:
        """Reserve funds for potential chargebacks/refunds."""
        balance = self.get_or_create_balance(publisher_id)

        if balance.available_balance < amount:
            return None

        balance.available_balance -= amount
        reserved_before = balance.reserved_balance
        balance.reserved_balance += amount

        transaction = BalanceTransaction(
            publisher_id=publisher_id,
            transaction_type="reserve",
            amount=-amount,
            currency="USD",
            balance_type="reserved",
            balance_before=reserved_before,
            balance_after=balance.reserved_balance,
            description=f"Reserved ${amount}: {reason}",
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    def release_reserved_funds(
        self,
        publisher_id: int,
        amount: Decimal,
        to_available: bool = True,
    ) -> Optional[BalanceTransaction]:
        """Release reserved funds back to available or forfeit."""
        balance = self.get_or_create_balance(publisher_id)

        if balance.reserved_balance < amount:
            amount = balance.reserved_balance

        if amount <= 0:
            return None

        balance.reserved_balance -= amount

        if to_available:
            available_before = balance.available_balance
            balance.available_balance += amount

            transaction = BalanceTransaction(
                publisher_id=publisher_id,
                transaction_type="release",
                amount=amount,
                currency="USD",
                balance_type="available",
                balance_before=available_before,
                balance_after=balance.available_balance,
                description=f"Released ${amount} from reserved to available",
            )
        else:
            # Forfeited (e.g., chargeback)
            transaction = BalanceTransaction(
                publisher_id=publisher_id,
                transaction_type="forfeit",
                amount=-amount,
                currency="USD",
                balance_type="reserved",
                balance_before=balance.reserved_balance + amount,
                balance_after=balance.reserved_balance,
                description=f"Forfeited ${amount} from reserved (chargeback)",
            )

        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    # ==================== Payout Batch Management ====================

    def create_payout_batch(
        self,
        period_start: date,
        period_end: date,
        batch_type: str = "regular",
        created_by: Optional[int] = None,
    ) -> PayoutBatch:
        """Create a new payout batch."""
        batch_id = str(uuid.uuid4())

        batch = PayoutBatch(
            batch_id=batch_id,
            batch_type=batch_type,
            period_start=period_start,
            period_end=period_end,
            status="draft",
            created_by=created_by,
        )
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        return batch

    def get_payout_batch(self, batch_id: str) -> Optional[PayoutBatch]:
        """Get a payout batch by ID."""
        return self.db.query(PayoutBatch).options(
            joinedload(PayoutBatch.payouts)
        ).filter(PayoutBatch.batch_id == batch_id).first()

    def list_payout_batches(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PayoutBatch]:
        """List payout batches with optional filtering."""
        query = self.db.query(PayoutBatch).order_by(PayoutBatch.created_at.desc())

        if status:
            query = query.filter(PayoutBatch.status == status)

        return query.offset(offset).limit(limit).all()

    def calculate_publisher_payout(
        self,
        publisher_id: int,
        period_start: date,
        period_end: date,
    ) -> Dict[str, Any]:
        """Calculate payout for a publisher for a period."""
        balance = self.get_or_create_balance(publisher_id)

        # Get all completed orders for this publisher in the period
        order_items = self.db.query(OrderItem).join(Order).filter(
            and_(
                Order.status == "completed",
                Order.completed_at >= datetime.combine(period_start, datetime.min.time()),
                Order.completed_at < datetime.combine(period_end + timedelta(days=1), datetime.min.time()),
            )
        ).all()

        # Calculate totals
        gross_amount = Decimal("0.00")
        order_ids = []
        module_breakdown = {}

        for item in order_items:
            gross_amount += item.unit_price * item.quantity
            order_ids.append(item.order_id)

            module_id = item.module_id
            if module_id not in module_breakdown:
                module_breakdown[module_id] = {
                    "module_id": module_id,
                    "amount": Decimal("0.00"),
                    "count": 0,
                }
            module_breakdown[module_id]["amount"] += item.unit_price * item.quantity
            module_breakdown[module_id]["count"] += 1

        platform_fee = gross_amount * self.DEFAULT_PLATFORM_FEE_RATE
        net_amount = gross_amount - platform_fee

        # Add any pending adjustments
        adjustments = self.db.query(PayoutAdjustment).filter(
            and_(
                PayoutAdjustment.publisher_id == publisher_id,
                PayoutAdjustment.status == "pending",
            )
        ).all()
        adjustment_total = sum(a.amount for a in adjustments)

        return {
            "publisher_id": publisher_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "gross_amount": float(gross_amount),
            "platform_fee": float(platform_fee),
            "adjustments": float(adjustment_total),
            "net_amount": float(net_amount + adjustment_total),
            "order_count": len(set(order_ids)),
            "order_ids": list(set(order_ids)),
            "module_breakdown": [
                {
                    "module_id": k,
                    "amount": float(v["amount"]),
                    "count": v["count"],
                }
                for k, v in module_breakdown.items()
            ],
            "available_balance": float(balance.available_balance),
            "pending_balance": float(balance.pending_balance),
        }

    def populate_batch_items(
        self,
        batch: PayoutBatch,
        minimum_amount: Optional[Decimal] = None,
    ) -> List[PublisherPayoutItem]:
        """
        Populate a batch with payout items for eligible publishers.

        Args:
            batch: The payout batch
            minimum_amount: Minimum amount for payout (default from settings)
        """
        if minimum_amount is None:
            minimum_amount = self.DEFAULT_MINIMUM_PAYOUT

        # Get all publishers with available balance >= minimum
        balances = self.db.query(PublisherBalance).filter(
            and_(
                PublisherBalance.available_balance >= minimum_amount,
                PublisherBalance.auto_payout_enabled == True,
            )
        ).all()

        items = []
        total_gross = Decimal("0.00")
        total_fees = Decimal("0.00")
        total_net = Decimal("0.00")

        for balance in balances:
            # Calculate payout details
            payout_data = self.calculate_publisher_payout(
                balance.publisher_id,
                batch.period_start,
                batch.period_end,
            )

            net_amount = balance.available_balance

            # Get publisher's payout method
            publisher = self.db.query(Publisher).filter(
                Publisher.id == balance.publisher_id
            ).first()

            payout_method = None
            payout_destination = None
            if publisher and publisher.payout_settings:
                payout_method = publisher.payout_settings.get("method")
                payout_destination = publisher.payout_settings.get("destination")

            item = PublisherPayoutItem(
                batch_id=batch.id,
                publisher_id=balance.publisher_id,
                gross_amount=net_amount,  # Already net after fees
                platform_fee=Decimal("0.00"),  # Already deducted
                adjustments=Decimal("0.00"),
                net_amount=net_amount,
                currency="USD",
                order_count=payout_data["order_count"],
                order_ids=payout_data["order_ids"],
                module_breakdown=payout_data["module_breakdown"],
                status="pending",
                payout_method=payout_method,
                payout_destination=payout_destination,
            )
            self.db.add(item)
            items.append(item)

            total_net += net_amount

        # Update batch totals
        batch.total_payouts = len(items)
        batch.total_gross_amount = total_gross
        batch.total_platform_fees = total_fees
        batch.total_net_amount = total_net
        batch.pending_count = len(items)

        self.db.commit()

        return items

    def approve_batch(
        self,
        batch_id: str,
        approved_by: int,
    ) -> PayoutBatch:
        """Approve a payout batch for processing."""
        batch = self.get_payout_batch(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != "draft":
            raise ValueError(f"Batch must be in draft status, current: {batch.status}")

        batch.status = "pending"
        batch.approved_by = approved_by
        batch.approved_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def process_batch(
        self,
        batch_id: str,
    ) -> PayoutBatch:
        """
        Process a payout batch.

        In production, this would integrate with payment providers.
        """
        batch = self.get_payout_batch(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != "pending":
            raise ValueError(f"Batch must be pending, current: {batch.status}")

        batch.status = "processing"
        batch.started_at = datetime.utcnow()
        self.db.commit()

        success_count = 0
        failed_count = 0
        errors = []

        for item in batch.payouts:
            try:
                # Process individual payout
                self._process_payout_item(item)
                item.status = "completed"
                item.processed_at = datetime.utcnow()
                success_count += 1
            except Exception as e:
                item.status = "failed"
                item.last_error = str(e)
                item.retry_count += 1
                failed_count += 1
                errors.append({
                    "publisher_id": item.publisher_id,
                    "error": str(e),
                })

        batch.success_count = success_count
        batch.failed_count = failed_count
        batch.pending_count = 0
        batch.error_summary = errors if errors else None

        if failed_count == 0:
            batch.status = "completed"
        elif success_count == 0:
            batch.status = "failed"
        else:
            batch.status = "completed"  # Partial success

        batch.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(batch)

        return batch

    def _process_payout_item(self, item: PublisherPayoutItem) -> None:
        """
        Process a single payout item.

        This is a stub - in production would integrate with Stripe/PayPal.
        """
        balance = self.get_or_create_balance(item.publisher_id)

        if balance.available_balance < item.net_amount:
            raise ValueError("Insufficient balance")

        # Deduct from available balance
        available_before = balance.available_balance
        balance.available_balance -= item.net_amount
        balance.lifetime_payouts += item.net_amount
        balance.last_payout_at = datetime.utcnow()

        # Record transaction
        transaction = BalanceTransaction(
            publisher_id=item.publisher_id,
            transaction_type="payout",
            amount=-item.net_amount,
            currency="USD",
            balance_type="available",
            balance_before=available_before,
            balance_after=balance.available_balance,
            reference_type="payout_item",
            reference_id=item.id,
            description=f"Payout batch {item.batch.batch_id}",
        )
        self.db.add(transaction)

        # In production: Call Stripe Connect or PayPal Payouts
        # item.stripe_transfer_id = stripe_result.id
        # item.stripe_payout_id = stripe_result.payout_id

    def cancel_batch(
        self,
        batch_id: str,
        reason: str,
    ) -> PayoutBatch:
        """Cancel a payout batch."""
        batch = self.get_payout_batch(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status not in ("draft", "pending"):
            raise ValueError(f"Cannot cancel batch in {batch.status} status")

        batch.status = "cancelled"
        batch.processing_notes = reason

        # Mark all items as cancelled
        for item in batch.payouts:
            item.status = "cancelled"

        self.db.commit()
        self.db.refresh(batch)
        return batch

    # ==================== Adjustments ====================

    def create_adjustment(
        self,
        publisher_id: int,
        adjustment_type: str,
        amount: Decimal,
        description: str,
        created_by: int,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        internal_notes: Optional[str] = None,
    ) -> PayoutAdjustment:
        """
        Create a payout adjustment.

        Args:
            publisher_id: Publisher ID
            adjustment_type: refund, chargeback, bonus, correction, fee
            amount: Amount (positive = credit, negative = debit)
            description: Public description
            created_by: User creating the adjustment
            reference_type: order, module, payout
            reference_id: Reference ID
            internal_notes: Internal notes
        """
        adjustment = PayoutAdjustment(
            publisher_id=publisher_id,
            adjustment_type=adjustment_type,
            amount=amount,
            currency="USD",
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            internal_notes=internal_notes,
            status="pending",
            created_by=created_by,
        )
        self.db.add(adjustment)
        self.db.commit()
        self.db.refresh(adjustment)

        return adjustment

    def approve_adjustment(
        self,
        adjustment_id: int,
        approved_by: int,
    ) -> PayoutAdjustment:
        """Approve and apply an adjustment."""
        adjustment = self.db.query(PayoutAdjustment).filter(
            PayoutAdjustment.id == adjustment_id
        ).first()

        if not adjustment:
            raise ValueError(f"Adjustment {adjustment_id} not found")

        if adjustment.status != "pending":
            raise ValueError(f"Adjustment already {adjustment.status}")

        # Apply the adjustment to balance
        balance = self.get_or_create_balance(adjustment.publisher_id)

        available_before = balance.available_balance
        balance.available_balance += adjustment.amount
        balance.lifetime_adjustments += adjustment.amount

        # Record transaction
        transaction = BalanceTransaction(
            publisher_id=adjustment.publisher_id,
            transaction_type="adjustment",
            amount=adjustment.amount,
            currency="USD",
            balance_type="available",
            balance_before=available_before,
            balance_after=balance.available_balance,
            reference_type="adjustment",
            reference_id=adjustment.id,
            description=f"{adjustment.adjustment_type}: {adjustment.description}",
        )
        self.db.add(transaction)

        adjustment.status = "applied"
        adjustment.approved_by = approved_by
        adjustment.approved_at = datetime.utcnow()
        adjustment.applied_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(adjustment)
        return adjustment

    def cancel_adjustment(
        self,
        adjustment_id: int,
    ) -> PayoutAdjustment:
        """Cancel a pending adjustment."""
        adjustment = self.db.query(PayoutAdjustment).filter(
            PayoutAdjustment.id == adjustment_id
        ).first()

        if not adjustment:
            raise ValueError(f"Adjustment {adjustment_id} not found")

        if adjustment.status != "pending":
            raise ValueError(f"Cannot cancel {adjustment.status} adjustment")

        adjustment.status = "cancelled"
        self.db.commit()
        self.db.refresh(adjustment)

        return adjustment

    def list_adjustments(
        self,
        publisher_id: Optional[int] = None,
        status: Optional[str] = None,
        adjustment_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PayoutAdjustment]:
        """List adjustments with filtering."""
        query = self.db.query(PayoutAdjustment).order_by(PayoutAdjustment.created_at.desc())

        if publisher_id:
            query = query.filter(PayoutAdjustment.publisher_id == publisher_id)
        if status:
            query = query.filter(PayoutAdjustment.status == status)
        if adjustment_type:
            query = query.filter(PayoutAdjustment.adjustment_type == adjustment_type)

        return query.offset(offset).limit(limit).all()

    # ==================== Transaction History ====================

    def get_transaction_history(
        self,
        publisher_id: int,
        transaction_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[BalanceTransaction]:
        """Get transaction history for a publisher."""
        query = self.db.query(BalanceTransaction).filter(
            BalanceTransaction.publisher_id == publisher_id
        ).order_by(BalanceTransaction.created_at.desc())

        if transaction_type:
            query = query.filter(BalanceTransaction.transaction_type == transaction_type)
        if start_date:
            query = query.filter(BalanceTransaction.created_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.filter(BalanceTransaction.created_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

        return query.offset(offset).limit(limit).all()

    def get_earnings_summary(
        self,
        publisher_id: int,
        period: str = "month",  # day, week, month, year
    ) -> Dict[str, Any]:
        """Get earnings summary for a publisher."""
        now = datetime.utcnow()

        if period == "day":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "month":
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:  # year
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get transactions for the period
        transactions = self.db.query(BalanceTransaction).filter(
            and_(
                BalanceTransaction.publisher_id == publisher_id,
                BalanceTransaction.created_at >= start_date,
            )
        ).all()

        earnings = sum(t.amount for t in transactions if t.transaction_type == "sale")
        payouts = abs(sum(t.amount for t in transactions if t.transaction_type == "payout"))
        adjustments = sum(t.amount for t in transactions if t.transaction_type == "adjustment")

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": now.isoformat(),
            "earnings": float(earnings),
            "payouts": float(payouts),
            "adjustments": float(adjustments),
            "net_change": float(earnings - payouts + adjustments),
            "transaction_count": len(transactions),
        }

    # ==================== Payout Schedule ====================

    def get_active_schedule(self) -> Optional[PayoutSchedule]:
        """Get the active payout schedule."""
        return self.db.query(PayoutSchedule).filter(
            PayoutSchedule.is_active == True
        ).first()

    def create_schedule(
        self,
        schedule_type: str,
        day_of_week: Optional[int] = None,
        day_of_month: Optional[int] = None,
        minimum_amount: Decimal = Decimal("50.00"),
        processing_hour: int = 9,
    ) -> PayoutSchedule:
        """Create a payout schedule."""
        # Deactivate existing schedules
        self.db.query(PayoutSchedule).update({"is_active": False})

        schedule = PayoutSchedule(
            schedule_type=schedule_type,
            day_of_week=day_of_week,
            day_of_month=day_of_month,
            minimum_amount=minimum_amount,
            processing_hour=processing_hour,
            is_active=True,
        )
        self.db.add(schedule)

        # Calculate next run
        schedule.next_run_at = self._calculate_next_run(schedule)

        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def _calculate_next_run(self, schedule: PayoutSchedule) -> datetime:
        """Calculate the next scheduled run time."""
        now = datetime.utcnow()

        if schedule.schedule_type == "weekly":
            # Find next occurrence of day_of_week
            days_ahead = schedule.day_of_week - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_date = now + timedelta(days=days_ahead)
        elif schedule.schedule_type == "biweekly":
            days_ahead = schedule.day_of_week - now.weekday()
            if days_ahead <= 0:
                days_ahead += 14
            next_date = now + timedelta(days=days_ahead)
        else:  # monthly
            if now.day < schedule.day_of_month:
                next_date = now.replace(day=schedule.day_of_month)
            else:
                # Next month
                if now.month == 12:
                    next_date = now.replace(year=now.year + 1, month=1, day=schedule.day_of_month)
                else:
                    next_date = now.replace(month=now.month + 1, day=schedule.day_of_month)

        return next_date.replace(hour=schedule.processing_hour, minute=0, second=0, microsecond=0)

    def run_scheduled_payout(self) -> Optional[PayoutBatch]:
        """
        Run a scheduled payout if due.

        Should be called by a cron job.
        """
        schedule = self.get_active_schedule()
        if not schedule:
            return None

        now = datetime.utcnow()
        if schedule.next_run_at and now < schedule.next_run_at:
            return None

        # Determine period
        if schedule.last_run_at:
            period_start = schedule.last_run_at.date()
        else:
            period_start = (now - timedelta(days=30)).date()
        period_end = now.date()

        # Create and populate batch
        batch = self.create_payout_batch(
            period_start=period_start,
            period_end=period_end,
            batch_type="regular",
        )

        self.populate_batch_items(batch, schedule.minimum_amount)

        if batch.total_payouts > 0:
            # Auto-approve scheduled batches
            batch.status = "pending"
            batch.approved_at = now

            # Process immediately
            self.process_batch(batch.batch_id)
        else:
            batch.status = "completed"
            batch.processing_notes = "No eligible publishers"

        # Update schedule
        schedule.last_run_at = now
        schedule.next_run_at = self._calculate_next_run(schedule)

        self.db.commit()
        return batch


def get_payout_service(db: Session) -> PayoutService:
    """Factory function for PayoutService."""
    return PayoutService(db)
