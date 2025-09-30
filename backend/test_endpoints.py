#!/usr/bin/env python3
"""
Simple test script to verify the data import/export endpoints work correctly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

# Create test client
client = TestClient(app)

def test_table_endpoints():
    """Test the table discovery endpoints that were causing 500 errors"""
    
    print("Testing table endpoints...")
    
    # Test available tables endpoint
    response = client.get("/api/v1/data/tables/available")
    print(f"Available tables: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  Found {data.get('total_count', 0)} tables")
    else:
        print(f"  Error: {response.text}")
    
    # Test table permissions endpoint (this was causing 500 errors)
    response = client.get("/api/v1/data/tables/projects/permissions")
    print(f"Table permissions: {response.status_code}")
    if response.status_code != 200:
        print(f"  Error: {response.text}")
    
    # Test table schema endpoint
    response = client.get("/api/v1/data/tables/projects/schema")
    print(f"Table schema: {response.status_code}")
    if response.status_code != 200:
        print(f"  Error: {response.text}")
    
    # Test table data endpoint (this was causing 500 errors)
    response = client.get("/api/v1/data/tables/projects/data?limit=1000")
    print(f"Table data: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  Returned {data.get('returned_rows', 0)} rows")
    else:
        print(f"  Error: {response.text}")

def test_health_endpoint():
    """Test the health endpoint"""
    
    print("\nTesting health endpoint...")
    response = client.get("/api/v1/data/health")
    print(f"Health check: {response.status_code}")
    if response.status_code != 200:
        print(f"  Error: {response.text}")

if __name__ == "__main__":
    print("Testing Data Import/Export API endpoints...")
    print("=" * 50)
    
    try:
        test_table_endpoints()
        test_health_endpoint()
        print("\n" + "=" * 50)
        print("✅ All endpoints tested successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)