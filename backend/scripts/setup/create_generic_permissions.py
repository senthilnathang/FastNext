#!/usr/bin/env python3

import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from app.db.session import get_db
from app.services.permission_service import PermissionService


def create_generic_permissions():
    db = next(get_db())

    try:
        print("🚀 Creating generic permissions for all resource types...")

        # Create generic permissions for all resource types
        PermissionService.create_generic_permissions(db)

        print("✅ Generic permissions created successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_generic_permissions()