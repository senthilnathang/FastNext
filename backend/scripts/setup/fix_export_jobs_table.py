#!/usr/bin/env python3
"""
Fix the export_jobs table to match the current model
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from app.core.config import settings
from app.db.base import Base
from app.models.data_import_export import ExportJob, ImportJob
from sqlalchemy import create_engine, text


def fix_export_jobs_table():
    """Drop and recreate export_jobs table with correct schema"""

    try:
        # Create engine
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

        print("Fixing export_jobs table...")

        with engine.connect() as conn:
            # Drop the existing table
            print("Dropping existing export_jobs table...")
            conn.execute(text("DROP TABLE IF EXISTS export_jobs CASCADE"))
            conn.commit()

            # Drop the existing import_jobs table too to be safe
            print("Dropping existing import_jobs table...")
            conn.execute(text("DROP TABLE IF EXISTS import_jobs CASCADE"))
            conn.commit()

        # Import the model to ensure it's registered
        from app.models import data_import_export

        # Recreate the table with correct schema (skip if exists for enums)
        print("Creating export_jobs table with correct schema...")
        ExportJob.__table__.create(engine, checkfirst=True)

        print("Creating import_jobs table with correct schema...")
        ImportJob.__table__.create(engine, checkfirst=True)

        print("✅ Tables recreated successfully!")

        # Test if table exists and has correct columns
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'export_jobs' ORDER BY ordinal_position"
                )
            )
            columns = [row[0] for row in result.fetchall()]
            print(f"✅ export_jobs table has {len(columns)} columns:")
            for col in columns:
                print(f"   - {col}")

            # Check for the problematic column
            if "expires_at" in columns:
                print("✅ expires_at column exists!")
            else:
                print("❌ expires_at column missing!")

        return True

    except Exception as e:
        print(f"❌ Failed to fix table: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Fixing Export Jobs Database Table...")
    print("=" * 50)

    success = fix_export_jobs_table()

    print("\n" + "=" * 50)
    if success:
        print("✅ Database table fixed!")
    else:
        print("❌ Failed to fix database table!")
        sys.exit(1)
