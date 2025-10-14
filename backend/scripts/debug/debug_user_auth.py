#!/usr/bin/env python3
"""
Debug user authentication and role information
"""

import json

import requests


def debug_user_auth():
    """Debug user authentication and check what data frontend receives"""

    print("🔍 Debugging User Authentication Data")
    print("=" * 60)

    base_url = "http://localhost:8000"

    # Step 1: Login and get user data
    print("1. 🔑 Admin Login...")
    try:
        login_data = {"username": "admin", "password": "AdminPassword123"}

        response = requests.post(
            f"{base_url}/api/v1/auth/login", json=login_data, timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("   ✅ Login successful")

            # Step 2: Get detailed user information
            print("\n2. 👤 Getting user details from /auth/me...")
            headers = {"Authorization": f"Bearer {token}"}

            me_response = requests.get(
                f"{base_url}/api/v1/auth/me", headers=headers, timeout=5
            )

            if me_response.status_code == 200:
                user_data = me_response.json()
                print("   ✅ User data retrieved successfully")
                print("\n📊 User Data Analysis:")
                print(f"   ID: {user_data.get('id')}")
                print(f"   Username: {user_data.get('username')}")
                print(f"   Email: {user_data.get('email')}")
                print(f"   Is Active: {user_data.get('is_active')}")
                print(f"   Is Verified: {user_data.get('is_verified')}")
                print(f"   Is Superuser: {user_data.get('is_superuser')}")
                print(f"   Roles: {user_data.get('roles', [])}")
                print(f"   Permissions: {user_data.get('permissions', [])}")

                print("\n🔍 Authentication Analysis:")

                # Check superuser status
                is_superuser = user_data.get("is_superuser", False)
                if is_superuser:
                    print("   ✅ User HAS superuser status - should bypass all checks")
                else:
                    print("   ❌ User DOES NOT have superuser status")

                # Check admin role
                roles = user_data.get("roles", [])
                if "admin" in roles:
                    print("   ✅ User HAS admin role")
                else:
                    print("   ❌ User DOES NOT have admin role")

                # Check specific permissions
                permissions = user_data.get("permissions", [])
                print(f"\n   📋 Available Permissions ({len(permissions)}):")
                for perm in permissions:
                    print(f"      - {perm}")

                print("\n🎯 Route Access Analysis:")
                print("   For /admin/data-import route:")
                print("   Required: roles=['admin', 'superuser']")

                if is_superuser:
                    print("   ✅ ACCESS GRANTED: Superuser bypasses all checks")
                elif "admin" in roles:
                    print("   ✅ ACCESS GRANTED: User has admin role")
                else:
                    print("   ❌ ACCESS DENIED: User lacks required roles")

                return user_data

            else:
                print(f"   ❌ Failed to get user data: {me_response.status_code}")
                print(f"   Response: {me_response.text}")

        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"   ❌ Error: {e}")

    return None


def test_frontend_auth_logic(user_data):
    """Test the frontend authentication logic"""

    if not user_data:
        return

    print("\n🖥️ Testing Frontend Auth Logic")
    print("=" * 60)

    # Simulate the frontend AuthGuard logic
    def hasRequiredRoles(userRoles, requiredRoles, isSuperuser=False):
        """Frontend logic simulation"""
        if isSuperuser:
            return True
        if not requiredRoles:
            return True
        return any(role in userRoles for role in requiredRoles)

    # Test data
    user_roles = user_data.get("roles", [])
    is_superuser = user_data.get("is_superuser", False)
    required_roles = ["admin", "superuser"]

    print(f"User Roles: {user_roles}")
    print(f"Is Superuser: {is_superuser}")
    print(f"Required Roles: {required_roles}")

    # Test the logic
    has_access = hasRequiredRoles(user_roles, required_roles, is_superuser)

    print(f"\n🔍 Frontend Logic Test:")
    print(f"   hasRequiredRoles() result: {has_access}")

    if has_access:
        print("   ✅ FRONTEND SHOULD GRANT ACCESS")
    else:
        print("   ❌ FRONTEND SHOULD DENY ACCESS")

        # Debug why access was denied
        print("\n🐛 Debug Analysis:")
        if not is_superuser:
            print("   - User is NOT superuser")
        if not any(role in user_roles for role in required_roles):
            print("   - User roles don't match required roles")
            print(f"     User has: {user_roles}")
            print(f"     Needs one of: {required_roles}")


if __name__ == "__main__":
    print("🔍 User Authentication Debug Tool")
    print("=" * 70)

    user_data = debug_user_auth()
    test_frontend_auth_logic(user_data)

    print("\n" + "=" * 70)
    print("🎯 Summary:")
    print("If user has is_superuser=True OR role='admin', access should be granted")
    print("Check frontend console logs for AuthGuard debug information")
    print("=" * 70)
