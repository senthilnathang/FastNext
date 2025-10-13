#!/usr/bin/env python3
"""
Script to create an admin user for testing
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin_user():
    """Create a superuser admin account"""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        
        if admin:
            print("✅ Admin user already exists")
            print(f"   Email: {admin.email}")
            print(f"   Username: {admin.username}")
            print(f"   Is Superuser: {admin.is_superuser}")
            return admin
        
        # Create admin user
        admin = User(
            email="admin@example.com",
            username="admin",
            full_name="System Administrator",
            hashed_password=get_password_hash("AdminPassword123"),
            is_active=True,
            is_superuser=True,
            is_verified=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {admin.email}")
        print(f"   Username: {admin.username}")
        print(f"   Password: AdminPassword123")
        print(f"   Is Superuser: {admin.is_superuser}")
        
        return admin
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()