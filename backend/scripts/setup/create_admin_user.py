#!/usr/bin/env python3
"""
Script to create or update an admin user for testing
"""
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

DB_AVAILABLE = True
SessionLocal = None
User = None
get_password_hash = None

try:
    from app.core.security import get_password_hash
    from app.db.session import SessionLocal
    from app.models.user import User
except ImportError as e:
    print(f"Database modules not available: {e}")
    print("Will show password hash instead")
    DB_AVAILABLE = False

    # Fallback password hashing
    import hashlib
    import secrets

    def get_password_hash(password: str) -> str:
        """Simple fallback password hashing"""
        salt = secrets.token_hex(16)
        return f"fallback_hash_{hashlib.sha256((salt + password).encode()).hexdigest()}"


def create_admin_user():
    """Create or update a superuser admin account"""
    # New password for admin user
    new_password = "FastNextAdmin2025!"
    hashed_password = get_password_hash(new_password)

    print("🔐 FastNext Admin User Credentials:")
    print("=" * 50)
    print(f"   Email: admin@example.com")
    print(f"   Username: admin")
    print(f"   Password: {new_password}")
    print(f"   Password Hash: {hashed_password}")
    print("=" * 50)

    if not DB_AVAILABLE:
        print("\n📝 Database not available. To update manually:")
        print(f"   UPDATE users SET hashed_password = '{hashed_password}' WHERE email = 'admin@example.com';")
        return None

    db = SessionLocal()

    try:
        # Try to update existing admin user first
        admin = db.query(User).filter(User.email == "admin@example.com").first()

        if admin:
            # Update existing admin user
            admin.hashed_password = hashed_password
            admin.is_active = True
            admin.is_superuser = True
            admin.is_verified = True
            admin.full_name = "System Administrator"

            db.commit()
            db.refresh(admin)

            print("✅ Admin user updated successfully in database!")
            return admin

        # If no admin exists, try to create one
        try:
            admin = User(
                email="admin@example.com",
                username="admin",
                full_name="System Administrator",
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True,
                is_verified=True,
            )

            db.add(admin)
            db.commit()
            db.refresh(admin)

            print("✅ Admin user created successfully in database!")
            return admin

        except Exception as create_error:
            print(f"⚠️  Could not create admin user: {create_error}")
            print("   User might already exist with different constraints")
            print("   Use the password hash above to update manually")
            return None

    except Exception as e:
        print(f"❌ Error with database operation: {e}")
        print("   Use the password hash above to update manually")
        return None
    finally:
        if 'db' in locals():
            db.close()


if __name__ == "__main__":
    create_admin_user()
