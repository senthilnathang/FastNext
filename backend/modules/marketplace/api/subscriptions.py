"""
Marketplace Subscription API Endpoints

Subscription management, plans, invoices, and billing.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..services.subscription_service import SubscriptionService
from ..models.subscription import (
    BillingCycle,
    SubscriptionStatus,
    InvoiceStatus,
)


router = APIRouter(prefix="/subscriptions", tags=["Marketplace Subscriptions"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class PlanResponse(BaseModel):
    """Subscription plan response."""
    id: int
    code: str
    name: str
    description: Optional[str]
    tier: str
    billing_cycle: str
    price: float
    currency: str
    features: Dict[str, Any]
    limits: Dict[str, Any]
    has_trial: bool
    trial_days: int
    is_popular: bool
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    """Subscription response."""
    id: int
    plan_id: int
    plan_code: Optional[str]
    plan_name: Optional[str]
    status: str
    billing_cycle: str
    current_period_start: str
    current_period_end: str
    trial_start: Optional[str]
    trial_end: Optional[str]
    cancel_at_period_end: bool
    cancelled_at: Optional[str]
    paused_at: Optional[str]
    resume_at: Optional[str]
    quantity: int
    amount: float
    currency: str
    created_at: str

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Invoice response."""
    id: int
    invoice_number: str
    subscription_id: int
    status: str
    subtotal: float
    discount_amount: float
    tax_amount: float
    total: float
    currency: str
    period_start: str
    period_end: str
    due_date: str
    paid_at: Optional[str]
    line_items: List[Dict[str, Any]]
    created_at: str

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    """Payment response."""
    id: int
    invoice_id: int
    amount: float
    currency: str
    payment_method: str
    status: str
    transaction_id: Optional[str]
    paid_at: str

    class Config:
        from_attributes = True


class CreditBalanceResponse(BaseModel):
    """Credit balance response."""
    id: int
    balance: float
    currency: str
    updated_at: str

    class Config:
        from_attributes = True


class CreditTransactionResponse(BaseModel):
    """Credit transaction response."""
    id: int
    transaction_type: str
    amount: float
    balance_after: float
    currency: str
    description: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[int]
    created_at: str

    class Config:
        from_attributes = True


class UsageResponse(BaseModel):
    """Usage record response."""
    id: int
    metric: str
    quantity: float
    unit_price: Optional[float]
    total_price: Optional[float]
    recorded_at: str
    billed: bool

    class Config:
        from_attributes = True


class CreatePlanRequest(BaseModel):
    """Create subscription plan request."""
    code: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    tier: str = Field(default="standard")
    billing_cycle: str = Field(default="monthly")
    price: float = Field(..., ge=0)
    currency: str = Field(default="USD", max_length=3)
    features: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None
    has_trial: bool = False
    trial_days: int = Field(default=0, ge=0)
    is_popular: bool = False
    sort_order: int = Field(default=10, ge=0)


class UpdatePlanRequest(BaseModel):
    """Update subscription plan request."""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    features: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None
    has_trial: Optional[bool] = None
    trial_days: Optional[int] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CreateSubscriptionRequest(BaseModel):
    """Create subscription request."""
    plan_id: int
    with_trial: bool = False
    quantity: int = Field(default=1, ge=1)
    coupon_code: Optional[str] = None


class ChangePlanRequest(BaseModel):
    """Change subscription plan request."""
    new_plan_id: int
    prorate: bool = True


class PauseSubscriptionRequest(BaseModel):
    """Pause subscription request."""
    resume_at: Optional[datetime] = None


class CancelSubscriptionRequest(BaseModel):
    """Cancel subscription request."""
    cancel_immediately: bool = False
    reason: Optional[str] = None


class RecordPaymentRequest(BaseModel):
    """Record payment request."""
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="manual")
    transaction_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AddCreditsRequest(BaseModel):
    """Add credits request."""
    amount: float = Field(..., gt=0)
    description: Optional[str] = None


