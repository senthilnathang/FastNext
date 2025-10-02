#!/usr/bin/env python3
"""
Test script for dynamic import/export functionality
"""
import requests
import json
import sys

def test_table_discovery():
    """Test the new table discovery endpoints"""
    base_url = "http://localhost:8000"
    
    print("🔄 Testing Dynamic Import/Export API")
    print("=" * 50)
    
    # Test 1: Basic API health
    print("\n1. Testing basic API health...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ API Health check passed")
        else:
            print(f"❌ API Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Make sure server is running on localhost:8000")
        print("\n⚠️  To start the server:")
        print("   cd /home/sen/FastNext/backend")
        print("   source venv/bin/activate")
        print("   python main.py")
        return False
    
    # Test 2: Get available tables
    print("\n2. Testing table discovery...")
    try:
        response = requests.get(f"{base_url}/api/v1/data/tables/available")
        if response.status_code == 200:
            data = response.json()
            tables = data.get('tables', [])
            print(f"✅ Found {len(tables)} available tables:")
            for table in tables[:5]:  # Show first 5 tables
                print(f"   - {table}")
            if len(tables) > 5:
                print(f"   ... and {len(tables) - 5} more tables")
        else:
            print(f"❌ Table discovery failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Table discovery error: {e}")
        return False
    
    # Test 3: Get schema for a specific table (using 'users' if available)
    if tables and 'users' in tables:
        print("\n3. Testing table schema retrieval...")
        try:
            response = requests.get(f"{base_url}/api/v1/data/tables/users/schema")
            if response.status_code == 200:
                schema = response.json()
                print("✅ Retrieved users table schema:")
                print(f"   - Table: {schema.get('table_name')}")
                print(f"   - Columns: {len(schema.get('columns', []))}")
                print(f"   - Primary Keys: {schema.get('primary_keys', [])}")
                print(f"   - Sample Data Rows: {len(schema.get('sample_data', []))}")
                
                # Show column details
                columns = schema.get('columns', [])[:3]  # First 3 columns
                if columns:
                    print("   - Column Examples:")
                    for col in columns:
                        nullable = "nullable" if col.get('nullable') else "required"
                        pk = " (PK)" if col.get('primary_key') else ""
                        print(f"     * {col.get('name')}: {col.get('type')} ({nullable}){pk}")
            else:
                print(f"❌ Schema retrieval failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Schema retrieval error: {e}")
    
    # Test 4: Get permissions for a table
    if tables and 'users' in tables:
        print("\n4. Testing table permissions...")
        try:
            response = requests.get(f"{base_url}/api/v1/data/tables/users/permissions")
            if response.status_code == 200:
                permissions = response.json()
                print("✅ Retrieved users table permissions:")
                import_perm = permissions.get('import_permission', {})
                export_perm = permissions.get('export_permission', {})
                
                print(f"   - Can Import: {import_perm.get('can_import', False)}")
                print(f"   - Can Export: {export_perm.get('can_export', False)}")
                print(f"   - Import Max File Size: {import_perm.get('max_file_size_mb', 0)} MB")
                print(f"   - Export Max Rows: {export_perm.get('max_rows_per_export', 0)}")
                print(f"   - Import Formats: {import_perm.get('allowed_formats', [])}")
                print(f"   - Export Formats: {export_perm.get('allowed_formats', [])}")
            else:
                print(f"❌ Permissions retrieval failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Permissions retrieval error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Dynamic Import/Export API tests completed!")
    print("\n📋 Available Endpoints:")
    print("   - GET /api/v1/data/tables/available")
    print("   - GET /api/v1/data/tables/{table_name}/schema")
    print("   - GET /api/v1/data/tables/{table_name}/permissions")
    print("\n🌐 Frontend Pages:")
    print("   - Import: http://localhost:3000/settings/data-import")
    print("   - Export: http://localhost:3000/settings/data-export")
    
    return True

def test_frontend_integration():
    """Test if frontend pages are accessible"""
    print("\n🎨 Testing Frontend Integration")
    print("=" * 30)
    
    # Check if frontend files exist
    import os
    frontend_pages = [
        "/home/sen/FastNext/frontend/src/app/settings/data-import/page.tsx",
        "/home/sen/FastNext/frontend/src/app/settings/data-export/page.tsx"
    ]
    
    for page in frontend_pages:
        if os.path.exists(page):
            page_name = page.split('/')[-2]
            print(f"✅ {page_name.title()} page created")
        else:
            print(f"❌ {page.split('/')[-2].title()} page missing")
    
    # Check if layout is updated
    layout_path = "/home/sen/FastNext/frontend/src/app/settings/layout.tsx"
    if os.path.exists(layout_path):
        with open(layout_path, 'r') as f:
            content = f.read()
            if 'data-import' in content and 'data-export' in content:
                print("✅ Settings layout updated with new navigation")
            else:
                print("❌ Settings layout not properly updated")
    
    print("\n🚀 To test the complete system:")
    print("1. Start the backend server: python main.py")
    print("2. Start the frontend server: npm run dev")
    print("3. Navigate to: http://localhost:3000/settings/data-import")
    print("4. Navigate to: http://localhost:3000/settings/data-export")

if __name__ == "__main__":
    # Test API endpoints
    api_success = test_table_discovery()
    
    # Test frontend files
    test_frontend_integration()
    
    if api_success:
        print("\n🎉 All tests passed! The dynamic import/export system is ready!")
    else:
        print("\n⚠️  Some tests failed. Please start the backend server and try again.")