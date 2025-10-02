#!/usr/bin/env python3
"""
Demo workflow data generator for FastNext Framework
Creates sample workflow types, states, templates, and instances for testing.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.workflow import (
    WorkflowType, WorkflowState, WorkflowTemplate, WorkflowInstance, 
    WorkflowTransition, WorkflowStatus, InstanceStatus, WorkflowNodeType
)
from app.models.user import User
import json


def create_demo_workflow_data():
    """Create comprehensive demo workflow data"""
    db = SessionLocal()
    
    try:
        # Get existing admin user
        admin_user = db.query(User).filter(User.is_superuser == True).first()
        if not admin_user:
            print("❌ No admin user found. Please create an admin user first.")
            return
        
        print(f"ℹ️  Using admin user: {admin_user.email}")
        
        print("🚀 Creating demo workflow data...")
        
        # 1. Create Workflow Types
        workflow_types = [
            {
                "name": "Order Processing",
                "description": "Handle customer orders from placement to fulfillment",
                "icon": "ShoppingCart",
                "color": "#3B82F6",
                "created_by": admin_user.id
            },
            {
                "name": "Invoice Approval",
                "description": "Multi-level approval process for invoices",
                "icon": "FileText",
                "color": "#10B981",
                "created_by": admin_user.id
            },
            {
                "name": "Employee Onboarding",
                "description": "Complete onboarding process for new employees",
                "icon": "Users",
                "color": "#8B5CF6",
                "created_by": admin_user.id
            },
            {
                "name": "Bug Resolution",
                "description": "Software bug tracking and resolution workflow",
                "icon": "Bug",
                "color": "#EF4444",
                "created_by": admin_user.id
            },
            {
                "name": "Content Review",
                "description": "Content moderation and approval process",
                "icon": "Edit",
                "color": "#F59E0B",
                "created_by": admin_user.id
            }
        ]
        
        created_types = []
        for wt_data in workflow_types:
            existing = db.query(WorkflowType).filter(WorkflowType.name == wt_data["name"]).first()
            if not existing:
                wt = WorkflowType(**wt_data)
                db.add(wt)
                db.flush()
                created_types.append(wt)
                print(f"✅ Created workflow type: {wt.name}")
            else:
                created_types.append(existing)
                print(f"ℹ️  Workflow type exists: {existing.name}")
        
        # 2. Create Workflow States
        workflow_states = [
            # General states
            {"name": "draft", "label": "Draft", "description": "Initial draft state", "color": "#6B7280", "bg_color": "#F9FAFB", "icon": "FileText", "is_initial": True},
            {"name": "submitted", "label": "Submitted", "description": "Submitted for review", "color": "#3B82F6", "bg_color": "#EBF8FF", "icon": "Send"},
            {"name": "under_review", "label": "Under Review", "description": "Currently being reviewed", "color": "#F59E0B", "bg_color": "#FFFBEB", "icon": "Eye"},
            {"name": "approved", "label": "Approved", "description": "Approved by reviewer", "color": "#10B981", "bg_color": "#ECFDF5", "icon": "CheckCircle"},
            {"name": "rejected", "label": "Rejected", "description": "Rejected and needs revision", "color": "#EF4444", "bg_color": "#FEF2F2", "icon": "XCircle"},
            {"name": "completed", "label": "Completed", "description": "Process completed successfully", "color": "#059669", "bg_color": "#D1FAE5", "icon": "CheckCircle2", "is_final": True},
            {"name": "cancelled", "label": "Cancelled", "description": "Process was cancelled", "color": "#6B7280", "bg_color": "#F3F4F6", "icon": "X", "is_final": True},
            
            # Order specific states
            {"name": "payment_pending", "label": "Payment Pending", "description": "Waiting for payment confirmation", "color": "#F59E0B", "bg_color": "#FFFBEB", "icon": "CreditCard"},
            {"name": "processing", "label": "Processing", "description": "Order is being processed", "color": "#8B5CF6", "bg_color": "#F3E8FF", "icon": "Loader"},
            {"name": "shipped", "label": "Shipped", "description": "Order has been shipped", "color": "#0EA5E9", "bg_color": "#E0F2FE", "icon": "Truck"},
            {"name": "delivered", "label": "Delivered", "description": "Order delivered to customer", "color": "#10B981", "bg_color": "#ECFDF5", "icon": "Package", "is_final": True},
            
            # HR specific states
            {"name": "background_check", "label": "Background Check", "description": "Background verification in progress", "color": "#8B5CF6", "bg_color": "#F3E8FF", "icon": "Shield"},
            {"name": "equipment_setup", "label": "Equipment Setup", "description": "Setting up equipment and accounts", "color": "#0EA5E9", "bg_color": "#E0F2FE", "icon": "Monitor"},
            {"name": "training", "label": "Training", "description": "Employee training period", "color": "#F59E0B", "bg_color": "#FFFBEB", "icon": "GraduationCap"},
            
            # Bug tracking states
            {"name": "reported", "label": "Reported", "description": "Bug has been reported", "color": "#EF4444", "bg_color": "#FEF2F2", "icon": "AlertCircle", "is_initial": True},
            {"name": "triaged", "label": "Triaged", "description": "Bug has been triaged", "color": "#F59E0B", "bg_color": "#FFFBEB", "icon": "Filter"},
            {"name": "in_progress", "label": "In Progress", "description": "Bug fix in progress", "color": "#8B5CF6", "bg_color": "#F3E8FF", "icon": "Code"},
            {"name": "testing", "label": "Testing", "description": "Fix is being tested", "color": "#0EA5E9", "bg_color": "#E0F2FE", "icon": "TestTube"},
            {"name": "resolved", "label": "Resolved", "description": "Bug has been resolved", "color": "#10B981", "bg_color": "#ECFDF5", "icon": "CheckCircle", "is_final": True},
        ]
        
        created_states = []
        for ws_data in workflow_states:
            existing = db.query(WorkflowState).filter(WorkflowState.name == ws_data["name"]).first()
            if not existing:
                ws = WorkflowState(**ws_data)
                db.add(ws)
                db.flush()
                created_states.append(ws)
                print(f"✅ Created workflow state: {ws.name}")
            else:
                created_states.append(existing)
                print(f"ℹ️  Workflow state exists: {existing.name}")
        
        # Helper function to get state by name
        def get_state_by_name(name):
            return next((s for s in created_states if s.name == name), None)
        
        # 3. Create Workflow Templates with ReactFlow nodes and edges
        workflow_templates = [
            {
                "name": "Standard Order Processing",
                "description": "Standard flow for processing customer orders",
                "workflow_type_id": created_types[0].id,  # Order Processing
                "default_state_id": get_state_by_name("draft").id,
                "status": WorkflowStatus.ACTIVE,
                "version": "1.0.0",
                "nodes": [
                    {
                        "id": "start_node",
                        "type": "workflowState",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "label": "Order Received",
                            "description": "New order submitted",
                            "color": "#3B82F6",
                            "bgColor": "#EBF8FF",
                            "icon": "ShoppingCart",
                            "stateId": get_state_by_name("draft").id,
                            "isInitial": True
                        }
                    },
                    {
                        "id": "payment_node",
                        "type": "conditional",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "label": "Payment Check",
                            "description": "Verify payment status",
                            "color": "#F59E0B",
                            "condition": "payment_status == 'paid'"
                        }
                    },
                    {
                        "id": "processing_node",
                        "type": "workflowState",
                        "position": {"x": 500, "y": 100},
                        "data": {
                            "label": "Processing",
                            "description": "Order being processed",
                            "color": "#8B5CF6",
                            "bgColor": "#F3E8FF",
                            "icon": "Loader",
                            "stateId": get_state_by_name("processing").id
                        }
                    },
                    {
                        "id": "shipping_node",
                        "type": "userTask",
                        "position": {"x": 700, "y": 100},
                        "data": {
                            "label": "Ship Order",
                            "description": "Prepare and ship order",
                            "color": "#0EA5E9",
                            "requiredRoles": ["shipping_clerk"],
                            "priority": "high"
                        }
                    },
                    {
                        "id": "delivered_node",
                        "type": "workflowState",
                        "position": {"x": 900, "y": 100},
                        "data": {
                            "label": "Delivered",
                            "description": "Order delivered successfully",
                            "color": "#10B981",
                            "bgColor": "#ECFDF5",
                            "icon": "Package",
                            "stateId": get_state_by_name("delivered").id,
                            "isFinal": True
                        }
                    },
                    {
                        "id": "payment_pending_node",
                        "type": "timer",
                        "position": {"x": 300, "y": 250},
                        "data": {
                            "label": "Payment Pending",
                            "description": "Waiting for payment",
                            "color": "#F59E0B",
                            "duration": "24h"
                        }
                    }
                ],
                "edges": [
                    {
                        "id": "e1",
                        "source": "start_node",
                        "target": "payment_node",
                        "type": "smoothstep",
                        "animated": True,
                        "data": {"action": "submit", "label": "Submit Order"}
                    },
                    {
                        "id": "e2",
                        "source": "payment_node",
                        "target": "processing_node",
                        "type": "smoothstep",
                        "animated": True,
                        "data": {"action": "payment_confirmed", "label": "Payment Confirmed"}
                    },
                    {
                        "id": "e3",
                        "source": "payment_node",
                        "target": "payment_pending_node",
                        "type": "smoothstep",
                        "data": {"action": "payment_pending", "label": "Payment Pending"}
                    },
                    {
                        "id": "e4",
                        "source": "processing_node",
                        "target": "shipping_node",
                        "type": "smoothstep",
                        "animated": True,
                        "data": {"action": "ready_to_ship", "label": "Ready to Ship"}
                    },
                    {
                        "id": "e5",
                        "source": "shipping_node",
                        "target": "delivered_node",
                        "type": "smoothstep",
                        "animated": True,
                        "data": {"action": "delivered", "label": "Mark as Delivered"}
                    },
                    {
                        "id": "e6",
                        "source": "payment_pending_node",
                        "target": "processing_node",
                        "type": "smoothstep",
                        "data": {"action": "payment_received", "label": "Payment Received"}
                    }
                ],
                "settings": {
                    "auto_advance": True,
                    "notifications": True,
                    "sla_enabled": True,
                    "default_sla_hours": 48
                },
                "conditions": {
                    "payment_check": "payment_status == 'paid'",
                    "shipping_ready": "items_packed == true AND label_printed == true"
                },
                "permissions": {
                    "view": ["all"],
                    "edit": ["admin", "order_manager"],
                    "execute": ["order_clerk", "shipping_clerk"]
                },
                "created_by": admin_user.id
            },
            {
                "name": "Invoice Approval Workflow",
                "description": "Multi-step approval process for invoices based on amount",
                "workflow_type_id": created_types[1].id,  # Invoice Approval
                "default_state_id": get_state_by_name("draft").id,
                "status": WorkflowStatus.ACTIVE,
                "version": "1.0.0",
                "nodes": [
                    {
                        "id": "invoice_start",
                        "type": "workflowState",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "label": "Invoice Draft",
                            "description": "Invoice created",
                            "color": "#6B7280",
                            "bgColor": "#F9FAFB",
                            "icon": "FileText",
                            "stateId": get_state_by_name("draft").id,
                            "isInitial": True
                        }
                    },
                    {
                        "id": "amount_check",
                        "type": "conditional",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "label": "Amount Check",
                            "description": "Check invoice amount",
                            "color": "#F59E0B",
                            "condition": "amount >= 1000"
                        }
                    },
                    {
                        "id": "manager_approval",
                        "type": "userTask",
                        "position": {"x": 500, "y": 50},
                        "data": {
                            "label": "Manager Approval",
                            "description": "Requires manager approval for high amounts",
                            "color": "#8B5CF6",
                            "requiredRoles": ["manager"],
                            "approval": True,
                            "priority": "high"
                        }
                    },
                    {
                        "id": "auto_approve",
                        "type": "workflowState",
                        "position": {"x": 500, "y": 150},
                        "data": {
                            "label": "Auto Approved",
                            "description": "Automatically approved (low amount)",
                            "color": "#10B981",
                            "bgColor": "#ECFDF5",
                            "icon": "CheckCircle",
                            "stateId": get_state_by_name("approved").id
                        }
                    },
                    {
                        "id": "finance_review",
                        "type": "userTask",
                        "position": {"x": 700, "y": 50},
                        "data": {
                            "label": "Finance Review",
                            "description": "Final finance team review",
                            "color": "#0EA5E9",
                            "requiredRoles": ["finance"],
                            "priority": "medium"
                        }
                    },
                    {
                        "id": "approved_final",
                        "type": "workflowState",
                        "position": {"x": 900, "y": 100},
                        "data": {
                            "label": "Approved",
                            "description": "Invoice fully approved",
                            "color": "#10B981",
                            "bgColor": "#ECFDF5",
                            "icon": "CheckCircle2",
                            "stateId": get_state_by_name("approved").id,
                            "isFinal": True
                        }
                    }
                ],
                "edges": [
                    {"id": "ie1", "source": "invoice_start", "target": "amount_check", "type": "smoothstep", "data": {"action": "submit", "label": "Submit"}},
                    {"id": "ie2", "source": "amount_check", "target": "manager_approval", "type": "smoothstep", "data": {"action": "high_amount", "label": "Amount ≥ $1000"}},
                    {"id": "ie3", "source": "amount_check", "target": "auto_approve", "type": "smoothstep", "data": {"action": "low_amount", "label": "Amount < $1000"}},
                    {"id": "ie4", "source": "manager_approval", "target": "finance_review", "type": "smoothstep", "data": {"action": "approve", "label": "Manager Approved"}},
                    {"id": "ie5", "source": "finance_review", "target": "approved_final", "type": "smoothstep", "data": {"action": "approve", "label": "Finance Approved"}},
                    {"id": "ie6", "source": "auto_approve", "target": "approved_final", "type": "smoothstep", "data": {"action": "auto_process", "label": "Auto Process"}}
                ],
                "settings": {
                    "escalation_enabled": True,
                    "escalation_hours": 24,
                    "auto_approve_limit": 1000
                },
                "conditions": {
                    "high_amount": "amount >= 1000",
                    "requires_manager": "amount >= 1000 OR category == 'capital'",
                    "requires_finance": "amount >= 5000"
                },
                "created_by": admin_user.id
            },
            {
                "name": "Bug Tracking Workflow",
                "description": "Software bug lifecycle management",
                "workflow_type_id": created_types[3].id,  # Bug Resolution
                "default_state_id": get_state_by_name("reported").id,
                "status": WorkflowStatus.ACTIVE,
                "version": "1.0.0",
                "nodes": [
                    {
                        "id": "bug_reported",
                        "type": "workflowState",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "label": "Bug Reported",
                            "description": "New bug report submitted",
                            "color": "#EF4444",
                            "bgColor": "#FEF2F2",
                            "icon": "AlertCircle",
                            "stateId": get_state_by_name("reported").id,
                            "isInitial": True
                        }
                    },
                    {
                        "id": "triage_task",
                        "type": "userTask",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "label": "Triage",
                            "description": "Assign priority and developer",
                            "color": "#F59E0B",
                            "requiredRoles": ["lead_developer", "project_manager"],
                            "priority": "high"
                        }
                    },
                    {
                        "id": "priority_gateway",
                        "type": "parallelGateway",
                        "position": {"x": 500, "y": 100},
                        "data": {
                            "label": "Priority Split",
                            "description": "Route based on priority",
                            "color": "#8B5CF6"
                        }
                    },
                    {
                        "id": "high_priority_dev",
                        "type": "userTask",
                        "position": {"x": 700, "y": 50},
                        "data": {
                            "label": "High Priority Fix",
                            "description": "Immediate development attention",
                            "color": "#EF4444",
                            "requiredRoles": ["senior_developer"],
                            "priority": "critical"
                        }
                    },
                    {
                        "id": "normal_dev",
                        "type": "userTask",
                        "position": {"x": 700, "y": 150},
                        "data": {
                            "label": "Development",
                            "description": "Standard development process",
                            "color": "#3B82F6",
                            "requiredRoles": ["developer"],
                            "priority": "medium"
                        }
                    },
                    {
                        "id": "testing_phase",
                        "type": "userTask",
                        "position": {"x": 900, "y": 100},
                        "data": {
                            "label": "Testing",
                            "description": "QA testing of the fix",
                            "color": "#0EA5E9",
                            "requiredRoles": ["qa_engineer"],
                            "priority": "medium"
                        }
                    },
                    {
                        "id": "bug_resolved",
                        "type": "workflowState",
                        "position": {"x": 1100, "y": 100},
                        "data": {
                            "label": "Resolved",
                            "description": "Bug successfully resolved",
                            "color": "#10B981",
                            "bgColor": "#ECFDF5",
                            "icon": "CheckCircle",
                            "stateId": get_state_by_name("resolved").id,
                            "isFinal": True
                        }
                    }
                ],
                "edges": [
                    {"id": "be1", "source": "bug_reported", "target": "triage_task", "type": "smoothstep", "data": {"action": "triage", "label": "Assign for Triage"}},
                    {"id": "be2", "source": "triage_task", "target": "priority_gateway", "type": "smoothstep", "data": {"action": "triaged", "label": "Triaged"}},
                    {"id": "be3", "source": "priority_gateway", "target": "high_priority_dev", "type": "smoothstep", "data": {"action": "high_priority", "label": "High Priority"}},
                    {"id": "be4", "source": "priority_gateway", "target": "normal_dev", "type": "smoothstep", "data": {"action": "normal_priority", "label": "Normal Priority"}},
                    {"id": "be5", "source": "high_priority_dev", "target": "testing_phase", "type": "smoothstep", "data": {"action": "dev_complete", "label": "Development Complete"}},
                    {"id": "be6", "source": "normal_dev", "target": "testing_phase", "type": "smoothstep", "data": {"action": "dev_complete", "label": "Development Complete"}},
                    {"id": "be7", "source": "testing_phase", "target": "bug_resolved", "type": "smoothstep", "data": {"action": "test_pass", "label": "Tests Passed"}}
                ],
                "settings": {
                    "sla_enabled": True,
                    "critical_sla_hours": 4,
                    "high_sla_hours": 24,
                    "normal_sla_hours": 72
                },
                "conditions": {
                    "is_critical": "severity == 'critical' OR customer_impact == 'high'",
                    "is_high_priority": "priority == 'high' OR severity == 'high'",
                    "requires_senior_dev": "complexity == 'high' OR area == 'core'"
                },
                "created_by": admin_user.id
            }
        ]
        
        created_templates = []
        for wt_data in workflow_templates:
            existing = db.query(WorkflowTemplate).filter(WorkflowTemplate.name == wt_data["name"]).first()
            if not existing:
                wt = WorkflowTemplate(**wt_data)
                db.add(wt)
                db.flush()
                created_templates.append(wt)
                print(f"✅ Created workflow template: {wt.name}")
            else:
                created_templates.append(existing)
                print(f"ℹ️  Workflow template exists: {existing.name}")
        
        # 4. Create Sample Workflow Instances
        sample_instances = [
            {
                "template_id": created_templates[0].id,  # Order Processing
                "workflow_type_id": created_types[0].id,
                "current_state_id": get_state_by_name("processing").id,
                "status": InstanceStatus.RUNNING,
                "entity_id": "ORD-2024-001",
                "entity_type": "order",
                "title": "Customer Order #12345",
                "description": "Electronics order from John Doe",
                "data": {
                    "customer_id": 12345,
                    "customer_name": "John Doe",
                    "total_amount": 299.99,
                    "items": [
                        {"product": "Wireless Headphones", "quantity": 1, "price": 149.99},
                        {"product": "Phone Case", "quantity": 2, "price": 75.00}
                    ],
                    "shipping_address": {
                        "street": "123 Main St",
                        "city": "New York",
                        "state": "NY",
                        "zip": "10001"
                    }
                },
                "context": {
                    "payment_status": "paid",
                    "payment_method": "credit_card",
                    "items_packed": False,
                    "label_printed": False
                },
                "deadline": datetime.utcnow() + timedelta(hours=48),
                "priority": 1,
                "created_by": admin_user.id,
                "started_at": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "template_id": created_templates[1].id,  # Invoice Approval
                "workflow_type_id": created_types[1].id,
                "current_state_id": get_state_by_name("under_review").id,
                "status": InstanceStatus.RUNNING,
                "entity_id": "INV-2024-0234",
                "entity_type": "invoice",
                "title": "Office Supplies Invoice",
                "description": "Q1 office supplies procurement",
                "data": {
                    "vendor": "Office Depot",
                    "amount": 1250.00,
                    "category": "supplies",
                    "items": [
                        {"description": "Paper & Stationery", "amount": 450.00},
                        {"description": "Computer Equipment", "amount": 800.00}
                    ],
                    "due_date": "2024-02-15"
                },
                "context": {
                    "amount": 1250.00,
                    "requires_manager_approval": True,
                    "manager_approved": False,
                    "finance_reviewed": False
                },
                "deadline": datetime.utcnow() + timedelta(hours=24),
                "priority": 2,
                "created_by": admin_user.id,
                "started_at": datetime.utcnow() - timedelta(hours=4)
            },
            {
                "template_id": created_templates[2].id,  # Bug Tracking
                "workflow_type_id": created_types[3].id,
                "current_state_id": get_state_by_name("in_progress").id,
                "status": InstanceStatus.RUNNING,
                "entity_id": "BUG-2024-0089",
                "entity_type": "bug",
                "title": "Login page not responsive on mobile",
                "description": "Users report login form is not properly displayed on mobile devices",
                "data": {
                    "reporter": "user@example.com",
                    "severity": "medium",
                    "priority": "high",
                    "browser": "Safari Mobile",
                    "device": "iPhone 12",
                    "steps_to_reproduce": [
                        "Open login page on mobile Safari",
                        "Try to enter credentials",
                        "Form fields are cut off"
                    ]
                },
                "context": {
                    "assigned_developer": "dev@fastnext.com",
                    "estimated_hours": 4,
                    "complexity": "medium",
                    "area": "frontend"
                },
                "deadline": datetime.utcnow() + timedelta(hours=48),
                "priority": 2,
                "assigned_to": admin_user.id,
                "created_by": admin_user.id,
                "started_at": datetime.utcnow() - timedelta(hours=6)
            }
        ]
        
        for instance_data in sample_instances:
            existing = db.query(WorkflowInstance).filter(WorkflowInstance.entity_id == instance_data["entity_id"]).first()
            if not existing:
                instance = WorkflowInstance(**instance_data)
                db.add(instance)
                db.flush()
                print(f"✅ Created workflow instance: {instance.title}")
            else:
                print(f"ℹ️  Workflow instance exists: {existing.title}")
        
        db.commit()
        print("\n🎉 Demo workflow data created successfully!")
        print(f"📊 Created: {len(created_types)} workflow types, {len(created_states)} states, {len(created_templates)} templates")
        print("\n🔗 You can now test the workflow system with:")
        print("   - React Flow workflow builder")
        print("   - CRUD operations via API")
        print("   - Workflow instance management")
        
    except Exception as e:
        print(f"❌ Error creating demo data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_demo_workflow_data()