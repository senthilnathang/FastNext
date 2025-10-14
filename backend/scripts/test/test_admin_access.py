#!/usr/bin/env python3
"""
Test admin access to configuration endpoints
"""

import json
import sys

import requests


def test_admin_login_and_access():
    """Test admin login and access to configuration"""

    print("🔐 Testing Admin Access to Configuration")
    print("=" * 50)

    base_url = "http://localhost:8000"

    # Step 1: Login as admin
    print("1. 🔑 Attempting admin login...")
    try:
        login_data = {"username": "admin", "password": "AdminPassword123"}

        response = requests.post(
            f"{base_url}/api/v1/auth/login", json=login_data, timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("   ✅ Admin login successful")
            print(f"   Token: {token[:20] if token else 'None'}...")

            # Step 2: Test /auth/me endpoint
            print("\n2. 👤 Testing /auth/me endpoint...")
            headers = {"Authorization": f"Bearer {token}"}

            me_response = requests.get(
                f"{base_url}/api/v1/auth/me", headers=headers, timeout=5
            )

            if me_response.status_code == 200:
                user_data = me_response.json()
                print("   ✅ /auth/me successful")
                print(f"   Username: {user_data.get('username')}")
                print(f"   Is Superuser: {user_data.get('is_superuser')}")
                print(f"   Roles: {user_data.get('roles', [])}")
                print(f"   Permissions: {user_data.get('permissions', [])}")

                # Step 3: Test configuration endpoint
                print("\n3. ⚙️ Testing configuration endpoint...")
                config_response = requests.get(
                    f"{base_url}/api/v1/config/data-import-export/current",
                    headers=headers,
                    timeout=5,
                )

                if config_response.status_code == 200:
                    print("   ✅ Configuration endpoint accessible")
                    config_data = config_response.json()
                    print(f"   Config status: {config_data.get('status', 'unknown')}")
                else:
                    print(
                        f"   ❌ Configuration endpoint failed: {config_response.status_code}"
                    )
                    print(f"   Response: {config_response.text}")

            else:
                print(f"   ❌ /auth/me failed: {me_response.status_code}")
                print(f"   Response: {me_response.text}")

        elif response.status_code == 423:
            print("   ⚠️ Account locked - need to unlock admin user")
            return False
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    return True


def unlock_admin_user():
    """Unlock the admin user account"""
    print("\n🔓 Unlocking Admin User Account")
    print("=" * 40)

    try:
        import os
        import sys

        sys.path.append("/home/sen/FastNext/backend")

        from app.db.session import SessionLocal
        from app.models.user import User

        db = SessionLocal()

        try:
            admin = db.query(User).filter(User.username == "admin").first()
            if admin:
                admin.failed_login_attempts = 0
                admin.locked_until = None
                db.commit()
                print("✅ Admin user unlocked successfully")
                print(f"   Username: {admin.username}")
                print(f"   Is Superuser: {admin.is_superuser}")
                return True
            else:
                print("❌ Admin user not found")
                return False
        finally:
            db.close()

    except Exception as e:
        print(f"❌ Error unlocking admin user: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Admin Access Test")
    print("=" * 60)

    # First try to test access
    success = test_admin_login_and_access()

    # If login failed due to lock, unlock and try again
    if not success:
        if unlock_admin_user():
            print("\n" + "=" * 60)
            print("🔄 Retrying after unlocking admin user...")
            success = test_admin_login_and_access()

    print("\n" + "=" * 60)
    if success:
        print("✅ ADMIN ACCESS TEST PASSED")
        print("🛡️ Admin user can access configuration endpoints")
    else:
        print("❌ ADMIN ACCESS TEST FAILED")
        print("⚠️ Admin user cannot access configuration endpoints")
        sys.exit(1)
