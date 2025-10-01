#!/usr/bin/env python3
"""
Enhanced Logging System Demo
This script demonstrates the comprehensive event logging capabilities
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.enhanced_logger import enhanced_logger, log_api_call, log_authentication_event
from app.models.activity_log import EventCategory, ActivityAction, ActivityLevel
from app.db.session import SessionLocal

def demo_enhanced_logging():
    """Demonstrate enhanced logging features"""
    
    print("🚀 Enhanced Event Logging System Demo")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Demo 1: Basic event logging
        print("\n📝 Demo 1: Basic Event Logging")
        log_entry = enhanced_logger.log_event(
            db=db,
            category=EventCategory.USER_MANAGEMENT,
            action=ActivityAction.CREATE,
            entity_type="user",
            description="Demo user created through enhanced logging system",
            level=ActivityLevel.INFO,
            username="demo_user",
            entity_name="Demo User Account",
            metadata={
                "source": "demo_script",
                "version": "1.0.0",
                "feature_flags": ["enhanced_logging", "demo_mode"]
            },
            tags=["demo", "user_management", "enhanced_logging"],
            risk_score=5
        )
        print(f"✅ Created event with ID: {log_entry.event_id}")
        
        # Demo 2: Security event logging
        print("\n🔒 Demo 2: Security Event Logging")
        security_log = enhanced_logger.log_event(
            db=db,
            category=EventCategory.SECURITY,
            action=ActivityAction.SECURITY_EVENT,
            entity_type="system",
            description="Suspicious login attempt detected",
            level=ActivityLevel.WARNING,
            username="suspicious_user",
            metadata={
                "attempt_count": 5,
                "source_ip": "192.168.1.100",
                "blocked": True,
                "detection_rules": ["multiple_failed_attempts", "geographic_anomaly"]
            },
            tags=["security", "login_attempt", "blocked"],
            risk_score=75
        )
        print(f"⚠️ Created security event with ID: {security_log.event_id}")
        
        # Demo 3: API call logging
        print("\n🌐 Demo 3: API Call Logging")
        api_log = enhanced_logger.log_event(
            db=db,
            category=EventCategory.API,
            action=ActivityAction.API_CALL,
            entity_type="endpoint",
            description="API endpoint accessed successfully",
            level=ActivityLevel.INFO,
            username="api_user",
            entity_name="/api/v1/users",
            metadata={
                "method": "GET",
                "status_code": 200,
                "response_time_ms": 150,
                "endpoint": "/api/v1/users",
                "query_params": {"page": 1, "limit": 50}
            },
            tags=["api", "success", "users"],
            response_time_ms=150,
            risk_score=5
        )
        print(f"🌐 Created API call event with ID: {api_log.event_id}")
        
        # Demo 4: Data management event
        print("\n📊 Demo 4: Data Management Event")
        data_log = enhanced_logger.log_event(
            db=db,
            category=EventCategory.DATA_MANAGEMENT,
            action=ActivityAction.EXPORT,
            entity_type="dataset",
            description="User exported data in CSV format",
            level=ActivityLevel.INFO,
            username="data_analyst",
            entity_name="Customer Analytics Dataset",
            metadata={
                "export_format": "CSV",
                "record_count": 10000,
                "file_size_mb": 25.6,
                "columns": ["id", "name", "email", "created_at", "last_login"],
                "filters_applied": {
                    "date_range": "2024-01-01 to 2024-12-31",
                    "status": "active"
                }
            },
            tags=["data_export", "csv", "analytics"],
            affected_users_count=10000,
            risk_score=20
        )
        print(f"📊 Created data management event with ID: {data_log.event_id}")
        
        # Demo 5: System management event
        print("\n⚙️ Demo 5: System Management Event")
        system_log = enhanced_logger.log_event(
            db=db,
            category=EventCategory.SYSTEM_MANAGEMENT,
            action=ActivityAction.SYSTEM_EVENT,
            entity_type="configuration",
            description="System configuration updated by administrator",
            level=ActivityLevel.INFO,
            username="admin_user",
            entity_name="Application Settings",
            metadata={
                "settings_changed": [
                    "max_file_upload_size",
                    "session_timeout_minutes",
                    "enable_two_factor_auth"
                ],
                "previous_values": {
                    "max_file_upload_size": "10MB",
                    "session_timeout_minutes": 30,
                    "enable_two_factor_auth": False
                },
                "new_values": {
                    "max_file_upload_size": "50MB",
                    "session_timeout_minutes": 60,
                    "enable_two_factor_auth": True
                }
            },
            tags=["system_config", "admin", "security_improvement"],
            risk_score=15
        )
        print(f"⚙️ Created system management event with ID: {system_log.event_id}")
        
        print("\n📈 Event Logging Summary:")
        print("=" * 30)
        
        # Query recent events
        recent_events = enhanced_logger.get_recent_events(db, limit=5)
        for event in recent_events:
            print(f"🔹 {event.level.value.upper()}: {event.description}")
            print(f"   Category: {event.category.value} | Action: {event.action.value}")
            print(f"   Risk Score: {event.risk_score or 0} | Created: {event.created_at}")
            print()
        
        # Get event statistics
        stats = enhanced_logger.get_event_statistics(db)
        print("📊 Event Statistics:")
        print(f"   Total Events: {stats.get('total_events', 0)}")
        print(f"   Events Today: {stats.get('events_today', 0)}")
        print(f"   High Risk Events: {stats.get('high_risk_events', 0)}")
        print(f"   Most Active Category: {stats.get('most_active_category', 'N/A')}")
        
        print("\n✅ Enhanced logging demo completed successfully!")
        print("📁 Check the logs/ directory for file-based event logs")
        print("🗄️ Check the activity_logs table for database events")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    demo_enhanced_logging()