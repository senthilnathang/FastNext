#!/usr/bin/env python3
"""
Migration runner script for enhanced activity log
This script applies the database migration for the enhanced event logging system
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from alembic.config import Config
from alembic import command
from app.core.config import settings

def run_migration():
    """Run the enhanced activity log migration"""
    
    print("🚀 Starting Enhanced Activity Log Migration...")
    
    # Set up Alembic configuration
    alembic_cfg = Config("alembic.ini")
    
    # Set the database URL
    alembic_cfg.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_DATABASE_URI)
    
    try:
        # Check current revision
        print("📊 Checking current database revision...")
        
        # Run the migration
        print("🔄 Applying enhanced activity log migration...")
        command.upgrade(alembic_cfg, "enhance_activity_log_for_events")
        
        print("✅ Migration completed successfully!")
        print("\n📋 Enhanced Activity Log Features Added:")
        print("   - Event identification (event_id, correlation_id)")
        print("   - Enhanced categorization (EventCategory enum)")
        print("   - Request metadata (headers, response times)")
        print("   - Geographic tracking (country, city)")
        print("   - Risk assessment (risk_score, affected_users)")
        print("   - System context (server, environment, version)")
        print("   - JSON metadata and tags")
        print("   - Performance indexes")
        
        print("\n🎯 Next Steps:")
        print("   1. Restart your FastAPI server")
        print("   2. Test the event logging endpoints at /docs#/v1-events")
        print("   3. Access the admin dashboard at /admin/events")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure database is running and accessible")
        print("   2. Check database connection settings")
        print("   3. Verify alembic.ini configuration")
        print("   4. Check migration file syntax")
        return False
    
    return True

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)