class RecordUsageRequest(BaseModel):
    """Record usage request."""
    metric: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit_price: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_subscription_service(db: Session) -> SubscriptionService:
    """Get subscription service instance."""
    return SubscriptionService(db)


def plan_to_response(plan) -> PlanResponse:
    """Convert plan to response model."""
    return PlanResponse(
        id=plan.id,
        code=plan.code,
        name=plan.name,
        description=plan.description,
        tier=plan.tier,
        billing_cycle=plan.billing_cycle.value if hasattr(plan.billing_cycle, 'value') else plan.billing_cycle,
        price=float(plan.price),
        currency=plan.currency,
        features=plan.features or {},
        limits=plan.limits or {},
        has_trial=plan.has_trial,
        trial_days=plan.trial_days,
        is_popular=plan.is_popular,
        is_active=plan.is_active,
        created_at=plan.created_at.isoformat(),
    )


def subscription_to_response(sub) -> SubscriptionResponse:
    """Convert subscription to response model."""
    # Calculate amount if not set
    amount = sub.amount
    if amount is None:
        amount = sub.unit_price * (sub.quantity or 1)

    return SubscriptionResponse(
        id=sub.id,
        plan_id=sub.plan_id,
        plan_code=sub.plan.code if sub.plan else None,
        plan_name=sub.plan.name if sub.plan else None,
        status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
        billing_cycle=sub.billing_cycle.value if hasattr(sub.billing_cycle, 'value') else sub.billing_cycle,
        current_period_start=sub.current_period_start.isoformat(),
        current_period_end=sub.current_period_end.isoformat(),
        trial_start=sub.trial_start.isoformat() if sub.trial_start else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
        cancel_at_period_end=sub.cancel_at_period_end,
        cancelled_at=sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        paused_at=sub.paused_at.isoformat() if sub.paused_at else None,
        resume_at=sub.resume_at.isoformat() if sub.resume_at else None,
        quantity=sub.quantity or 1,
        amount=float(amount),
        currency=sub.currency,
        created_at=sub.created_at.isoformat(),
    )


def invoice_to_response(inv) -> InvoiceResponse:
    """Convert invoice to response model."""
    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        subscription_id=inv.subscription_id,
        status=inv.status.value if hasattr(inv.status, 'value') else inv.status,
        subtotal=float(inv.subtotal),
        discount_amount=float(inv.discount_amount),
        tax_amount=float(inv.tax_amount),
        total=float(inv.total),
        currency=inv.currency,
        period_start=inv.period_start.isoformat(),
        period_end=inv.period_end.isoformat(),
        due_date=inv.due_date.isoformat(),
        paid_at=inv.paid_at.isoformat() if inv.paid_at else None,
        line_items=inv.line_items or [],
        created_at=inv.created_at.isoformat(),
    )


def payment_to_response(pmt) -> PaymentResponse:
    """Convert payment to response model."""
    return PaymentResponse(
        id=pmt.id,
        invoice_id=pmt.invoice_id,
        amount=float(pmt.amount),
        currency=pmt.currency,
        payment_method=pmt.payment_method,
        status=pmt.status,
        transaction_id=pmt.transaction_id,
        paid_at=pmt.paid_at.isoformat(),
    )


# -------------------------------------------------------------------------
# Plan Endpoints
# -------------------------------------------------------------------------


