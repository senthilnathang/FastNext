#!/usr/bin/env python3
"""
Test script for enhanced base model with activity/message/audit mixins
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime
from unittest.mock import Mock, MagicMock
from app.models.base import (
    TimestampMixin, AuditMixin, ActivityMixin,
    MessageMixin, AuditTrailMixin, FullActivityMixin,
    AuditableActivityModel
)

def test_timestamp_mixin():
    """Test TimestampMixin has the new datetime fields"""
    print("Testing TimestampMixin...")

    # Check that the mixin has the expected attributes
    assert hasattr(TimestampMixin, 'created_at')
    assert hasattr(TimestampMixin, 'updated_at')
    assert hasattr(TimestampMixin, 'created_by_datetime')
    assert hasattr(TimestampMixin, 'updated_by_datetime')

    print("✅ TimestampMixin has enhanced datetime fields")

def test_audit_mixin():
    """Test AuditMixin relationships"""
    print("Testing AuditMixin...")

    assert hasattr(AuditMixin, 'created_by')
    assert hasattr(AuditMixin, 'updated_by')
    assert hasattr(AuditMixin, 'created_by_user')
    assert hasattr(AuditMixin, 'updated_by_user')

    print("✅ AuditMixin has audit fields and relationships")

def test_activity_mixin():
    """Test ActivityMixin logging functionality"""
    print("Testing ActivityMixin...")

    # Create a mock instance
    class MockModel(ActivityMixin):
        def __init__(self):
            self.id = 1
            self.name = "Test Model"
            self.updated_by = 123

    instance = MockModel()

    # Mock the database session and logger
    mock_db = Mock()
    mock_log_activity = Mock(return_value="activity_log_entry")

    # Patch the log_activity function
    import app.utils.activity_logger
    original_log_activity = app.utils.activity_logger.log_activity
    app.utils.activity_logger.log_activity = mock_log_activity

    try:
        # Test activity logging
        result = instance.log_activity(
            db=mock_db,
            action='create',
            user_id=123,
            description="Test activity"
        )

        # Verify the call was made
        mock_log_activity.assert_called_once()
        args = mock_log_activity.call_args

        assert args[1]['user_id'] == 123  # Should use provided user_id
        assert args[1]['action'].value == 'create'
        assert 'Test Model' in args[1]['entity_name']

        print("✅ ActivityMixin logs activities correctly")

    finally:
        # Restore original function
        app.utils.activity_logger.log_activity = original_log_activity

def test_message_mixin():
    """Test MessageMixin notification functionality"""
    print("Testing MessageMixin...")

    # Create a mock instance
    class MockModel(MessageMixin):
        def __init__(self):
            self.id = 1
            self.name = "Test Model"

    instance = MockModel()

    # Mock the database session
    mock_db = Mock()

    # Mock Notification import
    import app.models.notification
    original_notification = app.models.notification.Notification
    mock_notification = Mock()
    app.models.notification.Notification = mock_notification

    try:
        # Test message sending
        result = instance.send_message(
            db=mock_db,
            recipient_ids=[456, 789],
            message_type='info',
            title="Test Message",
            message="This is a test"
        )

        # Verify notifications were created
        assert len(result) == 2  # Two recipients
        assert mock_db.add.call_count == 2
        mock_db.commit.assert_called_once()

        print("✅ MessageMixin sends notifications correctly")

    finally:
        # Restore original class
        app.models.notification.Notification = original_notification

def test_audit_trail_mixin():
    """Test AuditTrailMixin audit entry creation"""
    print("Testing AuditTrailMixin...")

    # Create a mock instance
    class MockModel(AuditTrailMixin):
        def __init__(self):
            self.id = 1
            self.name = "Test Model"
            self.updated_by = 123

    instance = MockModel()

    # Mock the database session
    mock_db = Mock()

    # Mock AuditTrail import
    import app.models.audit_trail
    original_audit_trail = app.models.audit_trail.AuditTrail
    mock_audit_trail = Mock()
    app.models.audit_trail.AuditTrail = mock_audit_trail

    try:
        # Test audit entry creation
        result = instance.create_audit_entry(
            db=mock_db,
            operation='UPDATE',
            old_values={'status': 'draft'},
            new_values={'status': 'published'},
            changed_fields=['status'],
            user_id=123
        )

        # Verify audit entry was created
        mock_audit_trail.assert_called_once()
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

        print("✅ AuditTrailMixin creates audit entries correctly")

    finally:
        # Restore original class
        app.models.audit_trail.AuditTrail = original_audit_trail

def test_full_activity_mixin():
    """Test FullActivityMixin combines all functionality"""
    print("Testing FullActivityMixin...")

    # Create a mock instance
    class MockModel(FullActivityMixin):
        def __init__(self):
            self.id = 1
            self.name = "Test Model"

    instance = MockModel()

    # Verify it has all mixin methods
    assert hasattr(instance, 'log_activity')
    assert hasattr(instance, 'send_message')
    assert hasattr(instance, 'create_audit_entry')

    print("✅ FullActivityMixin combines all functionality")

def test_auditable_activity_model():
    """Test AuditableActivityModel base class"""
    print("Testing AuditableActivityModel...")

    # This should inherit from both AuditMixin and FullActivityMixin
    assert issubclass(AuditableActivityModel, AuditMixin)
    assert issubclass(AuditableActivityModel, FullActivityMixin)

    # Check it has the expected attributes
    assert hasattr(AuditableActivityModel, 'created_at')
    assert hasattr(AuditableActivityModel, 'updated_at')
    assert hasattr(AuditableActivityModel, 'created_by')
    assert hasattr(AuditableActivityModel, 'updated_by')
    assert hasattr(AuditableActivityModel, 'log_activity')
    assert hasattr(AuditableActivityModel, 'send_message')
    assert hasattr(AuditableActivityModel, 'create_audit_entry')

    print("✅ AuditableActivityModel combines audit and activity functionality")

def main():
    """Run all tests"""
    print("🧪 Testing Enhanced Base Model with Mixins")
    print("=" * 50)

    try:
        test_timestamp_mixin()
        test_audit_mixin()
        test_activity_mixin()
        test_message_mixin()
        test_audit_trail_mixin()
        test_full_activity_mixin()
        test_auditable_activity_model()

        print("\n🎉 All tests passed! Enhanced base model implementation is working correctly.")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())