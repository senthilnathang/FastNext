"""
Enhanced logger utility inspired by VerifyWise implementation
Provides comprehensive event logging with structured data and real-time monitoring
"""

import os
import json
import uuid
import logging
import socket
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Union
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func, text
from fastapi import Request

from app.models.activity_log import (
    ActivityLog, ActivityAction, ActivityLevel, EventCategory
)
from app.core.config import settings


class EnhancedLogger:
    """Enhanced logger for comprehensive event tracking"""
    
    def __init__(self):
        self.server_name = socket.gethostname()
        self.environment = getattr(settings, 'ENVIRONMENT', 'development')
        self.app_version = getattr(settings, 'APP_VERSION', '1.0.0')
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        
        # Setup file logger
        self.setup_file_logger()
    
    def setup_file_logger(self):
        """Setup file logger for daily log files"""
        self.file_logger = logging.getLogger('event_logger')
        self.file_logger.setLevel(logging.DEBUG)
        
        # Create daily log file
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = self.logs_dir / f"events-{today}.log"
        
        # File handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # JSON formatter for structured logs
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # Remove existing handlers and add new one
        self.file_logger.handlers.clear()
        self.file_logger.addHandler(file_handler)
    
    def log_event(
        self,
        db: Session,
        category: EventCategory,
        action: ActivityAction,
        entity_type: str,
        description: str,
        level: ActivityLevel = ActivityLevel.INFO,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        entity_id: Optional[Union[str, int]] = None,
        entity_name: Optional[str] = None,
        correlation_id: Optional[str] = None,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        risk_score: Optional[int] = None,
        affected_users_count: Optional[int] = None,
        response_time_ms: Optional[int] = None
    ) -> ActivityLog:
        """
        Log a comprehensive event to database and file
        """
        
        # Generate event ID
        event_id = str(uuid.uuid4())
        
        # Extract request information
        request_info = self._extract_request_info(request) if request else {}
        
        # Parse entity_id to string
        entity_id_str = str(entity_id) if entity_id is not None else None
        
        # Create activity log entry
        activity_log = ActivityLog(
            event_id=event_id,
            correlation_id=correlation_id or str(uuid.uuid4()),
            user_id=user_id,
            username=username,
            category=category,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id_str,
            entity_name=entity_name,
            description=description,
            level=level,
            ip_address=request_info.get('ip_address'),
            user_agent=request_info.get('user_agent'),
            request_method=request_info.get('method'),
            request_path=request_info.get('path'),
            request_headers=request_info.get('headers'),
            status_code=request_info.get('status_code'),
            response_time_ms=response_time_ms,
            country_code=request_info.get('country_code'),
            city=request_info.get('city'),
            session_id=request_info.get('session_id'),
            event_metadata=metadata,
            tags=tags,
            risk_score=risk_score,
            affected_users_count=affected_users_count,
            server_name=self.server_name,
            environment=self.environment,
            application_version=self.app_version
        )
        
        try:
            # Save to database
            db.add(activity_log)
            db.commit()
            db.refresh(activity_log)
            
            # Log to file
            self._log_to_file(activity_log)
            
            return activity_log
            
        except Exception as e:
            db.rollback()
            # Fallback to file logging only
            self._log_error_to_file(str(e), event_id, description)
            raise e
    
    def _extract_request_info(self, request: Request) -> Dict[str, Any]:
        """Extract comprehensive request information"""
        info = {}
        
        if request:
            info['method'] = request.method
            info['path'] = str(request.url.path)
            info['ip_address'] = self._get_client_ip(request)
            info['user_agent'] = request.headers.get('User-Agent')
            info['session_id'] = request.cookies.get('session_id')
            
            # Extract important headers (excluding sensitive ones)
            safe_headers = {}
            for key, value in request.headers.items():
                if key.lower() not in ['authorization', 'cookie', 'x-api-key']:
                    safe_headers[key] = value
            info['headers'] = safe_headers
            
            # Try to get geographic info (placeholder - would integrate with GeoIP)
            info['country_code'] = None
            info['city'] = None
        
        return info
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        # Check for forwarded headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _log_to_file(self, activity_log: ActivityLog):
        """Log event to file in structured format"""
        log_data = {
            'timestamp': activity_log.created_at.isoformat(),
            'event_id': activity_log.event_id,
            'level': activity_log.level.value,
            'category': activity_log.category.value,
            'action': activity_log.action.value,
            'description': activity_log.description,
            'user_id': activity_log.user_id,
            'username': activity_log.username,
            'ip_address': activity_log.ip_address,
            'entity_type': activity_log.entity_type,
            'entity_id': activity_log.entity_id,
            'metadata': activity_log.event_metadata
        }
        
        log_message = json.dumps(log_data, default=str)
        
        # Log at appropriate level
        if activity_log.level == ActivityLevel.DEBUG:
            self.file_logger.debug(log_message)
        elif activity_log.level == ActivityLevel.INFO:
            self.file_logger.info(log_message)
        elif activity_log.level == ActivityLevel.WARNING:
            self.file_logger.warning(log_message)
        elif activity_log.level == ActivityLevel.ERROR:
            self.file_logger.error(log_message)
        elif activity_log.level == ActivityLevel.CRITICAL:
            self.file_logger.critical(log_message)
    
    def _log_error_to_file(self, error: str, event_id: str, description: str):
        """Log error when database logging fails"""
        error_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_id': event_id,
            'level': 'ERROR',
            'description': f"Logging failed: {description}",
            'error': error
        }
        self.file_logger.error(json.dumps(error_data))
    
    def get_events_from_db(
        self,
        db: Session,
        limit: int = 500,
        offset: int = 0,
        level: Optional[ActivityLevel] = None,
        category: Optional[EventCategory] = None,
        action: Optional[ActivityAction] = None,
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve events from database with filtering
        """
        try:
            query = db.query(ActivityLog)
            
            # Apply filters
            if level:
                query = query.filter(ActivityLog.level == level)
            
            if category:
                query = query.filter(ActivityLog.category == category)
            
            if action:
                query = query.filter(ActivityLog.action == action)
            
            if user_id:
                query = query.filter(ActivityLog.user_id == user_id)
            
            if start_date:
                query = query.filter(ActivityLog.created_at >= start_date)
            
            if end_date:
                query = query.filter(ActivityLog.created_at <= end_date)
            
            if search_query:
                search_filter = or_(
                    ActivityLog.description.ilike(f"%{search_query}%"),
                    ActivityLog.entity_name.ilike(f"%{search_query}%"),
                    ActivityLog.username.ilike(f"%{search_query}%")
                )
                query = query.filter(search_filter)
            
            # Get total count
            total_count = query.count()
            
            # Apply pagination and ordering
            events = query.order_by(desc(ActivityLog.created_at))\
                         .offset(offset)\
                         .limit(limit)\
                         .all()
            
            return {
                'success': True,
                'data': [event.to_user_event_dict() for event in events],
                'total': total_count,
                'page': (offset // limit) + 1,
                'pages': (total_count + limit - 1) // limit
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def get_logs_from_file(
        self,
        date: Optional[str] = None,
        lines: int = 500
    ) -> Dict[str, Any]:
        """
        Retrieve logs from file (inspired by VerifyWise implementation)
        """
        try:
            # Use today's date if not specified
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            log_file = self.logs_dir / f"events-{date}.log"
            
            if not log_file.exists():
                return {
                    'success': False,
                    'error': f"Log file for {date} not found",
                    'data': []
                }
            
            # Read last N lines from file
            with open(log_file, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
                recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            
            # Parse JSON lines
            parsed_logs = []
            for line in recent_lines:
                try:
                    # Extract JSON from log line (after timestamp and level)
                    json_start = line.find('{')
                    if json_start != -1:
                        json_data = json.loads(line[json_start:])
                        parsed_logs.append(json_data)
                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue
            
            return {
                'success': True,
                'data': parsed_logs,
                'file': str(log_file),
                'lines_count': len(parsed_logs)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def get_event_statistics(
        self,
        db: Session,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Get event statistics for dashboard"""
        try:
            # Calculate time range
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(hours=hours)
            
            # Base query for time range
            base_query = db.query(ActivityLog).filter(
                ActivityLog.created_at >= start_time
            )
            
            # Event count by level
            level_stats = {}
            for level in ActivityLevel:
                count = base_query.filter(ActivityLog.level == level).count()
                level_stats[level.value] = count
            
            # Event count by category
            category_stats = {}
            for category in EventCategory:
                count = base_query.filter(ActivityLog.category == category).count()
                category_stats[category.value] = count
            
            # Recent critical events
            critical_events = base_query.filter(
                ActivityLog.level == ActivityLevel.CRITICAL
            ).order_by(desc(ActivityLog.created_at)).limit(10).all()
            
            # Top users by activity
            user_activity = db.query(
                ActivityLog.username,
                func.count(ActivityLog.id).label('event_count')
            ).filter(
                ActivityLog.created_at >= start_time,
                ActivityLog.username.isnot(None)
            ).group_by(ActivityLog.username).order_by(
                desc('event_count')
            ).limit(10).all()
            
            return {
                'success': True,
                'timeRange': {
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat(),
                    'hours': hours
                },
                'totals': {
                    'events': base_query.count(),
                    'users': base_query.filter(ActivityLog.user_id.isnot(None)).distinct(ActivityLog.user_id).count()
                },
                'byLevel': level_stats,
                'byCategory': category_stats,
                'criticalEvents': [event.to_event_dict() for event in critical_events],
                'topUsers': [
                    {'username': username, 'eventCount': count} 
                    for username, count in user_activity
                ]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Global logger instance
enhanced_logger = EnhancedLogger()

# Convenience functions for common logging scenarios
def log_authentication_event(
    db: Session,
    action: ActivityAction,
    user_id: Optional[int],
    username: str,
    success: bool,
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """Log authentication events"""
    
    level = ActivityLevel.INFO if success else ActivityLevel.WARNING
    description = f"User {username} {action.value} {'successful' if success else 'failed'}"
    
    return enhanced_logger.log_event(
        db=db,
        category=EventCategory.AUTHENTICATION,
        action=action,
        entity_type="auth",
        description=description,
        level=level,
        user_id=user_id,
        username=username,
        request=request,
        metadata=metadata,
        risk_score=10 if not success else 0
    )


def log_security_event(
    db: Session,
    description: str,
    level: ActivityLevel = ActivityLevel.WARNING,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None,
    risk_score: Optional[int] = None
) -> ActivityLog:
    """Log security events"""
    
    return enhanced_logger.log_event(
        db=db,
        category=EventCategory.SECURITY,
        action=ActivityAction.SECURITY_EVENT,
        entity_type="security",
        description=description,
        level=level,
        user_id=user_id,
        username=username,
        request=request,
        metadata=metadata,
        risk_score=risk_score or 50
    )


def log_api_call(
    db: Session,
    request: Request,
    response_time_ms: int,
    status_code: int,
    user_id: Optional[int] = None,
    username: Optional[str] = None
) -> ActivityLog:
    """Log API calls"""
    
    level = ActivityLevel.INFO
    if status_code >= 500:
        level = ActivityLevel.ERROR
    elif status_code >= 400:
        level = ActivityLevel.WARNING
    
    description = f"API call: {request.method} {request.url.path}"
    
    return enhanced_logger.log_event(
        db=db,
        category=EventCategory.API,
        action=ActivityAction.API_CALL,
        entity_type="api",
        description=description,
        level=level,
        user_id=user_id,
        username=username,
        request=request,
        response_time_ms=response_time_ms,
        metadata={
            'status_code': status_code,
            'response_time_ms': response_time_ms
        }
    )


def log_data_operation(
    db: Session,
    action: ActivityAction,
    entity_type: str,
    entity_id: Union[str, int],
    entity_name: str,
    user_id: int,
    username: str,
    description: str,
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """Log data operations (CRUD)"""
    
    return enhanced_logger.log_event(
        db=db,
        category=EventCategory.DATA_MANAGEMENT,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
        level=ActivityLevel.INFO,
        user_id=user_id,
        username=username,
        request=request,
        metadata=metadata
    )


# Export main components
__all__ = [
    'EnhancedLogger',
    'enhanced_logger',
    'log_authentication_event',
    'log_security_event',
    'log_api_call',
    'log_data_operation'
]