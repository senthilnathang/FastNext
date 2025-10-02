#!/usr/bin/env python3
"""
Test the /api/v1/auth/me endpoint to check for encoding issues
"""

import requests
import json

def test_auth_me_endpoint():
    """Test the auth/me endpoint with various scenarios"""
    
    print("🧪 Testing /api/v1/auth/me Endpoint")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Test 1: No authentication
    print("1. Testing without authentication...")
    try:
        response = requests.get(f"{base_url}/api/v1/auth/me", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Expected: 401 Unauthorized")
        if response.status_code == 401:
            print("   ✅ Correctly rejects unauthenticated request")
        else:
            print("   ❌ Unexpected response for unauthenticated request")
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Invalid token
    print("\n2. Testing with invalid token...")
    try:
        headers = {"Authorization": "Bearer invalid_token_123"}
        response = requests.get(f"{base_url}/api/v1/auth/me", headers=headers, timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Expected: 401 Unauthorized")
        if response.status_code == 401:
            print("   ✅ Correctly rejects invalid token")
        else:
            print("   ❌ Unexpected response for invalid token")
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Test login endpoint to see if it works
    print("\n3. Testing login endpoint...")
    try:
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Login successful")
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"   Token received: {token[:20]}...")
                
                # Test 4: Use valid token
                print("\n4. Testing with valid token...")
                try:
                    headers = {"Authorization": f"Bearer {token}"}
                    response = requests.get(f"{base_url}/api/v1/auth/me", headers=headers, timeout=5)
                    print(f"   Status: {response.status_code}")
                    if response.status_code == 200:
                        print("   ✅ Successfully authenticated with valid token")
                        user_data = response.json()
                        print(f"   User: {user_data.get('username', 'N/A')}")
                    else:
                        print(f"   ❌ Unexpected response: {response.text}")
                except Exception as e:
                    print(f"   ❌ Error with valid token: {e}")
        else:
            print(f"   ⚠️ Login failed: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed. Check server logs for any encoding errors.")

if __name__ == "__main__":
    test_auth_me_endpoint()