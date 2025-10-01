"""
Event log API endpoints inspired by VerifyWise implementation
Provides comprehensive event monitoring and logging endpoints
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.auth.optional_deps import get_current_user_dev_friendly
from app.models.user import User
from app.models.activity_log import ActivityLog, ActivityLevel, ActivityAction, EventCategory
from app.utils.enhanced_logger import enhanced_logger, log_api_call
from app.middleware.validation_middleware import (
    validate_pagination_params_enhanced,
    create_success_response,
    create_validation_error_response
)


router = APIRouter()


# Request/Response Models
class EventFilter(BaseModel):
    level: Optional[ActivityLevel] = None
    category: Optional[EventCategory] = None
    action: Optional[ActivityAction] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_query: Optional[str] = None


class EventResponse(BaseModel):
    eventId: Optional[str]
    correlationId: Optional[str]
    timestamp: str
    level: str
    category: str
    action: str
    user: Optional[Dict[str, Any]]
    entity: Dict[str, Any]
    request: Optional[Dict[str, Any]]
    location: Optional[Dict[str, Any]]
    description: str
    metadata: Optional[Dict[str, Any]]
    tags: Optional[List[str]]
    riskScore: Optional[int]
    affectedUsersCount: Optional[int]
    system: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    success: bool
    data: List[EventResponse]
    total: int
    page: int
    pages: int
    message: Optional[str] = None


class EventStatistics(BaseModel):
    success: bool
    timeRange: Dict[str, Any]
    totals: Dict[str, int]
    byLevel: Dict[str, int]
    byCategory: Dict[str, int]
    criticalEvents: List[EventResponse]
    topUsers: List[Dict[str, Any]]


class LogFileResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]
    file: Optional[str] = None
    lines_count: Optional[int] = None
    error: Optional[str] = None


@router.get("/events", response_model=EventListResponse)
async def get_events(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Events per page"),
    level: Optional[ActivityLevel] = Query(None, description="Filter by level"),
    category: Optional[EventCategory] = Query(None, description="Filter by category"),
    action: Optional[ActivityAction] = Query(None, description="Filter by action"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    search_query: Optional[str] = Query(None, description="Search in description, entity name, username"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Get filtered list of events with pagination
    Inspired by VerifyWise getAllEvents implementation
    """
    
    start_time = datetime.now()
    
    try:
        # Validate pagination
        pagination = validate_pagination_params_enhanced(
            page=page,
            limit=limit,
            max_limit=500
        )
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get events from database
        result = enhanced_logger.get_events_from_db(
            db=db,
            limit=limit,
            offset=offset,
            level=level,
            category=category,
            action=action,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            search_query=search_query
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result['error']
            )
        
        # Log the API call
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=200,
            user_id=current_user.id,
            username=current_user.username
        )
        
        return EventListResponse(
            success=True,
            data=result['data'],
            total=result['total'],
            page=result['page'],
            pages=result['pages'],
            message="Events retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve events: {str(e)}"
        )


