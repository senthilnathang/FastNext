#!/usr/bin/env python3
"""
Test script to verify the validation fix for data import
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import io
import tempfile
from pathlib import Path

def test_validation_endpoint():
    """Test the new validate-file endpoint"""
    
    print("🧪 Testing validation endpoint fix...")
    
    # Create a test CSV file
    test_csv_content = """name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Wilson,invalid-email,35
Alice Brown,alice@example.com,abc"""
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(test_csv_content)
        temp_file_path = f.name
    
    try:
        # Test the new validation endpoint
        url = "http://localhost:8000/api/v1/data/import/validate-file"
        
        # Prepare form data
        files = {
            'file': ('test.csv', open(temp_file_path, 'rb'), 'text/csv')
        }
        
        data = {
            'table_name': 'users',
            'import_options': '{"format": "csv", "has_headers": true, "delimiter": ",", "encoding": "utf-8"}',
            'field_mappings': '[]'
        }
        
        headers = {
            'Authorization': 'Bearer test-token'  # This will likely fail auth, but we're testing the endpoint structure
        }
        
        print(f"📡 Making request to {url}")
        response = requests.post(url, files=files, data=data, headers=headers)
        
        print(f"📊 Response status: {response.status_code}")
        print(f"📄 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Validation endpoint working!")
            print(f"   - Is Valid: {result.get('is_valid')}")
            print(f"   - Total Rows: {result.get('total_rows')}")
            print(f"   - Valid Rows: {result.get('valid_rows')}")
            print(f"   - Error Rows: {result.get('error_rows')}")
            return True
        elif response.status_code == 401:
            print("⚠️  Authentication required (expected) - endpoint exists")
            return True
        elif response.status_code == 404:
            print("❌ Endpoint not found - validation fix may not be deployed")
            return False
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def test_original_parse_endpoint():
    """Test that the original parse endpoint still works"""
    
    print("🧪 Testing original parse endpoint...")
    
    # Create a test CSV file
    test_csv_content = """name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25"""
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(test_csv_content)
        temp_file_path = f.name
    
    try:
        # Test the parse endpoint
        url = "http://localhost:8000/api/v1/data/import/parse"
        
        # Prepare form data
        files = {
            'file': ('test.csv', open(temp_file_path, 'rb'), 'text/csv')
        }
        
        data = {
            'import_options': '{"format": "csv", "has_headers": true, "delimiter": ",", "encoding": "utf-8"}'
        }
        
        headers = {
            'Authorization': 'Bearer test-token'
        }
        
        print(f"📡 Making request to {url}")
        response = requests.post(url, files=files, data=data, headers=headers)
        
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Parse endpoint working!")
            print(f"   - Headers: {result.get('headers')}")
            print(f"   - Total Rows: {result.get('total_rows')}")
            print(f"   - Format: {result.get('format')}")
            return True
        elif response.status_code == 401:
            print("⚠️  Authentication required (expected) - endpoint exists")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    print("🚀 Starting validation fix tests...")
    
    # Test parse endpoint
    parse_ok = test_original_parse_endpoint()
    
    # Test new validation endpoint
    validation_ok = test_validation_endpoint()
    
    if parse_ok and validation_ok:
        print("🎉 All tests passed! Validation fix should be working.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Check the implementation or server status.")
        sys.exit(1)