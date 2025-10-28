"""
Demo ACL (Access Control List) data for testing dynamic per-record permissions

This script creates sample ACL rules and record permissions to demonstrate
the ACL system's capabilities.
"""

import logging
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.workflow import AccessControlList, RecordPermission
from app.services.acl_service import ACLService

logger = logging.getLogger(__name__)


def create_demo_acls(db: Session):
    """Create demo ACL rules for testing"""

    # Get admin user for created_by field
    admin_user = db.query(User).filter(User.email == "admin@fastnext.com").first()
    if not admin_user:
        # Create a demo admin user if it doesn't exist
        admin_user = User(
            email="admin@fastnext.com",
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Le0Kd3sZvKJdGxzfC",  # "admin123"
            full_name="System Admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    logger.info("Creating demo ACL rules...")

    # ACL 1: Order management permissions
    # - Managers can approve orders over $1000
    # - Sales team can create and update orders
    # - Finance can only view orders
    order_acl = AccessControlList(
        name="order_management_acl",
        description="ACL for order management with role-based permissions",
        entity_type="orders",
        operation="approve",
        condition_script="entity_data.get('total_amount', 0) > 1000",
        condition_context={"min_amount": 1000},
        allowed_roles=["manager", "admin"],
        requires_approval=False,
        priority=100,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(order_acl)

    # ACL 2: Invoice approval workflow
    # - Only finance team can approve invoices
    # - Requires approval for invoices over $5000
    invoice_acl = AccessControlList(
        name="invoice_approval_acl",
        description="ACL for invoice approval with amount-based conditions",
        entity_type="invoices",
        operation="approve",
        condition_script="entity_data.get('amount', 0) > 5000",
        allowed_roles=["finance", "admin"],
        requires_approval=True,
        priority=90,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(invoice_acl)

    # ACL 3: Product catalog management
    # - Product managers can create/update products
    # - Sales team can only view products
    product_acl = AccessControlList(
        name="product_management_acl",
        description="ACL for product catalog management",
        entity_type="products",
        operation="write",
        allowed_roles=["product_manager", "admin"],
        priority=80,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(product_acl)

    # ACL 4: Field-level security for sensitive data
    # - Only admins can view/edit pricing information
    price_field_acl = AccessControlList(
        name="price_field_security_acl",
        description="Field-level security for pricing information",
        entity_type="products",
        operation="read",
        field_name="price",
        allowed_roles=["admin", "finance"],
        priority=95,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(price_field_acl)

    # ACL 5: Customer data protection
    # - Customer service can view basic customer info
    # - Only managers can view/edit sensitive customer data
    customer_acl = AccessControlList(
        name="customer_data_acl",
        description="ACL for customer data protection",
        entity_type="customers",
        operation="read",
        field_name="ssn",
        allowed_roles=["manager", "admin"],
        denied_roles=["customer_service"],
        priority=85,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(customer_acl)

    db.commit()
    logger.info("✅ Demo ACL rules created")


def create_demo_record_permissions(db: Session):
    """Create demo record-specific permissions"""

    # Get some users for testing
    users = db.query(User).limit(3).all()
    if not users:
        logger.warning("No users found, skipping record permissions")
        return

    logger.info("Creating demo record permissions...")

    # Grant specific permissions on records
    for i, user in enumerate(users):
        # Give user permission to approve a specific order
        permission = RecordPermission(
            entity_type="orders",
            entity_id=f"order_{i+1:03d}",
            user_id=user.id,
            operation="approve",
            granted_by=users[0].id,  # Assume first user is admin
            conditions={"max_amount": 5000},
            is_active=True,
        )
        db.add(permission)

        # Give another user read-only access to a specific invoice
        if len(users) > 1 and i < len(users) - 1:
            readonly_perm = RecordPermission(
                entity_type="invoices",
                entity_id=f"inv_{i+1:03d}",
                user_id=users[i+1].id,
                operation="read",
                granted_by=users[0].id,
                is_active=True,
            )
            db.add(readonly_perm)

    db.commit()
    logger.info("✅ Demo record permissions created")


def create_demo_acl_scenarios(db: Session):
    """Create comprehensive ACL scenarios for testing"""

    admin_user = db.query(User).filter(User.email == "admin@fastnext.com").first()
    if not admin_user:
        return

    logger.info("Creating comprehensive ACL test scenarios...")

    # Scenario 1: Project-based permissions
    # - Project members can edit their project's tasks
    # - Project managers can approve tasks
    # - External users have no access
    project_task_acl = AccessControlList(
        name="project_task_acl",
        description="Project-based task permissions",
        entity_type="tasks",
        operation="update",
        condition_script="user_id in entity_data.get('project_members', [])",
        allowed_roles=["project_member", "project_manager", "admin"],
        priority=70,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(project_task_acl)

    # Scenario 2: Time-based permissions
    # - Users can only edit records they created within 24 hours
    # - After 24 hours, only managers can edit
    time_based_acl = AccessControlList(
        name="time_based_editing_acl",
        description="Time-based editing restrictions",
        entity_type="documents",
        operation="update",
        condition_script="""
from datetime import datetime, timedelta
created_at = entity_data.get('created_at')
if not created_at:
    return False
time_diff = datetime.utcnow() - created_at
return time_diff < timedelta(hours=24) or user_roles.intersection({'manager', 'admin'})
""",
        allowed_roles=["user", "manager", "admin"],
        priority=60,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(time_based_acl)

    # Scenario 3: Hierarchical approval
    # - Level 1 approvers can approve up to $1000
    # - Level 2 approvers can approve up to $10000
    # - Level 3 approvers can approve unlimited
    hierarchical_approval_acl = AccessControlList(
        name="hierarchical_approval_acl",
        description="Hierarchical approval based on amount",
        entity_type="purchase_orders",
        operation="approve",
        condition_script="""
amount = entity_data.get('amount', 0)
if 'level_3_approver' in user_roles:
    return True
elif 'level_2_approver' in user_roles and amount <= 10000:
    return True
elif 'level_1_approver' in user_roles and amount <= 1000:
    return True
return False
""",
        allowed_roles=["level_1_approver", "level_2_approver", "level_3_approver", "admin"],
        requires_approval=True,
        priority=75,
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(hierarchical_approval_acl)

    db.commit()
    logger.info("✅ Comprehensive ACL scenarios created")


def main():
    """Main function to create all demo ACL data"""
    logger.info("🚀 Creating demo ACL data...")

    db = next(get_db())

    try:
        create_demo_acls(db)
        create_demo_record_permissions(db)
        create_demo_acl_scenarios(db)

        logger.info("🎉 Demo ACL data creation completed successfully!")
        logger.info("📋 Created ACL rules for: orders, invoices, products, customers, tasks, documents, purchase_orders")
        logger.info("🔐 Test the ACL system by making API requests to these entities")

    except Exception as e:
        logger.error(f"❌ Failed to create demo ACL data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()