@router.get("/plans", response_model=List[PlanResponse])
def list_plans(
    tier: Optional[str] = None,
    billing_cycle: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """
    List available subscription plans.

    This endpoint is public and returns active plans by default.
    """
    service = get_subscription_service(db)
    plans = service.list_plans(
        tier=tier,
        billing_cycle=billing_cycle,
        active_only=active_only,
    )
    return [plan_to_response(p) for p in plans]


@router.get("/plans/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """Get a subscription plan by ID."""
    service = get_subscription_service(db)
    plan = service.get_plan(plan_id)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    return plan_to_response(plan)


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    data: CreatePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new subscription plan.

    Requires admin privileges.
    """
    # TODO: Add admin check
    service = get_subscription_service(db)

    try:
        plan = service.create_plan(
            code=data.code,
            name=data.name,
            tier=data.tier,
            billing_cycle=data.billing_cycle,
            price=Decimal(str(data.price)),
            description=data.description,
            currency=data.currency,
            features=data.features,
            limits=data.limits,
            has_trial=data.has_trial,
            trial_days=data.trial_days,
            is_popular=data.is_popular,
            sort_order=data.sort_order,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return plan_to_response(plan)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: int,
    data: UpdatePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a subscription plan.

    Requires admin privileges.
    """
    # TODO: Add admin check
    service = get_subscription_service(db)
    plan = service.get_plan(plan_id)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    if 'price' in update_data:
        update_data['price'] = Decimal(str(update_data['price']))

    for key, value in update_data.items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)

    return plan_to_response(plan)


# -------------------------------------------------------------------------
# Subscription Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[SubscriptionResponse])
def list_my_subscriptions(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all subscriptions for the current user."""
    service = get_subscription_service(db)
    subscriptions = service.get_user_subscriptions(
        user_id=current_user.id,
        status=status_filter,
    )
    return [subscription_to_response(s) for s in subscriptions]


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a subscription by ID."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    return subscription_to_response(subscription)


@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new subscription for the current user."""
    service = get_subscription_service(db)

    try:
        subscription = service.create_subscription(
            plan_id=data.plan_id,
            user_id=current_user.id,
            with_trial=data.with_trial,
            quantity=data.quantity,
            coupon_code=data.coupon_code,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return subscription_to_response(subscription)


@router.post("/{subscription_id}/change-plan", response_model=SubscriptionResponse)
def change_subscription_plan(
    subscription_id: int,
    data: ChangePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Change the plan for an existing subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    try:
        updated_sub, invoice = service.change_plan(
            subscription_id=subscription_id,
            new_plan_id=data.new_plan_id,
            prorate=data.prorate,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return subscription_to_response(updated_sub)


@router.post("/{subscription_id}/pause", response_model=SubscriptionResponse)
def pause_subscription(
    subscription_id: int,
    data: PauseSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Pause a subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    try:
        updated = service.pause_subscription(
            subscription_id=subscription_id,
            resume_at=data.resume_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return subscription_to_response(updated)


@router.post("/{subscription_id}/resume", response_model=SubscriptionResponse)
def resume_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Resume a paused subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    try:
        updated = service.resume_subscription(subscription_id=subscription_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return subscription_to_response(updated)


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: int,
    data: CancelSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    try:
        updated = service.cancel_subscription(
            subscription_id=subscription_id,
            cancel_immediately=data.cancel_immediately,
            reason=data.reason,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return subscription_to_response(updated)


# -------------------------------------------------------------------------
# Invoice Endpoints
# -------------------------------------------------------------------------


@router.get("/{subscription_id}/invoices", response_model=List[InvoiceResponse])
def list_subscription_invoices(
    subscription_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all invoices for a subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    invoices = service.get_subscription_invoices(
        subscription_id=subscription_id,
        status=status_filter,
    )
    return [invoice_to_response(inv) for inv in invoices]


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get an invoice by ID."""
    service = get_subscription_service(db)
    invoice = service.get_invoice(invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Check ownership via subscription
    subscription = service.get_subscription(invoice.subscription_id)
    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    return invoice_to_response(invoice)


@router.post("/invoices/{invoice_id}/pay", response_model=PaymentResponse)
def pay_invoice(
    invoice_id: int,
    data: RecordPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record a payment for an invoice."""
    service = get_subscription_service(db)
    invoice = service.get_invoice(invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Check ownership via subscription
    subscription = service.get_subscription(invoice.subscription_id)
    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    try:
        payment = service.record_payment(
            invoice_id=invoice_id,
            amount=Decimal(str(data.amount)),
            payment_method=data.payment_method,
            transaction_id=data.transaction_id,
            metadata=data.metadata,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return payment_to_response(payment)


@router.post("/invoices/{invoice_id}/pay-with-credit", response_model=PaymentResponse)
def pay_invoice_with_credit(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Pay an invoice using credit balance."""
    service = get_subscription_service(db)
    invoice = service.get_invoice(invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Check ownership via subscription
    subscription = service.get_subscription(invoice.subscription_id)
    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    try:
        payment = service.pay_with_credit(
            invoice_id=invoice_id,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return payment_to_response(payment)


# -------------------------------------------------------------------------
# Usage Endpoints
# -------------------------------------------------------------------------


@router.get("/{subscription_id}/usage", response_model=List[UsageResponse])
def list_subscription_usage(
    subscription_id: int,
    metric: Optional[str] = None,
    billed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get usage records for a subscription."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    usage_records = service.get_subscription_usage(
        subscription_id=subscription_id,
        metric=metric,
        billed=billed,
    )

    return [
        UsageResponse(
            id=u.id,
            metric=u.metric,
            quantity=float(u.quantity),
            unit_price=float(u.unit_price) if u.unit_price else None,
            total_price=float(u.total_price) if u.total_price else None,
            recorded_at=u.recorded_at.isoformat(),
            billed=u.billed,
        )
        for u in usage_records
    ]


@router.post("/{subscription_id}/usage", response_model=UsageResponse, status_code=status.HTTP_201_CREATED)
def record_usage(
    subscription_id: int,
    data: RecordUsageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record usage for a subscription (metered billing)."""
    service = get_subscription_service(db)
    subscription = service.get_subscription(subscription_id)

    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    try:
        usage = service.record_usage(
            subscription_id=subscription_id,
            metric=data.metric,
            quantity=Decimal(str(data.quantity)),
            unit_price=Decimal(str(data.unit_price)) if data.unit_price else None,
            metadata=data.metadata,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return UsageResponse(
        id=usage.id,
        metric=usage.metric,
        quantity=float(usage.quantity),
        unit_price=float(usage.unit_price) if usage.unit_price else None,
        total_price=float(usage.total_price) if usage.total_price else None,
        recorded_at=usage.recorded_at.isoformat(),
        billed=usage.billed,
    )


# -------------------------------------------------------------------------
# Credit Endpoints
# -------------------------------------------------------------------------


@router.get("/credits/balance", response_model=CreditBalanceResponse)
def get_credit_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the current credit balance for the user."""
    service = get_subscription_service(db)
    balance = service.get_credit_balance(user_id=current_user.id)

    if not balance:
        # Return zero balance
        return CreditBalanceResponse(
            id=0,
            balance=0.0,
            currency="USD",
            updated_at=datetime.utcnow().isoformat(),
        )

    return CreditBalanceResponse(
        id=balance.id,
        balance=float(balance.balance),
        currency=balance.currency,
        updated_at=balance.updated_at.isoformat(),
    )


@router.get("/credits/transactions", response_model=List[CreditTransactionResponse])
def list_credit_transactions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get credit transaction history for the user."""
    service = get_subscription_service(db)
    transactions = service.get_credit_transactions(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    return [
        CreditTransactionResponse(
            id=t.id,
            transaction_type=t.transaction_type,
            amount=float(t.amount),
            balance_after=float(t.balance_after),
            currency=t.currency,
            description=t.description,
            reference_type=t.reference_type,
            reference_id=t.reference_id,
            created_at=t.created_at.isoformat(),
        )
        for t in transactions
    ]


@router.post("/credits/add", response_model=CreditTransactionResponse)
def add_credits(
    data: AddCreditsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Add credits to user's balance.

    In production, this would be triggered by a payment processor.
    For now, this is a manual endpoint.
    """
    service = get_subscription_service(db)

    try:
        transaction = service.add_credits(
            user_id=current_user.id,
            amount=Decimal(str(data.amount)),
            description=data.description or "Manual credit addition",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return CreditTransactionResponse(
        id=transaction.id,
        transaction_type=transaction.transaction_type,
        amount=float(transaction.amount),
        balance_after=float(transaction.balance_after),
        currency=transaction.currency,
        description=transaction.description,
        reference_type=transaction.reference_type,
        reference_id=transaction.reference_id,
        created_at=transaction.created_at.isoformat(),
    )
