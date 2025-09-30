#!/usr/bin/env python3
"""
Script to validate the demo data files for project import
"""
import csv
import json
from pathlib import Path

def validate_csv_file(filename):
    """Validate CSV demo data file"""
    print(f"\n🔍 Validating {filename}...")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            rows = list(reader)
        
        print(f"   📊 Headers: {headers}")
        print(f"   📈 Total rows: {len(rows)}")
        
        # Check required fields
        required_fields = ['name', 'user_id']
        missing_required = [field for field in required_fields if field not in headers]
        
        if missing_required:
            print(f"   ❌ Missing required fields: {missing_required}")
            return False
        
        # Validate sample rows
        valid_rows = 0
        error_rows = 0
        
        for i, row in enumerate(rows[:5], 1):  # Check first 5 rows
            errors = []
            
            # Check name
            if not row.get('name', '').strip():
                errors.append("Missing name")
            
            # Check user_id
            try:
                user_id = row.get('user_id', '')
                if user_id.strip():
                    int(user_id)
            except ValueError:
                errors.append("Invalid user_id")
            
            # Check is_public
            is_public = row.get('is_public', '').lower()
            if is_public and is_public not in ['true', 'false', '1', '0']:
                errors.append("Invalid is_public value")
            
            if errors:
                print(f"   ⚠️  Row {i} errors: {', '.join(errors)}")
                error_rows += 1
            else:
                valid_rows += 1
        
        print(f"   ✅ Sample validation: {valid_rows} valid, {error_rows} with errors (from first 5 rows)")
        return True
        
    except FileNotFoundError:
        print(f"   ❌ File not found: {filename}")
        return False
    except Exception as e:
        print(f"   ❌ Error validating file: {e}")
        return False

def validate_json_file(filename):
    """Validate JSON demo data file"""
    print(f"\n🔍 Validating {filename}...")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            print("   ❌ JSON should contain an array of projects")
            return False
        
        print(f"   📈 Total records: {len(data)}")
        
        # Validate sample records
        for i, record in enumerate(data[:3], 1):  # Check first 3 records
            errors = []
            
            if not isinstance(record, dict):
                errors.append("Record should be an object")
                continue
            
            if not record.get('name', '').strip():
                errors.append("Missing name")
            
            if 'user_id' not in record or not isinstance(record['user_id'], int):
                errors.append("Invalid or missing user_id")
            
            if errors:
                print(f"   ⚠️  Record {i} errors: {', '.join(errors)}")
            else:
                print(f"   ✅ Record {i}: '{record.get('name', 'Unknown')}' - Valid")
        
        return True
        
    except FileNotFoundError:
        print(f"   ❌ File not found: {filename}")
        return False
    except json.JSONDecodeError as e:
        print(f"   ❌ Invalid JSON: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error validating file: {e}")
        return False

def main():
    print("🚀 Validating Demo Data Files for Project Import")
    print("=" * 50)
    
    # List of files to validate
    csv_files = [
        'projects_demo_data.csv',
        'projects_simple_demo.csv', 
        'projects_with_errors.csv'
    ]
    
    json_files = [
        'projects_demo_data.json'
    ]
    
    # Validate CSV files
    csv_results = []
    for filename in csv_files:
        result = validate_csv_file(filename)
        csv_results.append(result)
    
    # Validate JSON files
    json_results = []
    for filename in json_files:
        result = validate_json_file(filename)
        json_results.append(result)
    
    # Summary
    print(f"\n📋 Validation Summary:")
    print(f"   CSV files: {sum(csv_results)}/{len(csv_files)} valid")
    print(f"   JSON files: {sum(json_results)}/{len(json_files)} valid")
    
    if all(csv_results + json_results):
        print("🎉 All demo data files are valid and ready for import testing!")
    else:
        print("❌ Some files have issues. Please check the errors above.")

if __name__ == "__main__":
    main()