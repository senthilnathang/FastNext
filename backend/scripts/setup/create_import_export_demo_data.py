#!/usr/bin/env python3
"""
Create demo data for import/export testing
"""
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.db.base import SessionLocal
from app.models.data_import_export import ImportPermission, ExportPermission
from app.models.user import User


def create_demo_permissions():
    """Create demo permissions for import/export"""
    
    session = SessionLocal()
    try:
        # Get the first user (admin user) for demo permissions
        user = session.query(User).first()
        
        if not user:
            print("No users found. Please create a user first.")
            return
        
        print(f"Creating demo permissions for user: {user.email}")
        
        # Common tables for testing
        test_tables = ["users", "products", "orders", "customers"]
        
        for table_name in test_tables:
            # Check if import permission already exists
            existing_import = session.query(ImportPermission).filter(
                ImportPermission.user_id == user.id,
                ImportPermission.table_name == table_name
            ).first()
            
            if not existing_import:
                # Create import permission
                import_permission = ImportPermission(
                    user_id=user.id,
                    table_name=table_name,
                    can_import=True,
                    can_validate=True,
                    can_preview=True,
                    max_file_size_mb=50,
                    max_rows_per_import=50000,
                    allowed_formats=["csv", "json", "excel", "xml"],
                    requires_approval=False
                )
                session.add(import_permission)
                print(f"Created import permission for table: {table_name}")
            
            # Check if export permission already exists
            existing_export = session.query(ExportPermission).filter(
                ExportPermission.user_id == user.id,
                ExportPermission.table_name == table_name
            ).first()
            
            if not existing_export:
                # Create export permission
                export_permission = ExportPermission(
                    user_id=user.id,
                    table_name=table_name,
                    can_export=True,
                    can_preview=True,
                    max_rows_per_export=200000,
                    allowed_formats=["csv", "json", "excel", "xml"],
                    allowed_columns=[]  # Empty means all columns allowed
                )
                session.add(export_permission)
                print(f"Created export permission for table: {table_name}")
        
        session.commit()
        print("Demo permissions created successfully!")
        
    except Exception as e:
        session.rollback()
        print(f"Error creating demo permissions: {e}")
        raise
    finally:
        session.close()


def create_sample_csv_files():
    """Create sample CSV files for testing import"""
    
    # Create demo directory if it doesn't exist
    demo_dir = Path(__file__).parent / "demo_data"
    demo_dir.mkdir(exist_ok=True)
    
    # Sample user data
    users_csv = """name,email,age,department
John Doe,john.doe@example.com,30,Engineering
Jane Smith,jane.smith@example.com,25,Marketing
Bob Johnson,bob.johnson@example.com,35,Sales
Alice Brown,alice.brown@example.com,28,HR
Charlie Wilson,charlie.wilson@example.com,32,Finance"""
    
    # Sample product data
    products_csv = """name,sku,price,category,stock
Laptop Pro,LP001,1299.99,Electronics,50
Wireless Mouse,WM002,29.99,Electronics,200
Office Chair,OC003,149.99,Furniture,75
Desk Lamp,DL004,39.99,Furniture,100
Notebook,NB005,4.99,Office Supplies,500"""
    
    # Sample orders data
    orders_csv = """order_id,customer_email,product_sku,quantity,order_date,total
ORD001,john.doe@example.com,LP001,1,2023-10-01,1299.99
ORD002,jane.smith@example.com,WM002,2,2023-10-02,59.98
ORD003,bob.johnson@example.com,OC003,1,2023-10-03,149.99
ORD004,alice.brown@example.com,DL004,3,2023-10-04,119.97
ORD005,charlie.wilson@example.com,NB005,10,2023-10-05,49.90"""
    
    # Write CSV files
    files = {
        "sample_users.csv": users_csv,
        "sample_products.csv": products_csv,
        "sample_orders.csv": orders_csv
    }
    
    for filename, content in files.items():
        file_path = demo_dir / filename
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Created demo file: {file_path}")
    
    # Create sample JSON file
    sample_json = {
        "customers": [
            {
                "id": 1,
                "name": "ACME Corp",
                "email": "contact@acme.com",
                "phone": "+1-555-0123",
                "address": "123 Business St, City, State 12345",
                "status": "active"
            },
            {
                "id": 2,
                "name": "Global Industries",
                "email": "info@global.com",
                "phone": "+1-555-0456",
                "address": "456 Corporate Ave, City, State 67890",
                "status": "active"
            },
            {
                "id": 3,
                "name": "Tech Solutions",
                "email": "hello@techsolutions.com",
                "phone": "+1-555-0789",
                "address": "789 Innovation Blvd, City, State 11111",
                "status": "pending"
            }
        ]
    }
    
    json_file = demo_dir / "sample_customers.json"
    with open(json_file, 'w') as f:
        json.dump(sample_json, f, indent=2)
    print(f"Created demo file: {json_file}")
    
    print(f"\nDemo files created in: {demo_dir}")
    print("\nFiles available for testing:")
    for file in demo_dir.glob("*"):
        print(f"  - {file.name}")


def main():
    """Main function to create all demo data"""
    print("Creating Import/Export demo data...")
    
    # Create demo permissions
    create_demo_permissions()
    
    # Create sample files
    create_sample_csv_files()
    
    print("\n✅ Demo data creation completed!")
    print("\nYou can now test:")
    print("1. Import functionality with the sample CSV/JSON files")
    print("2. Export functionality with the demo permissions")
    print("3. Frontend integration with the backend APIs")


if __name__ == "__main__":
    main()