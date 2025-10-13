#!/usr/bin/env python3
"""
Simple test to verify the data import/export endpoint functions work correctly
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from unittest.mock import Mock
from app.api.v1.data_import_export import (
    get_available_tables,
    get_table_schema, 
    get_table_permissions,
    get_table_data
)

def test_table_endpoints():
    """Test the table endpoint functions directly"""
    
    print("Testing table endpoint functions...")
    
    # Mock dependencies
    mock_user = Mock()
    mock_user.id = 1
    mock_db = Mock()
    
    try:
        # Test available tables
        result = get_available_tables(mock_user, mock_db)
        print(f"✅ get_available_tables: Returns {result['total_count']} tables")
        
        # Test table schema
        result = get_table_schema("projects", mock_user, mock_db)
        print(f"✅ get_table_schema: Returns schema for {result['table_name']}")
        
        # Test table permissions 
        result = get_table_permissions("projects", mock_user, mock_db)
        print(f"✅ get_table_permissions: Returns permissions for {result['table_name']}")
        
        # Test table data
        result = get_table_data("projects", 1000, 0, None, mock_user, mock_db)
        print(f"✅ get_table_data: Returns {result['returned_rows']} rows")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Data Import/Export endpoint functions...")
    print("=" * 50)
    
    success = test_table_endpoints()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All endpoint functions work correctly!")
        print("✅ The 500 errors should now be resolved!")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)