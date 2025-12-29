"""Push notification subscription API endpoints"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.push_subscription import PushSubscription
from app.services.push import push_service

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class PushSubscribeRequest(BaseModel):
    """Push subscription request from browser"""
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None
    device_name: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    """Push subscription response"""
    id: int
    endpoint: str
    device_name: Optional[str]
    is_active: bool
    created_at: str
    last_used_at: Optional[str]


class VapidKeyResponse(BaseModel):
    """VAPID public key response"""
    public_key: Optional[str]
    enabled: bool


class PushTestRequest(BaseModel):
    """Test push notification request"""
    title: str = "Test Notification"
    body: str = "This is a test push notification"


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/vapid-key", response_model=VapidKeyResponse)
def get_vapid_public_key():
    """
    Get the VAPID public key for client-side subscription.

    The client needs this key to subscribe to push notifications.
    """
    return VapidKeyResponse(
        public_key=push_service.public_key,
        enabled=push_service.is_configured,
    )


@router.post("/subscribe", response_model=PushSubscriptionResponse)
def subscribe_to_push(
    data: PushSubscribeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Subscribe to push notifications.

    Creates or updates a push subscription for the current user.
    """
    if not push_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured",
        )

    subscription = PushSubscription.create_subscription(
        db=db,
        user_id=current_user.id,
        endpoint=data.endpoint,
        p256dh_key=data.p256dh,
        auth_key=data.auth,
        user_agent=data.user_agent,
        device_name=data.device_name,
    )
    db.commit()

    return PushSubscriptionResponse(
        id=subscription.id,
        endpoint=subscription.endpoint,
        device_name=subscription.device_name,
        is_active=subscription.is_active,
        created_at=subscription.created_at.isoformat(),
        last_used_at=subscription.last_used_at.isoformat() if subscription.last_used_at else None,
    )


@router.post("/unsubscribe")
def unsubscribe_from_push(
    endpoint: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Unsubscribe from push notifications.

    Removes the push subscription for the given endpoint.
    """
    deleted = PushSubscription.delete_by_endpoint(db, endpoint)
    db.commit()

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    return {"message": "Unsubscribed successfully"}


@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
def list_subscriptions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all push subscriptions for the current user.
    """
    subscriptions = PushSubscription.get_active_subscriptions(db, current_user.id)

    return [
        PushSubscriptionResponse(
            id=sub.id,
            endpoint=sub.endpoint,
            device_name=sub.device_name,
            is_active=sub.is_active,
            created_at=sub.created_at.isoformat(),
            last_used_at=sub.last_used_at.isoformat() if sub.last_used_at else None,
        )
        for sub in subscriptions
    ]


@router.delete("/subscriptions/{subscription_id}")
def delete_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete a specific push subscription.
    """
    subscription = db.query(PushSubscription).filter(
        PushSubscription.id == subscription_id,
        PushSubscription.user_id == current_user.id,
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    db.delete(subscription)
    db.commit()

    return {"message": "Subscription deleted"}


@router.post("/test")
async def test_push_notification(
    data: PushTestRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Send a test push notification to all user's subscriptions.
    """
    if not push_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured",
        )

    count = await push_service.send_to_user(
        db=db,
        user_id=current_user.id,
        title=data.title,
        body=data.body,
        notification_type="test",
        url="/inbox",
    )
    db.commit()

    return {
        "message": f"Test notification sent to {count} subscription(s)",
        "sent_count": count,
    }
