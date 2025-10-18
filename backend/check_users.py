#!/usr/bin/env python3
"""
Script to check user status
"""
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User

def check_users():
    """Check all users and their status"""
    db = SessionLocal()

    try:
        users = db.query(User).all()
        print("📋 User Status Report:")
        print("=" * 60)
        for user in users:
            status = "✅ ACTIVE" if user.is_active else "❌ INACTIVE"
            superuser = "👑 SUPERUSER" if user.is_superuser else ""
            print(f"ID: {user.id:2d} | Username: {user.username:15s} | Email: {user.email:25s} | {status} {superuser}")

        print("=" * 60)

        # Check specifically for admin2
        admin2 = db.query(User).filter(User.username == "admin2").first()
        if admin2:
            print(f"\n🔍 Admin2 user details:")
            print(f"   ID: {admin2.id}")
            print(f"   Username: {admin2.username}")
            print(f"   Email: {admin2.email}")
            print(f"   Active: {admin2.is_active}")
            print(f"   Superuser: {admin2.is_superuser}")
            print(f"   Verified: {admin2.is_verified}")

            if not admin2.is_active:
                print("   ⚠️  User is inactive - activating...")
                admin2.is_active = True
                db.commit()
                print("   ✅ User activated successfully!")
        else:
            print("   ❌ Admin2 user not found")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()