@router.get("/events/statistics", response_model=EventStatistics)
async def get_event_statistics(
    request: Request,
    hours: int = Query(24, ge=1, le=168, description="Hours to look back (max 1 week)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Get event statistics for dashboard
    """
    
    start_time = datetime.now()
    
    try:
        # Get statistics
        result = enhanced_logger.get_event_statistics(db=db, hours=hours)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result['error']
            )
        
        # Log the API call
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=200,
            user_id=current_user.id,
            username=current_user.username
        )
        
        return EventStatistics(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )


@router.get("/events/{event_id}")
async def get_event_by_id(
    event_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Get specific event by ID
    """
    
    start_time = datetime.now()
    
    try:
        # Find event by event_id
        event = db.query(ActivityLog).filter(ActivityLog.event_id == event_id).first()
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
        
        # Log the API call
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=200,
            user_id=current_user.id,
            username=current_user.username
        )
        
        return create_success_response(
            data=event.to_event_dict(),
            message="Event retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve event: {str(e)}"
        )


@router.get("/logs", response_model=LogFileResponse)
async def get_logs_from_file(
    request: Request,
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (default: today)"),
    lines: int = Query(500, ge=1, le=5000, description="Number of recent lines to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Get logs from file (inspired by VerifyWise getLogsQuery)
    """
    
    start_time = datetime.now()
    
    try:
        # Get logs from file
        result = enhanced_logger.get_logs_from_file(date=date, lines=lines)
        
        # Log the API call
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=200 if result['success'] else 404,
            user_id=current_user.id,
            username=current_user.username
        )
        
        return LogFileResponse(**result)
        
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve logs: {str(e)}"
        )


@router.get("/events/export")
async def export_events(
    request: Request,
    format: str = Query("json", regex="^(json|csv)$", description="Export format"),
    level: Optional[ActivityLevel] = Query(None, description="Filter by level"),
    category: Optional[EventCategory] = Query(None, description="Filter by category"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    limit: int = Query(10000, ge=1, le=50000, description="Maximum events to export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Export events in specified format
    """
    
    start_time = datetime.now()
    
    try:
        # Get events for export
        result = enhanced_logger.get_events_from_db(
            db=db,
            limit=limit,
            offset=0,
            level=level,
            category=category,
            start_date=start_date,
            end_date=end_date
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result['error']
            )
        
        events_data = result['data']
        
        if format == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=events_data[0].keys() if events_data else [])
            writer.writeheader()
            for event in events_data:
                # Flatten nested objects for CSV
                flat_event = {}
                for key, value in event.items():
                    if isinstance(value, dict):
                        flat_event[key] = json.dumps(value)
                    elif isinstance(value, list):
                        flat_event[key] = json.dumps(value)
                    else:
                        flat_event[key] = value
                writer.writerow(flat_event)
            
            csv_content = output.getvalue()
            output.close()
            
            from fastapi.responses import Response
            
            # Log the API call
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            log_api_call(
                db=db,
                request=request,
                response_time_ms=response_time,
                status_code=200,
                user_id=current_user.id,
                username=current_user.username
            )
            
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=events-{datetime.now().strftime('%Y%m%d')}.csv"
                }
            )
        
        else:  # JSON format
            import json
            
            # Log the API call
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            log_api_call(
                db=db,
                request=request,
                response_time_ms=response_time,
                status_code=200,
                user_id=current_user.id,
                username=current_user.username
            )
            
            from fastapi.responses import Response
            
            return Response(
                content=json.dumps(events_data, indent=2, default=str),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=events-{datetime.now().strftime('%Y%m%d')}.json"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export events: {str(e)}"
        )


@router.delete("/events/cleanup")
async def cleanup_old_events(
    request: Request,
    days: int = Query(90, ge=7, le=365, description="Delete events older than N days"),
    dry_run: bool = Query(True, description="Preview deletion without actually deleting"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dev_friendly)
):
    """
    Cleanup old events (admin only)
    """
    
    start_time = datetime.now()
    
    try:
        # Check if user has admin permissions (implement your permission check)
        # For now, we'll assume current_user has necessary permissions
        
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Count events to be deleted
        events_to_delete = db.query(ActivityLog).filter(
            ActivityLog.created_at < cutoff_date
        ).count()
        
        if not dry_run:
            # Actually delete the events
            deleted_count = db.query(ActivityLog).filter(
                ActivityLog.created_at < cutoff_date
            ).delete()
            db.commit()
            
            message = f"Deleted {deleted_count} events older than {days} days"
        else:
            deleted_count = events_to_delete
            message = f"Would delete {events_to_delete} events older than {days} days (dry run)"
        
        # Log the API call
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=200,
            user_id=current_user.id,
            username=current_user.username
        )
        
        return create_success_response(
            data={
                'cutoff_date': cutoff_date.isoformat(),
                'events_count': events_to_delete,
                'deleted_count': deleted_count if not dry_run else 0,
                'dry_run': dry_run
            },
            message=message
        )
        
    except Exception as e:
        # Log error
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        log_api_call(
            db=db,
            request=request,
            response_time_ms=response_time,
            status_code=500,
            user_id=current_user.id,
            username=current_user.username
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup events: {str(e)}"
        )


# Additional utility endpoints
@router.get("/events/levels")
async def get_available_levels():
    """Get all available event levels"""
    return create_success_response(
        data=[level.value for level in ActivityLevel],
        message="Available event levels retrieved"
    )


@router.get("/events/categories")
async def get_available_categories():
    """Get all available event categories"""
    return create_success_response(
        data=[category.value for category in EventCategory],
        message="Available event categories retrieved"
    )


@router.get("/events/actions")
async def get_available_actions():
    """Get all available event actions"""
    return create_success_response(
        data=[action.value for action in ActivityAction],
        message="Available event actions retrieved"
    )