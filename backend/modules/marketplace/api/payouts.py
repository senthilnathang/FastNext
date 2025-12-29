"""
Marketplace Payout API Endpoints

Publisher payouts, balances, and transaction management.
"""

from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps.database import get_db
from app.api.deps.auth import get_current_active_user
from app.models.user import User

from ..services.payout_service import PayoutService, get_payout_service


router = APIRouter(prefix="/payouts", tags=["Marketplace Payouts"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class BalanceResponse(BaseModel):
    """Publisher balance response."""
    publisher_id: int
    available_balance: float
    pending_balance: float
    reserved_balance: float
    total_balance: float
    currency: str
    lifetime_earnings: float
    lifetime_payouts: float
    lifetime_adjustments: float
    last_earning_at: Optional[str]
    last_payout_at: Optional[str]
    auto_payout_enabled: bool
    payout_threshold: Optional[float]


class PayoutBatchResponse(BaseModel):
    """Payout batch response."""
    id: int
    batch_id: str
    batch_type: str
    period_start: str
    period_end: str
    status: str
    total_payouts: int
    total_gross_amount: float
    total_platform_fees: float
    total_net_amount: float
    currency: str
    success_count: int
    failed_count: int
    pending_count: int
    scheduled_at: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class PayoutItemResponse(BaseModel):
    """Payout item response."""
    id: int
    publisher_id: int
    gross_amount: float
    platform_fee: float
    adjustments: float
    net_amount: float
    currency: str
    status: str
    payout_method: Optional[str]
    processed_at: Optional[str]
    last_error: Optional[str]

    class Config:
        from_attributes = True


class CreateBatchRequest(BaseModel):
    """Request to create a payout batch."""
    period_start: date
    period_end: date
    batch_type: str = "regular"


class ApproveBatchRequest(BaseModel):
    """Request to approve a payout batch."""
    pass  # No additional data needed


class CancelBatchRequest(BaseModel):
    """Request to cancel a payout batch."""
    reason: str


class AdjustmentResponse(BaseModel):
    """Payout adjustment response."""
    id: int
    publisher_id: int
    adjustment_type: str
    amount: float
    currency: str
    description: str
    status: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    created_at: str
    applied_at: Optional[str]

    class Config:
        from_attributes = True


class CreateAdjustmentRequest(BaseModel):
    """Request to create a payout adjustment."""
    publisher_id: int
    adjustment_type: str = Field(..., pattern="^(refund|chargeback|bonus|correction|fee)$")
    amount: float
    description: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    internal_notes: Optional[str] = None


class TransactionResponse(BaseModel):
    """Balance transaction response."""
    id: int
    publisher_id: int
    transaction_type: str
    amount: float
    currency: str
    balance_type: str
    balance_before: float
    balance_after: float
    description: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class EarningsSummaryResponse(BaseModel):
    """Earnings summary response."""
    period: str
    start_date: str
    end_date: str
    earnings: float
    payouts: float
    adjustments: float
    net_change: float
    transaction_count: int


class PayoutCalculationResponse(BaseModel):
    """Payout calculation response."""
    publisher_id: int
    period_start: str
    period_end: str
    gross_amount: float
    platform_fee: float
    adjustments: float
    net_amount: float
    order_count: int
    order_ids: List[int]
    module_breakdown: List[Dict[str, Any]]
    available_balance: float
    pending_balance: float


class ScheduleResponse(BaseModel):
    """Payout schedule response."""
    id: int
    schedule_type: str
    day_of_week: Optional[int]
    day_of_month: Optional[int]
    minimum_amount: float
    processing_hour: int
    is_active: bool
    last_run_at: Optional[str]
    next_run_at: Optional[str]

    class Config:
        from_attributes = True


class CreateScheduleRequest(BaseModel):
    """Request to create a payout schedule."""
    schedule_type: str = Field(..., pattern="^(weekly|biweekly|monthly)$")
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_month: Optional[int] = Field(None, ge=1, le=28)
    minimum_amount: float = 50.00
    processing_hour: int = Field(default=9, ge=0, le=23)


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def batch_to_response(batch) -> PayoutBatchResponse:
    """Convert payout batch to response."""
    return PayoutBatchResponse(
        id=batch.id,
        batch_id=batch.batch_id,
        batch_type=batch.batch_type,
        period_start=batch.period_start.isoformat(),
        period_end=batch.period_end.isoformat(),
        status=batch.status,
        total_payouts=batch.total_payouts,
        total_gross_amount=float(batch.total_gross_amount) if batch.total_gross_amount else 0.0,
        total_platform_fees=float(batch.total_platform_fees) if batch.total_platform_fees else 0.0,
        total_net_amount=float(batch.total_net_amount) if batch.total_net_amount else 0.0,
        currency=batch.currency,
        success_count=batch.success_count,
        failed_count=batch.failed_count,
        pending_count=batch.pending_count,
        scheduled_at=batch.scheduled_at.isoformat() if batch.scheduled_at else None,
        started_at=batch.started_at.isoformat() if batch.started_at else None,
        completed_at=batch.completed_at.isoformat() if batch.completed_at else None,
        created_at=batch.created_at.isoformat(),
    )


def adjustment_to_response(adj) -> AdjustmentResponse:
    """Convert adjustment to response."""
    return AdjustmentResponse(
        id=adj.id,
        publisher_id=adj.publisher_id,
        adjustment_type=adj.adjustment_type,
        amount=float(adj.amount),
        currency=adj.currency,
        description=adj.description,
        status=adj.status,
        reference_type=adj.reference_type,
        reference_id=adj.reference_id,
        created_at=adj.created_at.isoformat(),
        applied_at=adj.applied_at.isoformat() if adj.applied_at else None,
    )


def transaction_to_response(tx) -> TransactionResponse:
    """Convert transaction to response."""
    return TransactionResponse(
        id=tx.id,
        publisher_id=tx.publisher_id,
        transaction_type=tx.transaction_type,
        amount=float(tx.amount),
        currency=tx.currency,
        balance_type=tx.balance_type,
        balance_before=float(tx.balance_before),
        balance_after=float(tx.balance_after),
        description=tx.description,
        created_at=tx.created_at.isoformat(),
    )


# -------------------------------------------------------------------------
# Balance Endpoints
# -------------------------------------------------------------------------


@router.get("/balance/{publisher_id}", response_model=BalanceResponse)
def get_publisher_balance(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get publisher's current balance."""
    service = get_payout_service(db)
    balance = service.get_publisher_balance(publisher_id)
    return BalanceResponse(**balance)


@router.post("/balance/{publisher_id}/release")
def release_pending_balance(
    publisher_id: int,
    amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Move funds from pending to available balance."""
    service = get_payout_service(db)

    amount_decimal = Decimal(str(amount)) if amount else None
    transaction = service.move_pending_to_available(publisher_id, amount_decimal)

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending balance to release"
        )

    return transaction_to_response(transaction)


# -------------------------------------------------------------------------
# Payout Batch Endpoints
# -------------------------------------------------------------------------


@router.get("/batches", response_model=List[PayoutBatchResponse])
def list_batches(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List payout batches."""
    service = get_payout_service(db)
    batches = service.list_payout_batches(
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return [batch_to_response(b) for b in batches]


@router.get("/batches/{batch_id}", response_model=PayoutBatchResponse)
def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a payout batch by ID."""
    service = get_payout_service(db)
    batch = service.get_payout_batch(batch_id)

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    return batch_to_response(batch)


@router.get("/batches/{batch_id}/items", response_model=List[PayoutItemResponse])
def get_batch_items(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get items in a payout batch."""
    service = get_payout_service(db)
    batch = service.get_payout_batch(batch_id)

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    return [
        PayoutItemResponse(
            id=item.id,
            publisher_id=item.publisher_id,
            gross_amount=float(item.gross_amount),
            platform_fee=float(item.platform_fee),
            adjustments=float(item.adjustments),
            net_amount=float(item.net_amount),
            currency=item.currency,
            status=item.status,
            payout_method=item.payout_method,
            processed_at=item.processed_at.isoformat() if item.processed_at else None,
            last_error=item.last_error,
        )
        for item in batch.payouts
    ]


@router.post("/batches", response_model=PayoutBatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    data: CreateBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new payout batch."""
    service = get_payout_service(db)

    batch = service.create_payout_batch(
        period_start=data.period_start,
        period_end=data.period_end,
        batch_type=data.batch_type,
        created_by=current_user.id,
    )

    return batch_to_response(batch)


@router.post("/batches/{batch_id}/populate", response_model=PayoutBatchResponse)
def populate_batch(
    batch_id: str,
    minimum_amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Populate a batch with eligible publisher payouts."""
    service = get_payout_service(db)
    batch = service.get_payout_batch(batch_id)

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    if batch.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch must be in draft status"
        )

    amount = Decimal(str(minimum_amount)) if minimum_amount else None
    service.populate_batch_items(batch, amount)

    return batch_to_response(batch)


@router.post("/batches/{batch_id}/approve", response_model=PayoutBatchResponse)
def approve_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve a payout batch for processing."""
    service = get_payout_service(db)

    try:
        batch = service.approve_batch(batch_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return batch_to_response(batch)


@router.post("/batches/{batch_id}/process", response_model=PayoutBatchResponse)
def process_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Process an approved payout batch."""
    service = get_payout_service(db)

    try:
        batch = service.process_batch(batch_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return batch_to_response(batch)


@router.post("/batches/{batch_id}/cancel", response_model=PayoutBatchResponse)
def cancel_batch(
    batch_id: str,
    data: CancelBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a payout batch."""
    service = get_payout_service(db)

    try:
        batch = service.cancel_batch(batch_id, data.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return batch_to_response(batch)


# -------------------------------------------------------------------------
# Payout Calculation
# -------------------------------------------------------------------------


@router.get("/calculate/{publisher_id}", response_model=PayoutCalculationResponse)
def calculate_payout(
    publisher_id: int,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Calculate payout for a publisher for a period."""
    service = get_payout_service(db)
    result = service.calculate_publisher_payout(publisher_id, period_start, period_end)
    return PayoutCalculationResponse(**result)


# -------------------------------------------------------------------------
# Adjustment Endpoints
# -------------------------------------------------------------------------


@router.get("/adjustments", response_model=List[AdjustmentResponse])
def list_adjustments(
    publisher_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    adjustment_type: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List payout adjustments."""
    service = get_payout_service(db)
    adjustments = service.list_adjustments(
        publisher_id=publisher_id,
        status=status_filter,
        adjustment_type=adjustment_type,
        limit=limit,
        offset=offset,
    )
    return [adjustment_to_response(a) for a in adjustments]


@router.post("/adjustments", response_model=AdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_adjustment(
    data: CreateAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a payout adjustment."""
    service = get_payout_service(db)

    adjustment = service.create_adjustment(
        publisher_id=data.publisher_id,
        adjustment_type=data.adjustment_type,
        amount=Decimal(str(data.amount)),
        description=data.description,
        created_by=current_user.id,
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        internal_notes=data.internal_notes,
    )

    return adjustment_to_response(adjustment)


@router.post("/adjustments/{adjustment_id}/approve", response_model=AdjustmentResponse)
def approve_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve and apply an adjustment."""
    service = get_payout_service(db)

    try:
        adjustment = service.approve_adjustment(adjustment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return adjustment_to_response(adjustment)


@router.post("/adjustments/{adjustment_id}/cancel", response_model=AdjustmentResponse)
def cancel_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a pending adjustment."""
    service = get_payout_service(db)

    try:
        adjustment = service.cancel_adjustment(adjustment_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return adjustment_to_response(adjustment)


# -------------------------------------------------------------------------
# Transaction History
# -------------------------------------------------------------------------


@router.get("/transactions/{publisher_id}", response_model=List[TransactionResponse])
def get_transactions(
    publisher_id: int,
    transaction_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get transaction history for a publisher."""
    service = get_payout_service(db)

    transactions = service.get_transaction_history(
        publisher_id=publisher_id,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return [transaction_to_response(t) for t in transactions]


@router.get("/earnings/{publisher_id}/summary", response_model=EarningsSummaryResponse)
def get_earnings_summary(
    publisher_id: int,
    period: str = Query("month", pattern="^(day|week|month|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get earnings summary for a publisher."""
    service = get_payout_service(db)
    summary = service.get_earnings_summary(publisher_id, period)
    return EarningsSummaryResponse(**summary)


# -------------------------------------------------------------------------
# Payout Schedule
# -------------------------------------------------------------------------


@router.get("/schedule", response_model=ScheduleResponse)
def get_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the active payout schedule."""
    service = get_payout_service(db)
    schedule = service.get_active_schedule()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active schedule"
        )

    return ScheduleResponse(
        id=schedule.id,
        schedule_type=schedule.schedule_type,
        day_of_week=schedule.day_of_week,
        day_of_month=schedule.day_of_month,
        minimum_amount=float(schedule.minimum_amount),
        processing_hour=schedule.processing_hour,
        is_active=schedule.is_active,
        last_run_at=schedule.last_run_at.isoformat() if schedule.last_run_at else None,
        next_run_at=schedule.next_run_at.isoformat() if schedule.next_run_at else None,
    )


@router.post("/schedule", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    data: CreateScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a payout schedule (replaces existing)."""
    service = get_payout_service(db)

    schedule = service.create_schedule(
        schedule_type=data.schedule_type,
        day_of_week=data.day_of_week,
        day_of_month=data.day_of_month,
        minimum_amount=Decimal(str(data.minimum_amount)),
        processing_hour=data.processing_hour,
    )

    return ScheduleResponse(
        id=schedule.id,
        schedule_type=schedule.schedule_type,
        day_of_week=schedule.day_of_week,
        day_of_month=schedule.day_of_month,
        minimum_amount=float(schedule.minimum_amount),
        processing_hour=schedule.processing_hour,
        is_active=schedule.is_active,
        last_run_at=schedule.last_run_at.isoformat() if schedule.last_run_at else None,
        next_run_at=schedule.next_run_at.isoformat() if schedule.next_run_at else None,
    )


@router.post("/schedule/run", response_model=Optional[PayoutBatchResponse])
def run_scheduled_payout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Manually trigger a scheduled payout run."""
    service = get_payout_service(db)
    batch = service.run_scheduled_payout()

    if batch:
        return batch_to_response(batch)

    return None
