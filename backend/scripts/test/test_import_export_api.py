#!/usr/bin/env python3
"""
Test script to validate Import/Export API endpoints
"""
import json
import sys
from pathlib import Path

import requests


def test_api_health():
    """Test basic API health"""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ API Health check passed")
            return True
        else:
            print(f"❌ API Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(
            "❌ Could not connect to API. Make sure server is running on localhost:8000"
        )
        return False


def test_import_export_health():
    """Test import/export health endpoint"""
    try:
        # This would need authentication in a real scenario
        response = requests.get("http://localhost:8000/api/v1/data/health")
        if response.status_code == 200:
            print("✅ Import/Export health check passed")
            data = response.json()
            print(
                f"   - Import service: {data.get('import_service_status', 'unknown')}"
            )
            print(
                f"   - Export service: {data.get('export_service_status', 'unknown')}"
            )
            print(f"   - Active import jobs: {data.get('active_import_jobs', 0)}")
            print(f"   - Active export jobs: {data.get('active_export_jobs', 0)}")
            return True
        else:
            print(f"❌ Import/Export health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Import/Export API endpoints")
        return False
    except Exception as e:
        print(f"❌ Error testing import/export health: {e}")
        return False


def test_api_docs():
    """Test if API documentation is accessible"""
    try:
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ API Documentation is accessible at http://localhost:8000/docs")
            return True
        else:
            print(f"❌ API Documentation not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error accessing API docs: {e}")
        return False


def check_demo_files():
    """Check if demo files exist"""
    demo_dir = Path(__file__).parent / "demo_data"
    if not demo_dir.exists():
        print("❌ Demo data directory not found")
        return False

    expected_files = [
        "sample_users.csv",
        "sample_products.csv",
        "sample_orders.csv",
        "sample_customers.json",
    ]

    missing_files = []
    for filename in expected_files:
        file_path = demo_dir / filename
        if not file_path.exists():
            missing_files.append(filename)

    if missing_files:
        print(f"❌ Missing demo files: {', '.join(missing_files)}")
        return False
    else:
        print("✅ All demo files are present")
        print(f"   Demo files location: {demo_dir}")
        for filename in expected_files:
            file_path = demo_dir / filename
            size = file_path.stat().st_size
            print(f"   - {filename} ({size} bytes)")
        return True


def main():
    """Main test function"""
    print("🔄 Testing Import/Export API Integration")
    print("=" * 50)

    all_tests_passed = True

    # Test 1: Check demo files
    print("\n1. Checking demo files...")
    if not check_demo_files():
        all_tests_passed = False

    # Test 2: Basic API health
    print("\n2. Testing basic API health...")
    if not test_api_health():
        all_tests_passed = False
        print("\n⚠️  Server not running. To start the server:")
        print("   cd /home/sen/FastNext/backend")
        print("   source venv/bin/activate")
        print("   python main.py")
        return

    # Test 3: API Documentation
    print("\n3. Testing API documentation...")
    if not test_api_docs():
        all_tests_passed = False

    # Test 4: Import/Export specific endpoints
    print("\n4. Testing Import/Export endpoints...")
    if not test_import_export_health():
        all_tests_passed = False

    # Summary
    print("\n" + "=" * 50)
    if all_tests_passed:
        print(
            "✅ All tests passed! The Import/Export API is ready for frontend integration."
        )
        print("\n📋 Next Steps:")
        print("1. Start the frontend development server")
        print("2. Navigate to the Import/Export components")
        print("3. Test uploading the demo CSV/JSON files")
        print("4. Test exporting data from existing tables")
        print("\n🔗 Available Endpoints:")
        print("   - Import: POST /api/v1/data/import/upload")
        print("   - Export: POST /api/v1/data/export/create")
        print("   - Health: GET /api/v1/data/health")
        print("   - Docs: http://localhost:8000/docs")
    else:
        print("❌ Some tests failed. Please check the output above.")


if __name__ == "__main__":
    main()
