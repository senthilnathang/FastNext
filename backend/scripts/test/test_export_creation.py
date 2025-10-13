#!/usr/bin/env python3
"""
Test export job creation to identify the cause of 500 error
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from unittest.mock import Mock
from sqlalchemy.orm import Session
from app.models.data_import_export import ExportJob, ExportStatus, DataFormat
from app.schemas.data_import_export import ExportJobCreate, ExportOptionsSchema
import uuid

def test_export_job_creation():
    """Test creating an ExportJob object to identify issues"""
    
    print("Testing ExportJob creation...")
    
    try:
        # Create mock export request
        export_request = Mock()
        export_request.table_name = "projects"
        export_request.export_format = "csv"
        export_request.export_options = ExportOptionsSchema(
            format=DataFormat.CSV,
            include_headers=True,
            date_format="iso"
        )
        export_request.selected_columns = ["id", "name", "status"]
        export_request.filters = []
        
        # Test creating ExportJob object
        job_id = str(uuid.uuid4())
        
        export_job = ExportJob(
            job_id=job_id,
            table_name=export_request.table_name,
            status=ExportStatus.PENDING,
            export_format=export_request.export_format,
            export_options=export_request.export_options.model_dump(),
            selected_columns=export_request.selected_columns,
            filters=[f.model_dump() for f in export_request.filters],
            created_by=1
        )
        
        print(f"✅ ExportJob object created successfully")
        print(f"   Job ID: {export_job.job_id}")
        print(f"   Table: {export_job.table_name}")
        print(f"   Format: {export_job.export_format}")
        
        return True
        
    except Exception as e:
        print(f"❌ ExportJob creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_imports():
    """Test if all required models and schemas can be imported"""
    
    print("Testing imports...")
    
    try:
        from app.models.data_import_export import (
            ExportJob, ImportJob, ExportStatus, ImportStatus
        )
        from app.schemas.data_import_export import (
            ExportJobCreate, ExportJobResponse, ExportOptionsSchema
        )
        print("✅ All imports successful")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing Export Job Creation...")
    print("=" * 50)
    
    success1 = test_imports()
    success2 = test_export_job_creation()
    
    print("\n" + "=" * 50)
    if success1 and success2:
        print("✅ All tests passed!")
        print("   The issue might be database table missing or permission checks")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)