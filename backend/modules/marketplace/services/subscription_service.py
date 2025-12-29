"""
Subscription Service

Handles subscription lifecycle management including:
- Plan management
- Subscription creation, renewal, cancellation
- Invoice generation
- Usage tracking and metered billing
- Credit balance management
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import uuid
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..models.subscription import (
    SubscriptionPlan,
    Subscription,
    SubscriptionInvoice,
    InvoicePayment,
    SubscriptionUsage,
    CreditBalance,
    CreditTransaction,
    SubscriptionEvent,
    BillingCycle,
    SubscriptionStatus,
    InvoiceStatus,
)
from ..models.license import License

logger = logging.getLogger(__name__)


class SubscriptionService:
    """
    Service for managing subscriptions.

    Example:
        service = SubscriptionService(db)

        # Create a subscription
        subscription = service.create_subscription(
            user_id=1,
            plan_id=1,
            with_trial=True
        )

        # Generate invoice
        invoice = service.generate_invoice(subscription.id)

        # Record payment
        service.record_payment(invoice.id, amount=29.99, method="bank_transfer")
    """

    def __init__(self, db: Session):
        self.db = db

    # ==================== Plan Management ====================

    def create_plan(
        self,
        code: str,
        name: str,
        tier: str,
        billing_cycle: str,
        price: Decimal,
        **kwargs
    ) -> SubscriptionPlan:
        """Create a new subscription plan."""
        plan = SubscriptionPlan(
            code=code,
            name=name,
            tier=tier,
            billing_cycle=billing_cycle,
            price=price,
            **kwargs
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)

        logger.info(f"Created subscription plan: {plan.code}")
        return plan

    def get_plan(self, plan_id: int) -> Optional[SubscriptionPlan]:
        """Get a subscription plan by ID."""
        return self.db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == plan_id
        ).first()

    def get_plan_by_code(self, code: str) -> Optional[SubscriptionPlan]:
        """Get a subscription plan by code."""
        return self.db.query(SubscriptionPlan).filter(
            SubscriptionPlan.code == code
        ).first()

    def list_plans(
        self,
        module_id: Optional[int] = None,
        tier: Optional[str] = None,
        billing_cycle: Optional[str] = None,
        active_only: bool = True,
        is_public: bool = True,
    ) -> List[SubscriptionPlan]:
        """List subscription plans with filters."""
        query = self.db.query(SubscriptionPlan)

        if module_id is not None:
            query = query.filter(SubscriptionPlan.module_id == module_id)
        if tier:
            query = query.filter(SubscriptionPlan.tier == tier)
        if billing_cycle:
            query = query.filter(SubscriptionPlan.billing_cycle == billing_cycle)
        if active_only:
            query = query.filter(SubscriptionPlan.is_active == True)
        if is_public:
            query = query.filter(SubscriptionPlan.is_public == True)

        return query.order_by(
            SubscriptionPlan.sort_order,
            SubscriptionPlan.price
        ).all()

    def update_plan(self, plan_id: int, **updates) -> Optional[SubscriptionPlan]:
        """Update a subscription plan."""
        plan = self.get_plan(plan_id)
        if not plan:
            return None

        for key, value in updates.items():
            if hasattr(plan, key):
                setattr(plan, key, value)

        self.db.commit()
        self.db.refresh(plan)
        return plan

    # ==================== Subscription Management ====================

    def create_subscription(
        self,
        plan_id: int,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        module_id: Optional[int] = None,
        with_trial: bool = False,
        billing_email: Optional[str] = None,
        billing_name: Optional[str] = None,
        billing_address: Optional[Dict] = None,
        extra_data: Optional[Dict] = None,
    ) -> Subscription:
        """
        Create a new subscription.

        Args:
            plan_id: The subscription plan ID
            user_id: User ID (either user_id or company_id required)
            company_id: Company ID (either user_id or company_id required)
            module_id: Optional module ID for module-specific subscriptions
            with_trial: Whether to start with a trial period
            billing_email: Billing contact email
            billing_name: Billing contact name
            billing_address: Billing address dict
            extra_data: Additional custom data

        Returns:
            The created subscription
        """
        if not user_id and not company_id:
            raise ValueError("Either user_id or company_id is required")

        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        if not plan.is_active:
            raise ValueError(f"Plan {plan.code} is not active")

        # Calculate period dates
        today = date.today()
        period_end = self._calculate_period_end(today, plan.billing_cycle)

        # Determine initial status
        status = SubscriptionStatus.ACTIVE.value
        trial_start = None
        trial_end = None

        if with_trial and plan.has_trial and plan.trial_days > 0:
            status = SubscriptionStatus.TRIALING.value
            trial_start = today
            trial_end = today + timedelta(days=plan.trial_days)

        subscription = Subscription(
            user_id=user_id,
            company_id=company_id,
            plan_id=plan_id,
            module_id=module_id or plan.module_id,
            status=status,
            billing_cycle=plan.billing_cycle,
            current_period_start=today,
            current_period_end=trial_end or period_end,
            trial_start=trial_start,
            trial_end=trial_end,
            unit_price=plan.price,
            currency=plan.currency,
            billing_email=billing_email,
            billing_name=billing_name,
            billing_address=billing_address,
            extra_data=extra_data or {},
        )

        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)

        # Log event
        self._log_event(
            subscription.id,
            "created",
            {"plan_id": plan_id, "with_trial": with_trial},
            triggered_by="user",
            triggered_by_user_id=user_id
        )

        if with_trial:
            self._log_event(
                subscription.id,
                "trial_started",
                {"trial_days": plan.trial_days, "trial_end": str(trial_end)},
                triggered_by="system"
            )

        # Create license if module-specific
        if subscription.module_id:
            self._create_subscription_license(subscription)

        logger.info(f"Created subscription {subscription.subscription_id}")
        return subscription

    def get_subscription(self, subscription_id: int) -> Optional[Subscription]:
        """Get a subscription by ID."""
        return self.db.query(Subscription).filter(
            Subscription.id == subscription_id
        ).first()

    def get_subscription_by_subscription_id(
        self, subscription_id: str
    ) -> Optional[Subscription]:
        """Get a subscription by subscription_id string."""
        return self.db.query(Subscription).filter(
            Subscription.subscription_id == subscription_id
        ).first()

    def list_subscriptions(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        module_id: Optional[int] = None,
        status: Optional[str] = None,
        include_inactive: bool = False,
    ) -> List[Subscription]:
        """List subscriptions with filters."""
        query = self.db.query(Subscription)

        if user_id:
            query = query.filter(Subscription.user_id == user_id)
        if company_id:
            query = query.filter(Subscription.company_id == company_id)
        if module_id:
            query = query.filter(Subscription.module_id == module_id)
        if status:
            query = query.filter(Subscription.status == status)
        elif not include_inactive:
            query = query.filter(Subscription.status.in_([
                SubscriptionStatus.ACTIVE.value,
                SubscriptionStatus.TRIALING.value,
                SubscriptionStatus.PAST_DUE.value,
            ]))

        return query.order_by(Subscription.created_at.desc()).all()

    def cancel_subscription(
        self,
        subscription_id: int,
        cancel_immediately: bool = False,
        reason: Optional[str] = None,
        cancelled_by_user_id: Optional[int] = None,
    ) -> Subscription:
        """
        Cancel a subscription.

        Args:
            subscription_id: Subscription ID
            cancel_immediately: If True, cancel now. If False, cancel at period end
            reason: Cancellation reason
            cancelled_by_user_id: User who cancelled

        Returns:
            Updated subscription
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        if subscription.status == SubscriptionStatus.CANCELLED.value:
            raise ValueError("Subscription is already cancelled")

        subscription.cancelled_at = datetime.utcnow()
        subscription.cancellation_reason = reason

        if cancel_immediately:
            subscription.status = SubscriptionStatus.CANCELLED.value
            # Expire associated license
            if subscription.license_id:
                self._expire_license(subscription.license_id)
        else:
            subscription.cancel_at_period_end = True

        self.db.commit()
        self.db.refresh(subscription)

        self._log_event(
            subscription_id,
            "cancelled",
            {
                "immediate": cancel_immediately,
                "reason": reason,
                "effective_date": str(
                    date.today() if cancel_immediately
                    else subscription.current_period_end
                )
            },
            triggered_by="user" if cancelled_by_user_id else "system",
            triggered_by_user_id=cancelled_by_user_id
        )

        logger.info(
            f"Cancelled subscription {subscription.subscription_id} "
            f"(immediate={cancel_immediately})"
        )
        return subscription

    def pause_subscription(
        self,
        subscription_id: int,
        resume_at: Optional[date] = None,
        paused_by_user_id: Optional[int] = None,
    ) -> Subscription:
        """
        Pause a subscription.

        Args:
            subscription_id: Subscription ID
            resume_at: Optional date to automatically resume
            paused_by_user_id: User who paused

        Returns:
            Updated subscription
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.ACTIVE.value:
            raise ValueError("Only active subscriptions can be paused")

        subscription.status = SubscriptionStatus.PAUSED.value
        subscription.paused_at = datetime.utcnow()
        subscription.resume_at = resume_at

        self.db.commit()
        self.db.refresh(subscription)

        self._log_event(
            subscription_id,
            "paused",
            {"resume_at": str(resume_at) if resume_at else None},
            triggered_by="user" if paused_by_user_id else "system",
            triggered_by_user_id=paused_by_user_id
        )

        logger.info(f"Paused subscription {subscription.subscription_id}")
        return subscription

    def resume_subscription(
        self,
        subscription_id: int,
        resumed_by_user_id: Optional[int] = None,
    ) -> Subscription:
        """Resume a paused subscription."""
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.PAUSED.value:
            raise ValueError("Only paused subscriptions can be resumed")

        subscription.status = SubscriptionStatus.ACTIVE.value
        subscription.paused_at = None
        subscription.resume_at = None

        self.db.commit()
        self.db.refresh(subscription)

        self._log_event(
            subscription_id,
            "resumed",
            {},
            triggered_by="user" if resumed_by_user_id else "system",
            triggered_by_user_id=resumed_by_user_id
        )

        logger.info(f"Resumed subscription {subscription.subscription_id}")
        return subscription

    def change_plan(
        self,
        subscription_id: int,
        new_plan_id: int,
        prorate: bool = True,
        changed_by_user_id: Optional[int] = None,
    ) -> Tuple[Subscription, Optional[SubscriptionInvoice]]:
        """
        Change subscription plan (upgrade/downgrade).

        Args:
            subscription_id: Subscription ID
            new_plan_id: New plan ID
            prorate: Whether to prorate for the remaining period
            changed_by_user_id: User who made the change

        Returns:
            Tuple of (updated subscription, prorated invoice if any)
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        new_plan = self.get_plan(new_plan_id)
        if not new_plan:
            raise ValueError(f"Plan {new_plan_id} not found")

        old_plan_id = subscription.plan_id
        old_price = subscription.unit_price

        # Calculate proration if upgrading
        prorated_invoice = None
        if prorate and new_plan.price > old_price:
            days_remaining = (subscription.current_period_end - date.today()).days
            total_days = self._get_period_days(subscription.billing_cycle)

            if days_remaining > 0 and total_days > 0:
                daily_diff = (new_plan.price - old_price) / total_days
                prorate_amount = daily_diff * days_remaining

                if prorate_amount > 0:
                    prorated_invoice = self._create_prorated_invoice(
                        subscription, prorate_amount, "Plan upgrade proration"
                    )

        # Update subscription
        subscription.plan_id = new_plan_id
        subscription.unit_price = new_plan.price
        subscription.billing_cycle = new_plan.billing_cycle

        self.db.commit()
        self.db.refresh(subscription)

        event_type = "upgraded" if new_plan.price > old_price else "downgraded"
        self._log_event(
            subscription_id,
            event_type,
            {
                "previous_plan_id": old_plan_id,
                "new_plan_id": new_plan_id,
                "prorated_amount": float(prorated_invoice.total) if prorated_invoice else 0
            },
            triggered_by="user" if changed_by_user_id else "system",
            triggered_by_user_id=changed_by_user_id
        )

        logger.info(
            f"{event_type.capitalize()} subscription {subscription.subscription_id} "
            f"from plan {old_plan_id} to {new_plan_id}"
        )
        return subscription, prorated_invoice

    def renew_subscription(self, subscription_id: int) -> Tuple[Subscription, SubscriptionInvoice]:
        """
        Renew a subscription for the next period.

        Args:
            subscription_id: Subscription ID

        Returns:
            Tuple of (renewed subscription, invoice for new period)
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        if subscription.cancel_at_period_end:
            subscription.status = SubscriptionStatus.CANCELLED.value
            self.db.commit()
            self._log_event(subscription_id, "expired", {}, triggered_by="system")
            raise ValueError("Subscription was set to cancel at period end")

        # Update period
        old_period_end = subscription.current_period_end
        subscription.current_period_start = old_period_end
        subscription.current_period_end = self._calculate_period_end(
            old_period_end, subscription.billing_cycle
        )

        # End trial if it was in trial
        if subscription.status == SubscriptionStatus.TRIALING.value:
            subscription.status = SubscriptionStatus.ACTIVE.value
            self._log_event(subscription_id, "trial_ended", {}, triggered_by="system")

        self.db.commit()
        self.db.refresh(subscription)

        # Generate invoice for new period
        invoice = self.generate_invoice(subscription_id)

        self._log_event(
            subscription_id,
            "renewed",
            {
                "new_period_start": str(subscription.current_period_start),
                "new_period_end": str(subscription.current_period_end),
                "invoice_id": invoice.id
            },
            triggered_by="system"
        )

        logger.info(f"Renewed subscription {subscription.subscription_id}")
        return subscription, invoice

    # ==================== Invoice Management ====================

    def generate_invoice(
        self,
        subscription_id: int,
        include_usage: bool = True,
    ) -> SubscriptionInvoice:
        """
        Generate an invoice for a subscription.

        Args:
            subscription_id: Subscription ID
            include_usage: Whether to include metered usage

        Returns:
            Generated invoice
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        plan = subscription.plan

        # Build line items
        line_items = []

        # Base subscription
        line_items.append({
            "description": f"{plan.name}",
            "quantity": 1,
            "unit_price": float(subscription.unit_price),
            "amount": float(subscription.unit_price),
            "type": "subscription"
        })

        # Add metered usage if applicable
        usage_amount = Decimal("0.00")
        if include_usage and plan.is_metered:
            usage_items, usage_total = self._calculate_usage_charges(subscription)
            line_items.extend(usage_items)
            usage_amount = usage_total

        subtotal = subscription.unit_price + usage_amount
        discount_amount = subtotal * (subscription.discount_percent / 100)
        total = subtotal - discount_amount

        # Generate invoice number
        invoice_number = self._generate_invoice_number()

        invoice = SubscriptionInvoice(
            invoice_number=invoice_number,
            subscription_id=subscription_id,
            user_id=subscription.user_id,
            company_id=subscription.company_id,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
            line_items=line_items,
            subtotal=subtotal,
            discount_amount=discount_amount,
            total=total,
            amount_due=total,
            currency=subscription.currency,
            status=InvoiceStatus.PENDING.value,
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=14),
            billing_name=subscription.billing_name,
            billing_email=subscription.billing_email,
            billing_address=subscription.billing_address,
        )

        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        # Mark usage as billed
        if include_usage:
            self._mark_usage_billed(subscription_id, invoice.id)

        logger.info(f"Generated invoice {invoice.invoice_number}")
        return invoice

    def get_invoice(self, invoice_id: int) -> Optional[SubscriptionInvoice]:
        """Get an invoice by ID."""
        return self.db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.id == invoice_id
        ).first()

    def get_invoice_by_number(self, invoice_number: str) -> Optional[SubscriptionInvoice]:
        """Get an invoice by number."""
        return self.db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.invoice_number == invoice_number
        ).first()

    def list_invoices(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        subscription_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SubscriptionInvoice]:
        """List invoices with filters."""
        query = self.db.query(SubscriptionInvoice)

        if user_id:
            query = query.filter(SubscriptionInvoice.user_id == user_id)
        if company_id:
            query = query.filter(SubscriptionInvoice.company_id == company_id)
        if subscription_id:
            query = query.filter(SubscriptionInvoice.subscription_id == subscription_id)
        if status:
            query = query.filter(SubscriptionInvoice.status == status)

        return query.order_by(
            SubscriptionInvoice.issue_date.desc()
        ).offset(offset).limit(limit).all()

    def record_payment(
        self,
        invoice_id: int,
        amount: Decimal,
        payment_method: str,
        payment_reference: Optional[str] = None,
        payment_date: Optional[date] = None,
        notes: Optional[str] = None,
        recorded_by: Optional[int] = None,
    ) -> InvoicePayment:
        """
        Record a payment for an invoice.

        Args:
            invoice_id: Invoice ID
            amount: Payment amount
            payment_method: Payment method (bank_transfer, check, cash, credit_balance)
            payment_reference: Reference number
            payment_date: Date of payment (defaults to today)
            notes: Payment notes
            recorded_by: User ID who recorded the payment

        Returns:
            Created payment record
        """
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        payment = InvoicePayment(
            invoice_id=invoice_id,
            amount=amount,
            currency=invoice.currency,
            payment_method=payment_method,
            payment_reference=payment_reference,
            payment_date=payment_date or date.today(),
            notes=notes,
            recorded_by=recorded_by,
        )

        self.db.add(payment)

        # Update invoice
        invoice.amount_paid = (invoice.amount_paid or Decimal("0.00")) + amount
        invoice.amount_due = invoice.total - invoice.amount_paid

        if invoice.amount_due <= 0:
            invoice.status = InvoiceStatus.PAID.value
            invoice.paid_at = datetime.utcnow()
            invoice.payment_method = payment_method
            invoice.payment_reference = payment_reference

            # Update subscription status if it was past due
            if invoice.subscription:
                subscription = invoice.subscription
                if subscription.status == SubscriptionStatus.PAST_DUE.value:
                    subscription.status = SubscriptionStatus.ACTIVE.value

                self._log_event(
                    subscription.id,
                    "payment_succeeded",
                    {"invoice_id": invoice_id, "amount": float(amount)},
                    triggered_by="user" if recorded_by else "system",
                    triggered_by_user_id=recorded_by
                )

        self.db.commit()
        self.db.refresh(payment)

        logger.info(f"Recorded payment of {amount} for invoice {invoice.invoice_number}")
        return payment

    def pay_with_credit(
        self,
        invoice_id: int,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> InvoicePayment:
        """Pay an invoice using credit balance."""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Get credit balance
        balance = self.get_credit_balance(user_id=user_id, company_id=company_id)
        if not balance or balance.balance < invoice.amount_due:
            raise ValueError("Insufficient credit balance")

        # Deduct from credit
        self.add_credit_transaction(
            balance_id=balance.id,
            transaction_type="debit",
            amount=-invoice.amount_due,
            reference_type="invoice",
            reference_id=invoice_id,
            description=f"Payment for invoice {invoice.invoice_number}"
        )

        # Record payment
        return self.record_payment(
            invoice_id=invoice_id,
            amount=invoice.amount_due,
            payment_method="credit_balance",
            notes="Paid using credit balance"
        )

    # ==================== Usage Tracking ====================

    def record_usage(
        self,
        subscription_id: int,
        metric: str,
        quantity: Decimal,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
    ) -> SubscriptionUsage:
        """
        Record usage for metered billing.

        Args:
            subscription_id: Subscription ID
            metric: Usage metric (e.g., "api_calls", "storage_gb")
            quantity: Usage quantity
            period_start: Start of usage period (defaults to current period)
            period_end: End of usage period (defaults to current period)

        Returns:
            Usage record
        """
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        plan = subscription.plan
        if not plan.is_metered:
            raise ValueError("Subscription plan does not support metered billing")

        period_start = period_start or subscription.current_period_start
        period_end = period_end or subscription.current_period_end

        # Check if record exists for this period
        existing = self.db.query(SubscriptionUsage).filter(
            and_(
                SubscriptionUsage.subscription_id == subscription_id,
                SubscriptionUsage.metric == metric,
                SubscriptionUsage.period_start == period_start,
                SubscriptionUsage.period_end == period_end,
            )
        ).first()

        if existing:
            # Update existing record
            existing.quantity = existing.quantity + quantity
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # Create new record
        usage = SubscriptionUsage(
            subscription_id=subscription_id,
            metric=metric,
            period_start=period_start,
            period_end=period_end,
            quantity=quantity,
            unit_price=plan.metered_unit_price,
            included_quantity=Decimal(plan.metered_included or 0),
        )

        self.db.add(usage)
        self.db.commit()
        self.db.refresh(usage)

        # Update subscription usage summary
        current_usage = subscription.current_usage or {}
        current_usage[metric] = float(usage.quantity)
        current_usage["last_updated"] = datetime.utcnow().isoformat()
        subscription.current_usage = current_usage
        self.db.commit()

        return usage

    def get_usage_summary(
        self,
        subscription_id: int,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get usage summary for a subscription."""
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        period_start = period_start or subscription.current_period_start
        period_end = period_end or subscription.current_period_end

        usage_records = self.db.query(SubscriptionUsage).filter(
            and_(
                SubscriptionUsage.subscription_id == subscription_id,
                SubscriptionUsage.period_start >= period_start,
                SubscriptionUsage.period_end <= period_end,
            )
        ).all()

        summary = {}
        for record in usage_records:
            if record.metric not in summary:
                summary[record.metric] = {
                    "total_quantity": Decimal("0"),
                    "included_quantity": record.included_quantity or Decimal("0"),
                    "billable_quantity": Decimal("0"),
                    "unit_price": record.unit_price,
                    "total_amount": Decimal("0"),
                }

            summary[record.metric]["total_quantity"] += record.quantity
            billable = max(
                Decimal("0"),
                record.quantity - (record.included_quantity or Decimal("0"))
            )
            summary[record.metric]["billable_quantity"] += billable
            if record.unit_price:
                summary[record.metric]["total_amount"] += billable * record.unit_price

        return {
            "period_start": period_start,
            "period_end": period_end,
            "metrics": summary,
        }

    # ==================== Credit Balance ====================

    def get_or_create_credit_balance(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> CreditBalance:
        """Get or create credit balance for user/company."""
        if not user_id and not company_id:
            raise ValueError("Either user_id or company_id is required")

        query = self.db.query(CreditBalance)
        if user_id:
            query = query.filter(CreditBalance.user_id == user_id)
        else:
            query = query.filter(CreditBalance.company_id == company_id)

        balance = query.first()

        if not balance:
            balance = CreditBalance(
                user_id=user_id,
                company_id=company_id,
                balance=Decimal("0.00"),
            )
            self.db.add(balance)
            self.db.commit()
            self.db.refresh(balance)

        return balance

    def get_credit_balance(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> Optional[CreditBalance]:
        """Get credit balance for user/company."""
        query = self.db.query(CreditBalance)
        if user_id:
            query = query.filter(CreditBalance.user_id == user_id)
        elif company_id:
            query = query.filter(CreditBalance.company_id == company_id)
        else:
            return None

        return query.first()

    def add_credit_transaction(
        self,
        balance_id: int,
        transaction_type: str,
        amount: Decimal,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None,
        extra_data: Optional[Dict] = None,
    ) -> CreditTransaction:
        """
        Add a credit transaction.

        Args:
            balance_id: Credit balance ID
            transaction_type: credit, debit, refund, adjustment
            amount: Amount (positive for credit, negative for debit)
            reference_type: Type of reference (invoice, subscription, etc.)
            reference_id: Reference ID
            description: Transaction description
            extra_data: Additional custom data

        Returns:
            Created transaction
        """
        balance = self.db.query(CreditBalance).filter(
            CreditBalance.id == balance_id
        ).first()

        if not balance:
            raise ValueError(f"Credit balance {balance_id} not found")

        balance_before = balance.balance
        balance.balance = balance.balance + amount
        balance_after = balance.balance

        if transaction_type == "credit":
            balance.total_credits = balance.total_credits + abs(amount)
        elif transaction_type == "debit":
            balance.total_debits = balance.total_debits + abs(amount)

        transaction = CreditTransaction(
            balance_id=balance_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            currency=balance.currency,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            extra_data=extra_data or {},
        )

        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        logger.info(
            f"Credit transaction: {transaction_type} {amount} "
            f"(balance: {balance_before} -> {balance_after})"
        )
        return transaction

    def add_credits(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        amount: Decimal = Decimal("0.00"),
        description: Optional[str] = None,
    ) -> CreditTransaction:
        """Add credits to a user/company account."""
        balance = self.get_or_create_credit_balance(user_id, company_id)
        return self.add_credit_transaction(
            balance_id=balance.id,
            transaction_type="credit",
            amount=abs(amount),
            description=description or "Credit added",
        )

    def get_credit_transactions(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CreditTransaction]:
        """Get credit transactions for a user/company."""
        balance = self.get_credit_balance(user_id=user_id, company_id=company_id)
        if not balance:
            return []

        return self.db.query(CreditTransaction).filter(
            CreditTransaction.balance_id == balance.id
        ).order_by(
            CreditTransaction.created_at.desc()
        ).offset(offset).limit(limit).all()

    # ==================== API Convenience Methods ====================

    def get_user_subscriptions(
        self,
        user_id: int,
        status: Optional[str] = None,
    ) -> List[Subscription]:
        """Get subscriptions for a user (API convenience method)."""
        return self.list_subscriptions(user_id=user_id, status=status)

    def get_subscription_invoices(
        self,
        subscription_id: int,
        status: Optional[str] = None,
    ) -> List[SubscriptionInvoice]:
        """Get invoices for a subscription (API convenience method)."""
        return self.list_invoices(subscription_id=subscription_id, status=status)

    def get_subscription_usage(
        self,
        subscription_id: int,
        metric: Optional[str] = None,
        billed: Optional[bool] = None,
    ) -> List[SubscriptionUsage]:
        """Get usage records for a subscription."""
        subscription = self.get_subscription(subscription_id)
        if not subscription:
            return []

        query = self.db.query(SubscriptionUsage).filter(
            SubscriptionUsage.subscription_id == subscription_id
        )

        if metric:
            query = query.filter(SubscriptionUsage.metric == metric)
        if billed is not None:
            query = query.filter(SubscriptionUsage.billed == billed)

        return query.order_by(SubscriptionUsage.recorded_at.desc()).all()

    # ==================== Helper Methods ====================

    def _calculate_period_end(self, start_date: date, billing_cycle: str) -> date:
        """Calculate period end date based on billing cycle."""
        if billing_cycle == BillingCycle.MONTHLY.value:
            return start_date + timedelta(days=30)
        elif billing_cycle == BillingCycle.QUARTERLY.value:
            return start_date + timedelta(days=90)
        elif billing_cycle == BillingCycle.SEMI_ANNUAL.value:
            return start_date + timedelta(days=180)
        elif billing_cycle == BillingCycle.ANNUAL.value:
            return start_date + timedelta(days=365)
        elif billing_cycle == BillingCycle.LIFETIME.value:
            return date(2099, 12, 31)  # Far future
        else:
            return start_date + timedelta(days=30)

    def _get_period_days(self, billing_cycle: str) -> int:
        """Get number of days in billing cycle."""
        cycle_days = {
            BillingCycle.MONTHLY.value: 30,
            BillingCycle.QUARTERLY.value: 90,
            BillingCycle.SEMI_ANNUAL.value: 180,
            BillingCycle.ANNUAL.value: 365,
            BillingCycle.LIFETIME.value: 36500,
        }
        return cycle_days.get(billing_cycle, 30)

    def _generate_invoice_number(self) -> str:
        """Generate a unique invoice number."""
        year = date.today().year
        # Get count of invoices this year
        count = self.db.query(func.count(SubscriptionInvoice.id)).filter(
            SubscriptionInvoice.invoice_number.like(f"INV-{year}-%")
        ).scalar()
        return f"INV-{year}-{(count or 0) + 1:05d}"

    def _create_subscription_license(self, subscription: Subscription) -> License:
        """Create a license for a subscription."""
        import secrets

        license = License(
            license_key=secrets.token_hex(32),
            user_id=subscription.user_id,
            module_id=subscription.module_id,
            order_id=None,
            license_type="subscription",
            tier=subscription.plan.tier if subscription.plan else None,
            status="active",
            issued_at=datetime.utcnow(),
            expires_at=datetime.combine(
                subscription.current_period_end,
                datetime.min.time()
            ),
            max_instances=subscription.plan.max_instances if subscription.plan else 1,
            max_users=subscription.plan.max_users if subscription.plan else None,
            subscription_id=subscription.subscription_id,
            subscription_status=subscription.status,
            subscription_period_start=datetime.combine(
                subscription.current_period_start,
                datetime.min.time()
            ),
            subscription_period_end=datetime.combine(
                subscription.current_period_end,
                datetime.min.time()
            ),
        )

        self.db.add(license)
        self.db.commit()
        self.db.refresh(license)

        subscription.license_id = license.id
        self.db.commit()

        return license

    def _expire_license(self, license_id: int):
        """Expire a license."""
        license = self.db.query(License).filter(License.id == license_id).first()
        if license:
            license.status = "expired"
            license.subscription_status = "cancelled"
            self.db.commit()

    def _calculate_usage_charges(
        self, subscription: Subscription
    ) -> Tuple[List[Dict], Decimal]:
        """Calculate usage charges for metered billing."""
        usage_records = self.db.query(SubscriptionUsage).filter(
            and_(
                SubscriptionUsage.subscription_id == subscription.id,
                SubscriptionUsage.period_start >= subscription.current_period_start,
                SubscriptionUsage.period_end <= subscription.current_period_end,
                SubscriptionUsage.billed == False,
            )
        ).all()

        line_items = []
        total = Decimal("0.00")

        for record in usage_records:
            billable = max(
                Decimal("0"),
                record.quantity - (record.included_quantity or Decimal("0"))
            )
            if billable > 0 and record.unit_price:
                amount = billable * record.unit_price
                line_items.append({
                    "description": f"Usage: {record.metric} ({billable} units)",
                    "quantity": float(billable),
                    "unit_price": float(record.unit_price),
                    "amount": float(amount),
                    "type": "usage"
                })
                total += amount

        return line_items, total

    def _mark_usage_billed(self, subscription_id: int, invoice_id: int):
        """Mark usage records as billed."""
        self.db.query(SubscriptionUsage).filter(
            and_(
                SubscriptionUsage.subscription_id == subscription_id,
                SubscriptionUsage.billed == False,
            )
        ).update({
            SubscriptionUsage.billed: True,
            SubscriptionUsage.invoice_id: invoice_id,
        })
        self.db.commit()

    def _create_prorated_invoice(
        self,
        subscription: Subscription,
        amount: Decimal,
        description: str,
    ) -> SubscriptionInvoice:
        """Create a prorated invoice for plan changes."""
        invoice_number = self._generate_invoice_number()

        invoice = SubscriptionInvoice(
            invoice_number=invoice_number,
            subscription_id=subscription.id,
            user_id=subscription.user_id,
            company_id=subscription.company_id,
            period_start=date.today(),
            period_end=subscription.current_period_end,
            line_items=[{
                "description": description,
                "quantity": 1,
                "unit_price": float(amount),
                "amount": float(amount),
                "type": "proration"
            }],
            subtotal=amount,
            total=amount,
            amount_due=amount,
            currency=subscription.currency,
            status=InvoiceStatus.PENDING.value,
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=7),
            billing_name=subscription.billing_name,
            billing_email=subscription.billing_email,
            billing_address=subscription.billing_address,
        )

        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def _log_event(
        self,
        subscription_id: int,
        event_type: str,
        data: Dict,
        triggered_by: str = "system",
        triggered_by_user_id: Optional[int] = None,
    ):
        """Log a subscription event."""
        event = SubscriptionEvent(
            subscription_id=subscription_id,
            event_type=event_type,
            data=data,
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id,
        )
        self.db.add(event)
        self.db.commit()

    # ==================== Batch Operations ====================

    def process_renewals(self) -> List[Tuple[Subscription, SubscriptionInvoice]]:
        """
        Process all subscriptions due for renewal.

        Returns:
            List of (subscription, invoice) tuples for renewed subscriptions
        """
        today = date.today()

        # Find subscriptions that need renewal
        due_subscriptions = self.db.query(Subscription).filter(
            and_(
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE.value,
                    SubscriptionStatus.TRIALING.value,
                ]),
                Subscription.current_period_end <= today,
                Subscription.auto_renew == True,
                Subscription.cancel_at_period_end == False,
            )
        ).all()

        results = []
        for subscription in due_subscriptions:
            try:
                renewed, invoice = self.renew_subscription(subscription.id)
                results.append((renewed, invoice))
            except Exception as e:
                logger.error(
                    f"Failed to renew subscription {subscription.subscription_id}: {e}"
                )
                # Mark as past due
                subscription.status = SubscriptionStatus.PAST_DUE.value
                self.db.commit()
                self._log_event(
                    subscription.id,
                    "payment_failed",
                    {"error": str(e)},
                    triggered_by="system"
                )

        return results

    def process_expired_trials(self) -> List[Subscription]:
        """
        Process expired trial subscriptions.

        Returns:
            List of subscriptions that were transitioned from trial
        """
        today = date.today()

        trial_subscriptions = self.db.query(Subscription).filter(
            and_(
                Subscription.status == SubscriptionStatus.TRIALING.value,
                Subscription.trial_end <= today,
            )
        ).all()

        results = []
        for subscription in trial_subscriptions:
            self._log_event(subscription.id, "trial_ended", {}, triggered_by="system")

            if subscription.auto_renew:
                # Transition to active and generate invoice
                subscription.status = SubscriptionStatus.ACTIVE.value
                subscription.current_period_start = subscription.trial_end
                subscription.current_period_end = self._calculate_period_end(
                    subscription.trial_end,
                    subscription.billing_cycle
                )
                self.db.commit()

                self.generate_invoice(subscription.id)
                self._log_event(
                    subscription.id, "activated",
                    {"from_trial": True},
                    triggered_by="system"
                )
            else:
                # Cancel subscription
                subscription.status = SubscriptionStatus.EXPIRED.value
                self.db.commit()
                self._log_event(
                    subscription.id, "expired",
                    {"reason": "trial_not_converted"},
                    triggered_by="system"
                )

            results.append(subscription)

        return results

    def mark_overdue_invoices(self) -> List[SubscriptionInvoice]:
        """Mark pending invoices past due date as overdue."""
        today = date.today()

        overdue_invoices = self.db.query(SubscriptionInvoice).filter(
            and_(
                SubscriptionInvoice.status == InvoiceStatus.PENDING.value,
                SubscriptionInvoice.due_date < today,
            )
        ).all()

        for invoice in overdue_invoices:
            invoice.status = InvoiceStatus.OVERDUE.value

            # Mark subscription as past due
            if invoice.subscription:
                invoice.subscription.status = SubscriptionStatus.PAST_DUE.value
                self._log_event(
                    invoice.subscription.id,
                    "payment_failed",
                    {"invoice_id": invoice.id, "reason": "overdue"},
                    triggered_by="system"
                )

        self.db.commit()
        return overdue_invoices


def get_subscription_service(db: Session) -> SubscriptionService:
    """Dependency for getting subscription service."""
    return SubscriptionService(db)
