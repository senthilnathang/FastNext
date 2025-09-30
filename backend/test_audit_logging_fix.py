#!/usr/bin/env python3
"""
Test script to verify the audit logging fix for data import uploads
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.data_import_export import ImportAuditLog, ImportJob
from app.api.v1.data_import_export import _log_import_audit
from datetime import datetime
import json

def test_audit_logging():
    """Test that audit logging works correctly"""
    
    print("🧪 Testing audit logging functionality...")
    
    try:
        # Create database connection
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("✅ Database connection established")
        
        # Check if audit log table exists
        result = db.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'import_audit_logs'"))
        table_exists = result.scalar() > 0
        
        if not table_exists:
            print("❌ ImportAuditLog table does not exist. Run migrations first.")
            return False
            
        print("✅ ImportAuditLog table exists")
        
        # Test enhanced audit logging function
        test_event_data = {
            "table_name": "test_table",
            "filename": "test_file.csv",
            "file_size": 1024,
            "file_format": "csv",
            "total_rows": 100,
            "columns": ["col1", "col2", "col3"],
            "upload_stage": "file_processing_complete"
        }
        
        # Mock a job ID (in real scenario this would be from an actual import job)
        mock_job_id = 1
        mock_user_id = 1
        
        # Test the enhanced logging function
        try:
            _log_import_audit(db, mock_job_id, mock_user_id, "file_uploaded", test_event_data)
            print("✅ Enhanced audit logging function executed successfully")
        except Exception as e:
            print(f"❌ Enhanced audit logging failed: {e}")
            return False
        
        # Verify the log was created with enhanced data
        latest_log = db.query(ImportAuditLog).filter(
            ImportAuditLog.event_type == "file_uploaded"
        ).order_by(ImportAuditLog.timestamp.desc()).first()
        
        if latest_log:
            print("✅ Audit log entry created successfully")
            print(f"   - Event Type: {latest_log.event_type}")
            print(f"   - User ID: {latest_log.user_id}")
            print(f"   - Timestamp: {latest_log.timestamp}")
            
            if latest_log.event_data:
                print("✅ Enhanced event data stored:")
                event_data = latest_log.event_data
                print(f"   - Table Name: {event_data.get('table_name')}")
                print(f"   - Filename: {event_data.get('filename')}")
                print(f"   - File Size: {event_data.get('file_size')}")
                print(f"   - Upload Stage: {event_data.get('upload_stage')}")
                print(f"   - Total Rows: {event_data.get('total_rows')}")
                print(f"   - Columns: {event_data.get('columns')}")
            else:
                print("❌ Event data is missing or empty")
                return False
        else:
            print("❌ No audit log entry found")
            return False
        
        # Test different event types
        event_types_to_test = [
            ("job_created", {"job_id": "test-123", "status": "PARSED"}),
            ("validation_started", {"total_rows": 100, "validation_stage": "data_validation_initiated"}),
            ("validation_completed", {"is_valid": True, "valid_rows": 95, "error_rows": 5}),
            ("import_started", {"total_rows": 100, "table_name": "test_table"}),
            ("import_completed", {"processed_rows": 95, "valid_rows": 95, "error_rows": 0}),
            ("import_failed", {"error_message": "Test error", "failure_stage": "import_execution"})
        ]
        
        print("🧪 Testing different event types...")
        for event_type, event_data in event_types_to_test:
            try:
                _log_import_audit(db, mock_job_id, mock_user_id, event_type, event_data)
                print(f"✅ {event_type} logged successfully")
            except Exception as e:
                print(f"❌ Failed to log {event_type}: {e}")
                return False
        
        # Check total audit logs created
        total_logs = db.query(ImportAuditLog).filter(
            ImportAuditLog.import_job_id == mock_job_id
        ).count()
        
        print(f"✅ Total audit logs created: {total_logs}")
        
        # Clean up test data
        db.query(ImportAuditLog).filter(
            ImportAuditLog.import_job_id == mock_job_id
        ).delete()
        db.commit()
        
        print("✅ Test cleanup completed")
        
        db.close()
        
        print("🎉 All audit logging tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_audit_log_structure():
    """Test that audit logs have the correct structure"""
    
    print("🧪 Testing audit log database structure...")
    
    try:
        # Create database connection
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Check table columns
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'import_audit_logs'
            ORDER BY ordinal_position
        """))
        
        columns = result.fetchall()
        
        required_columns = {
            'id', 'import_job_id', 'user_id', 'event_type', 
            'event_data', 'timestamp', 'ip_address', 'user_agent'
        }
        
        existing_columns = {col[0] for col in columns}
        
        if required_columns.issubset(existing_columns):
            print("✅ All required columns exist in import_audit_logs table")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
        else:
            missing = required_columns - existing_columns
            print(f"❌ Missing columns: {missing}")
            return False
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Structure test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting audit logging tests...")
    
    # Test database structure first
    if not test_audit_log_structure():
        print("❌ Database structure test failed")
        sys.exit(1)
    
    # Test audit logging functionality
    if test_audit_logging():
        print("🎉 All tests passed! Audit logging fix is working correctly.")
        sys.exit(0)
    else:
        print("❌ Tests failed! Check the audit logging implementation.")
        sys.exit(1)