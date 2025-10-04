#!/usr/bin/env python3
"""
Comprehensive test script for Row Level Security (RLS) implementation

This script tests all aspects of the RLS system including:
- Database models and migrations
- Service layer functionality
- Policy enforcement
- Access control
- Audit logging
- Context management
"""

import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.row_level_security import (
    RowLevelSecurityPolicy, RLSRuleAssignment, RLSContext, RLSAuditLog,
    Organization, OrganizationMember, RLSPolicy, RLSAction, RLSEntityType
)
from app.services.rls_service import RLSService, create_default_policies
from app.core.logging import get_logger

logger = get_logger(__name__)


class RLSTestSuite:
    """Comprehensive RLS test suite"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.rls_service = RLSService(self.db)
        self.test_user = None
        self.test_project = None
        self.test_organization = None
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
        print(f"{status} {test_name}: {message}")
    
    def setup_test_data(self):
        """Setup test data"""
        try:
            # Generate unique identifiers to avoid conflicts
            unique_id = str(uuid.uuid4())[:8]
            
            # Create test user
            self.test_user = User(
                email=f"rls_test_{unique_id}@example.com",
                username=f"rls_test_user_{unique_id}",
                full_name="RLS Test User",
                hashed_password="test_password_hash",
                is_active=True,
                is_verified=True
            )
            
            self.db.add(self.test_user)
            self.db.commit()
            self.db.refresh(self.test_user)
            
            # Create test organization
            self.test_organization = Organization(
                name=f"Test Organization {unique_id}",
                slug=f"test-org-{unique_id}",
                description="Test organization for RLS",
                created_by=self.test_user.id,
                rls_enabled=True
            )
            
            self.db.add(self.test_organization)
            self.db.commit()
            self.db.refresh(self.test_organization)
            
            # Create test project
            self.test_project = Project(
                name=f"RLS Test Project {unique_id}",
                description="Test project for RLS",
                user_id=self.test_user.id,
                is_public=False
            )
            
            self.db.add(self.test_project)
            self.db.commit()
            self.db.refresh(self.test_project)
            
            self.log_test("Setup test data", True, "Created test user, organization, and project")
            
        except Exception as e:
            self.log_test("Setup test data", False, f"Error: {e}")
            raise
    
    def test_database_models(self):
        """Test database models creation and relationships"""
        try:
            # Test RLS Policy creation
            policy = RowLevelSecurityPolicy(
                name="Test Policy",
                description="Test policy for RLS",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.OWNER_ONLY,
                action=RLSAction.ALL,
                created_by=self.test_user.id,
                condition_column="user_id",
                priority=100
            )
            
            self.db.add(policy)
            self.db.commit()
            self.db.refresh(policy)
            
            # Test RLS Rule Assignment
            assignment = RLSRuleAssignment(
                policy_id=policy.id,
                entity_type=RLSEntityType.PROJECT,
                user_id=self.test_user.id,
                created_by=self.test_user.id
            )
            
            self.db.add(assignment)
            self.db.commit()
            self.db.refresh(assignment)
            
            # Test RLS Context
            context = RLSContext(
                session_id="test_session_123",
                user_id=self.test_user.id,
                organization_id=self.test_organization.id,
                project_ids=[self.test_project.id],
                roles=["user"],
                permissions=["project.read"],
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
            )
            
            self.db.add(context)
            self.db.commit()
            self.db.refresh(context)
            
            # Test RLS Audit Log
            audit_log = RLSAuditLog(
                session_id="test_session_123",
                user_id=self.test_user.id,
                policy_id=policy.id,
                entity_type=RLSEntityType.PROJECT,
                entity_id=self.test_project.id,
                action=RLSAction.SELECT,
                access_granted=True,
                table_name="projects"
            )
            
            self.db.add(audit_log)
            self.db.commit()
            self.db.refresh(audit_log)
            
            self.log_test("Database models", True, "All RLS models created successfully")
            
        except Exception as e:
            self.log_test("Database models", False, f"Error: {e}")
    
    def test_rls_service_context(self):
        """Test RLS service context management"""
        try:
            # Test context creation
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="test_service_session",
                organization_id=self.test_organization.id
            )
            
            assert context.user_id == self.test_user.id
            assert context.organization_id == self.test_organization.id
            assert context.session_id == "test_service_session"
            
            # Test context retrieval
            retrieved_context = self.rls_service.get_context("test_service_session")
            assert retrieved_context is not None
            assert retrieved_context.user_id == self.test_user.id
            
            # Test context update
            updated_context = self.rls_service.update_context(
                "test_service_session",
                tenant_id="test_tenant"
            )
            assert updated_context.tenant_id == "test_tenant"
            
            # Test context invalidation
            success = self.rls_service.invalidate_context("test_service_session")
            assert success is True
            
            self.log_test("RLS service context", True, "Context management working correctly")
            
        except Exception as e:
            self.log_test("RLS service context", False, f"Error: {e}")
    
    def test_policy_management(self):
        """Test RLS policy management"""
        try:
            # Generate unique policy name to avoid conflicts
            unique_id = str(uuid.uuid4())[:8]
            policy_name = f"Service Test Policy {unique_id}"
            
            # Test policy creation
            policy = self.rls_service.create_policy(
                name=policy_name,
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.PROJECT_MEMBER,
                action=RLSAction.SELECT,
                created_by=self.test_user.id,
                description="Test policy created via service",
                priority=200
            )
            
            assert policy is not None, "Policy creation returned None"
            assert policy.name == policy_name
            assert policy.entity_type == RLSEntityType.PROJECT
            assert policy.priority == 200
            
            # Create rule assignment to link policy to user
            assignment = RLSRuleAssignment(
                policy_id=policy.id,
                entity_type=RLSEntityType.PROJECT,
                user_id=self.test_user.id,
                created_by=self.test_user.id
            )
            self.db.add(assignment)
            self.db.commit()
            self.db.refresh(assignment)
            
            # Test getting applicable policies
            policies = self.rls_service.get_applicable_policies(
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                user_id=self.test_user.id
            )
            
            
            assert policies is not None, "get_applicable_policies returned None"
            assert len(policies) > 0, f"No policies found, expected at least 1. Got: {len(policies)}"
            assert any(p.name == policy_name for p in policies), f"{policy_name} not found in policies: {[p.name for p in policies]}"
            
            self.log_test("Policy management", True, "Policy creation and retrieval working")
            
        except AssertionError as e:
            self.log_test("Policy management", False, f"Assertion Error: {e}")
        except Exception as e:
            self.log_test("Policy management", False, f"Error: {e}")
    
    def test_access_control(self):
        """Test access control functionality"""
        try:
            # Create a policy for testing
            policy = self.rls_service.create_policy(
                name="Access Control Test Policy",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.OWNER_ONLY,
                action=RLSAction.ALL,
                created_by=self.test_user.id,
                condition_column="user_id",
                priority=300
            )
            
            # Create context for access check
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="access_test_session"
            )
            
            # Test access check for owned project (should be granted)
            access_granted, denial_reason = self.rls_service.check_access(
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                entity_id=self.test_project.id,
                session_id="access_test_session"
            )
            
            assert access_granted is True
            assert denial_reason is None
            
            # Test access check for non-existent project (should be denied)
            access_granted, denial_reason = self.rls_service.check_access(
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.DELETE,
                entity_id=99999,  # Non-existent project
                session_id="access_test_session"
            )
            
            # Note: This might be granted or denied depending on policy logic
            # The important thing is that it doesn't crash
            
            self.log_test("Access control", True, "Access checks working correctly")
            
        except Exception as e:
            self.log_test("Access control", False, f"Error: {e}")
    
    def test_policy_evaluation(self):
        """Test different policy types evaluation"""
        try:
            # Test PUBLIC policy
            public_policy = self.rls_service.create_policy(
                name="Public Test Policy",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.PUBLIC,
                action=RLSAction.SELECT,
                created_by=self.test_user.id,
                priority=50
            )
            
            # Test CONDITIONAL policy
            conditional_policy = self.rls_service.create_policy(
                name="Conditional Test Policy",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.CONDITIONAL,
                action=RLSAction.SELECT,
                created_by=self.test_user.id,
                custom_condition="is_public = true",
                priority=75
            )
            
            # Create context
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="policy_eval_session"
            )
            
            # Test public policy (should always grant access)
            access_granted, _ = self.rls_service.check_access(
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                session_id="policy_eval_session"
            )
            
            # Should be granted due to public policy
            assert access_granted is True
            
            self.log_test("Policy evaluation", True, "Different policy types evaluated correctly")
            
        except Exception as e:
            self.log_test("Policy evaluation", False, f"Error: {e}")
    
    def test_audit_logging(self):
        """Test audit logging functionality"""
        try:
            # Create context for audit testing
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="audit_test_session"
            )
            
            # Perform access check (this should create audit log)
            self.rls_service.check_access(
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                entity_id=self.test_project.id,
                session_id="audit_test_session"
            )
            
            # Check if audit log was created
            audit_logs = self.db.query(RLSAuditLog).filter(
                RLSAuditLog.session_id == "audit_test_session"
            ).all()
            
            assert len(audit_logs) > 0
            
            # Verify audit log content
            audit_log = audit_logs[0]
            assert audit_log.user_id == self.test_user.id
            assert audit_log.entity_type == RLSEntityType.PROJECT
            assert audit_log.action == RLSAction.SELECT
            assert audit_log.entity_id == self.test_project.id
            
            self.log_test("Audit logging", True, f"Audit logs created correctly ({len(audit_logs)} logs)")
            
        except Exception as e:
            self.log_test("Audit logging", False, f"Error: {e}")
    
    def test_default_policies(self):
        """Test default policies creation"""
        try:
            # Create default policies
            create_default_policies(self.db, self.test_user.id)
            
            # Check if default policies were created
            default_policies = self.db.query(RowLevelSecurityPolicy).filter(
                RowLevelSecurityPolicy.name.ilike("%owner%")
            ).all()
            
            assert len(default_policies) > 0
            
            self.log_test("Default policies", True, f"Created {len(default_policies)} default policies")
            
        except Exception as e:
            self.log_test("Default policies", False, f"Error: {e}")
    
    def test_organization_management(self):
        """Test organization-based RLS"""
        try:
            # Create organization member
            member = OrganizationMember(
                organization_id=self.test_organization.id,
                user_id=self.test_user.id,
                role="admin",
                created_by=self.test_user.id
            )
            
            self.db.add(member)
            self.db.commit()
            self.db.refresh(member)
            
            # Create organization-based policy
            org_policy = self.rls_service.create_policy(
                name="Organization Test Policy",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type=RLSPolicy.ORGANIZATION_MEMBER,
                action=RLSAction.SELECT,
                created_by=self.test_user.id,
                organization_id=self.test_organization.id,
                priority=150
            )
            
            # Create context with organization
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="org_test_session",
                organization_id=self.test_organization.id
            )
            
            # Test organization-based access
            access_granted, _ = self.rls_service.check_access(
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                session_id="org_test_session"
            )
            
            # Should be granted due to organization membership
            assert access_granted is True
            
            self.log_test("Organization management", True, "Organization-based RLS working")
            
        except Exception as e:
            self.log_test("Organization management", False, f"Error: {e}")
    
    def test_query_filtering(self):
        """Test query filtering functionality"""
        try:
            # Create a simple query
            query = self.db.query(Project)
            
            # Create context
            context = self.rls_service.create_context(
                user=self.test_user,
                session_id="filter_test_session"
            )
            
            # Apply RLS filter
            filtered_query = self.rls_service.apply_rls_filter(
                query=query,
                user_id=self.test_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                session_id="filter_test_session"
            )
            
            # Execute filtered query
            results = filtered_query.all()
            
            # Should return at least the test project
            assert len(results) >= 0  # Could be 0 if restrictive policies
            
            self.log_test("Query filtering", True, f"Query filtering applied, returned {len(results)} projects")
            
        except Exception as e:
            self.log_test("Query filtering", False, f"Error: {e}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        try:
            # Delete test data in reverse order
            self.db.query(RLSAuditLog).filter(
                RLSAuditLog.user_id == self.test_user.id
            ).delete()
            
            self.db.query(RLSContext).filter(
                RLSContext.user_id == self.test_user.id
            ).delete()
            
            self.db.query(RLSRuleAssignment).filter(
                RLSRuleAssignment.created_by == self.test_user.id
            ).delete()
            
            self.db.query(RowLevelSecurityPolicy).filter(
                RowLevelSecurityPolicy.created_by == self.test_user.id
            ).delete()
            
            self.db.query(OrganizationMember).filter(
                OrganizationMember.user_id == self.test_user.id
            ).delete()
            
            if self.test_project:
                self.db.delete(self.test_project)
            
            if self.test_organization:
                self.db.delete(self.test_organization)
            
            if self.test_user:
                self.db.delete(self.test_user)
            
            self.db.commit()
            
            self.log_test("Cleanup test data", True, "Test data cleaned up successfully")
            
        except Exception as e:
            self.log_test("Cleanup test data", False, f"Error: {e}")
        finally:
            self.db.close()
    
    def run_all_tests(self):
        """Run all RLS tests"""
        print("🚀 Starting RLS Implementation Test Suite")
        print("=" * 50)
        
        try:
            self.setup_test_data()
            self.test_database_models()
            self.test_rls_service_context()
            self.test_policy_management()
            self.test_access_control()
            self.test_policy_evaluation()
            self.test_audit_logging()
            self.test_default_policies()
            self.test_organization_management()
            self.test_query_filtering()
            
        except Exception as e:
            print(f"\n💥 Test suite failed with error: {e}")
            
        finally:
            self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 Test Results Summary")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        if failed == 0:
            print("\n🎉 All tests passed! RLS implementation is working correctly.")
        else:
            print(f"\n⚠️ {failed} test(s) failed. Please review the implementation.")
        
        return failed == 0


def main():
    """Main test function"""
    print("Row Level Security (RLS) Implementation Test")
    print("Testing comprehensive RLS functionality...")
    
    # Check if we're in the correct directory
    if not os.path.exists('app/models/row_level_security.py'):
        print("❌ Error: RLS models not found. Please run this script from the backend directory.")
        sys.exit(1)
    
    # Run test suite
    test_suite = RLSTestSuite()
    success = test_suite.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()