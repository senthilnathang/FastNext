#!/usr/bin/env python3
"""
Create import/export tables if they don't exist
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.db.base import Base
from app.models.data_import_export import ImportJob, ExportJob, ImportPermission, ExportPermission

def create_tables():
    """Create import/export tables"""
    
    try:
        # Create engine
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        
        print("Creating import/export tables...")
        
        # Import all models to ensure they're registered
        from app.models import data_import_export
        
        # Create tables
        Base.metadata.create_all(bind=engine, tables=[
            ImportJob.__table__,
            ExportJob.__table__, 
            ImportPermission.__table__,
            ExportPermission.__table__
        ])
        
        print("✅ Tables created successfully!")
        
        # Test if tables exist by running a simple query
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM import_jobs LIMIT 1"))
            print("✅ import_jobs table is accessible")
            
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM export_jobs LIMIT 1"))
            print("✅ export_jobs table is accessible")
            
        return True
        
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Creating Import/Export Database Tables...")
    print("=" * 50)
    
    success = create_tables()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Database tables are ready!")
    else:
        print("❌ Failed to create database tables!")
        sys.exit(1)