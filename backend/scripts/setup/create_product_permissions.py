#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_db
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.models.user_role import RolePermission

def create_product_permissions():
    db = next(get_db())
    
    try:
        # Create product permissions
        product_permissions = [
            {"name": "product_create", "action": "create", "resource": "product", "category": "product", "description": "Create products"},
            {"name": "product_read", "action": "read", "resource": "product", "category": "product", "description": "View products"},
            {"name": "product_update", "action": "update", "resource": "product", "category": "product", "description": "Edit products"},
            {"name": "product_delete", "action": "delete", "resource": "product", "category": "product", "description": "Delete products"},
            {"name": "product_manage", "action": "manage", "resource": "product", "category": "product", "description": "Full product management"},
        ]
        
        created_permissions = []
        for perm_data in product_permissions:
            # Check if permission already exists
            existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
            if not existing:
                permission = Permission(**perm_data)
                db.add(permission)
                created_permissions.append(permission)
                print(f"Created permission: {perm_data['name']}")
            else:
                print(f"Permission already exists: {perm_data['name']}")
        
        db.commit()
        
        # Assign product permissions to admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            for permission in created_permissions:
                # Check if role-permission relationship already exists
                existing_rp = db.query(RolePermission).filter(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == permission.id
                ).first()
                
                if not existing_rp:
                    role_permission = RolePermission(
                        role_id=admin_role.id,
                        permission_id=permission.id
                    )
                    db.add(role_permission)
                    print(f"Assigned {permission.name} to admin role")
            db.commit()
            print("Product permissions assigned to admin role")
        else:
            print("Admin role not found")
        
        print("Product permissions setup completed!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_product_permissions()