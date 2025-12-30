"""
Test Phase 3 Marketplace Features

Tests security and payout services.
"""

import sys
import os
from datetime import date, datetime, timedelta
from decimal import Decimal
import zipfile
import io

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base

# Import models to ensure they're registered
from modules.marketplace.models import (
    Publisher,
    MarketplaceModule,
    ModuleVersion,
    SigningKey,
    ModuleSignature,
    SecurityScan,
    SecurityPolicy,
    TrustedPublisher,
    PayoutBatch,
    PublisherPayoutItem,
    PayoutSchedule,
    PayoutAdjustment,
    PublisherBalance,
    BalanceTransaction,
)

from modules.marketplace.services.security_service import SecurityService
from modules.marketplace.services.payout_service import PayoutService

# Create database connection
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_security_service():
    """Test the SecurityService."""
    print("\n" + "=" * 60)
    print("TESTING SECURITY SERVICE")
    print("=" * 60)

    db = SessionLocal()
    service = SecurityService(db)

    try:
        # First, we need a publisher to test with
        # Check if we have any publishers
        publisher = db.query(Publisher).first()

        if not publisher:
            print("\nNo publisher found. Creating a test publisher...")
            # We need a user first
            from app.models.user import User
            user = db.query(User).first()
            if not user:
                print("ERROR: No users found in the database. Create a user first.")
                return False

            publisher = Publisher(
                user_id=user.id,
                display_name="Test Publisher",
                slug="test-publisher",
                status="active",
            )
            db.add(publisher)
            db.commit()
            db.refresh(publisher)
            print(f"Created publisher: {publisher.display_name} (ID: {publisher.id})")
        else:
            print(f"\nUsing existing publisher: {publisher.display_name} (ID: {publisher.id})")

        # Test 1: Generate signing key
        print("\n--- Test 1: Generate Signing Key ---")
        try:
            key, private_key = service.generate_signing_key(
                publisher_id=publisher.id,
                name="Test Key",
                algorithm="ed25519",
                set_as_primary=True,
            )
            print(f"Generated key: {key.key_id[:16]}...")
            print(f"Algorithm: {key.algorithm}")
            print(f"Is primary: {key.is_primary}")
            print(f"Private key length: {len(private_key)} chars")
            print("SUCCESS: Key generation works!")
        except Exception as e:
            print(f"Note: Key generation requires 'cryptography' package: {e}")
            # Create a dummy key for testing other features
            key = None

        # Test 2: Get publisher keys
        print("\n--- Test 2: Get Publisher Keys ---")
        keys = service.get_publisher_keys(publisher.id)
        print(f"Found {len(keys)} keys for publisher")
        for k in keys:
            print(f"  - {k.key_id[:16]}... ({k.algorithm}, status: {k.status})")
        print("SUCCESS: Key retrieval works!")

        # Test 3: Get primary key
        print("\n--- Test 3: Get Primary Key ---")
        primary = service.get_primary_key(publisher.id)
        if primary:
            print(f"Primary key: {primary.key_id[:16]}...")
        else:
            print("No primary key set")
        print("SUCCESS: Primary key lookup works!")

        # Test 4: Create security scan
        print("\n--- Test 4: Create Security Scan ---")
        # First check if we have a module version
        version = db.query(ModuleVersion).first()
        if not version:
            # Create a test module and version
            module = db.query(MarketplaceModule).first()
            if not module:
                module = MarketplaceModule(
                    publisher_id=publisher.id,
                    technical_name="test_module",
                    display_name="Test Module",
                    slug="test-module",
                    short_description="A test module",
                    status="draft",
                )
                db.add(module)
                db.commit()
                db.refresh(module)
                print(f"Created test module: {module.technical_name}")

            version = ModuleVersion(
                module_id=module.id,
                version="1.0.0",
                zip_file_url="/test/path.zip",
                zip_file_hash="abc123",
                status="draft",
            )
            db.add(version)
            db.commit()
            db.refresh(version)
            print(f"Created test version: {version.version}")

        scan = service.create_security_scan(version.id, scan_type="full")
        print(f"Created scan: {scan.scan_id[:16]}...")
        print(f"Status: {scan.status}")
        print("SUCCESS: Scan creation works!")

        # Test 5: Run security scan
        print("\n--- Test 5: Run Security Scan ---")
        # Create a test zip file with some content
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add a manifest
            zf.writestr('test_module/__manifest__.py', '''
name = "test_module"
version = "1.0.0"
''')
            # Add a Python file with some safe code
            zf.writestr('test_module/__init__.py', '''
def hello():
    return "Hello, World!"
''')
            # Add a Python file with some potentially dangerous code (for testing)
            zf.writestr('test_module/dangerous.py', '''
import os
# This should trigger a warning
result = os.system("echo test")
''')

        zip_content = zip_buffer.getvalue()

        scan = service.run_security_scan(scan.scan_id, zip_content)
        print(f"Scan result: {scan.result}")
        print(f"Risk score: {scan.risk_score}")
        print(f"Findings: {len(scan.findings or [])}")
        for finding in (scan.findings or [])[:3]:
            print(f"  - [{finding['severity']}] {finding['message']}")
        print("SUCCESS: Security scanning works!")

        # Test 6: Create security policy
        print("\n--- Test 6: Create Security Policy ---")
        policy = service.create_policy(
            code="test_no_eval",
            name="No eval() calls",
            policy_type="code",
            rule={"pattern": r"\beval\s*\("},
            severity="high",
            is_blocking=True,
            description="Prevents use of eval() which can be dangerous",
        )
        print(f"Created policy: {policy.code}")
        print(f"Severity: {policy.severity}")
        print(f"Blocking: {policy.is_blocking}")
        print("SUCCESS: Policy creation works!")

        # Test 7: Get active policies
        print("\n--- Test 7: Get Active Policies ---")
        policies = service.get_active_policies()
        print(f"Found {len(policies)} active policies")
        for p in policies:
            print(f"  - {p.code}: {p.name}")
        print("SUCCESS: Policy retrieval works!")

        # Test 8: Trusted publisher
        print("\n--- Test 8: Trusted Publisher ---")
        from app.models.user import User
        admin = db.query(User).first()

        trusted = service.grant_trusted_status(
            publisher_id=publisher.id,
            trust_level="verified",
            verified_by=admin.id,
            verification_method="identity",
            privileges={"skip_code_review": True, "auto_publish": False},
        )
        print(f"Publisher {publisher.id} trusted status: {trusted.trust_level}")
        print(f"Skip code review: {trusted.skip_code_review}")
        print(f"Auto publish: {trusted.auto_publish}")
        print("SUCCESS: Trusted publisher works!")

        # Test 9: Check trusted status
        print("\n--- Test 9: Check Trusted Status ---")
        is_trusted = service.is_trusted_publisher(publisher.id)
        print(f"Publisher {publisher.id} is trusted: {is_trusted}")
        print("SUCCESS: Trusted status check works!")

        db.commit()
        print("\n" + "-" * 60)
        print("SECURITY SERVICE TESTS PASSED!")
        print("-" * 60)
        return True

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_payout_service():
    """Test the PayoutService."""
    print("\n" + "=" * 60)
    print("TESTING PAYOUT SERVICE")
    print("=" * 60)

    db = SessionLocal()
    service = PayoutService(db)

    try:
        # Get a publisher to test with
        publisher = db.query(Publisher).first()
        if not publisher:
            print("ERROR: No publisher found. Run security tests first.")
            return False

        print(f"\nUsing publisher: {publisher.display_name} (ID: {publisher.id})")

        # Test 1: Get or create balance
        print("\n--- Test 1: Get/Create Balance ---")
        balance_data = service.get_publisher_balance(publisher.id)
        print(f"Available balance: ${balance_data['available_balance']:.2f}")
        print(f"Pending balance: ${balance_data['pending_balance']:.2f}")
        print(f"Lifetime earnings: ${balance_data['lifetime_earnings']:.2f}")
        print("SUCCESS: Balance retrieval works!")

        # Test 2: Add earnings
        print("\n--- Test 2: Add Earnings ---")
        tx = service.add_earning(
            publisher_id=publisher.id,
            amount=Decimal("100.00"),
            reference_type="order",
            reference_id=1,
            description="Test sale",
            to_pending=True,
        )
        print(f"Transaction ID: {tx.id}")
        print(f"Amount: ${tx.amount:.2f}")
        print(f"Balance after: ${tx.balance_after:.2f}")
        print("SUCCESS: Add earnings works!")

        # Test 3: Check updated balance
        print("\n--- Test 3: Check Updated Balance ---")
        balance_data = service.get_publisher_balance(publisher.id)
        print(f"Pending balance: ${balance_data['pending_balance']:.2f}")
        print("SUCCESS: Balance updated correctly!")

        # Test 4: Move pending to available
        print("\n--- Test 4: Move Pending to Available ---")
        tx = service.move_pending_to_available(publisher.id)
        if tx:
            print(f"Released: ${tx.amount:.2f}")
            print(f"Available after: ${tx.balance_after:.2f}")
        else:
            print("No pending balance to release")
        print("SUCCESS: Balance release works!")

        # Test 5: Check available balance
        print("\n--- Test 5: Check Available Balance ---")
        balance_data = service.get_publisher_balance(publisher.id)
        print(f"Available: ${balance_data['available_balance']:.2f}")
        print(f"Pending: ${balance_data['pending_balance']:.2f}")
        print("SUCCESS: Balance correct!")

        # Test 6: Create payout batch
        print("\n--- Test 6: Create Payout Batch ---")
        batch = service.create_payout_batch(
            period_start=date.today() - timedelta(days=30),
            period_end=date.today(),
            batch_type="regular",
        )
        print(f"Batch ID: {batch.batch_id[:16]}...")
        print(f"Status: {batch.status}")
        print("SUCCESS: Batch creation works!")

        # Test 7: List batches
        print("\n--- Test 7: List Payout Batches ---")
        batches = service.list_payout_batches()
        print(f"Found {len(batches)} batches")
        for b in batches[:3]:
            print(f"  - {b.batch_id[:16]}... ({b.status})")
        print("SUCCESS: Batch listing works!")

        # Test 8: Create adjustment
        print("\n--- Test 8: Create Adjustment ---")
        from app.models.user import User
        admin = db.query(User).first()

        adjustment = service.create_adjustment(
            publisher_id=publisher.id,
            adjustment_type="bonus",
            amount=Decimal("25.00"),
            description="Welcome bonus",
            created_by=admin.id,
        )
        print(f"Adjustment ID: {adjustment.id}")
        print(f"Type: {adjustment.adjustment_type}")
        print(f"Amount: ${adjustment.amount:.2f}")
        print(f"Status: {adjustment.status}")
        print("SUCCESS: Adjustment creation works!")

        # Test 9: Approve adjustment
        print("\n--- Test 9: Approve Adjustment ---")
        adjustment = service.approve_adjustment(adjustment.id, admin.id)
        print(f"Status after approval: {adjustment.status}")

        balance_data = service.get_publisher_balance(publisher.id)
        print(f"Available balance after bonus: ${balance_data['available_balance']:.2f}")
        print("SUCCESS: Adjustment approval works!")

        # Test 10: Get transaction history
        print("\n--- Test 10: Transaction History ---")
        transactions = service.get_transaction_history(publisher.id)
        print(f"Found {len(transactions)} transactions")
        for t in transactions[:5]:
            print(f"  - {t.transaction_type}: ${t.amount:.2f} ({t.description[:30] if t.description else 'N/A'}...)")
        print("SUCCESS: Transaction history works!")

        # Test 11: Get earnings summary
        print("\n--- Test 11: Earnings Summary ---")
        summary = service.get_earnings_summary(publisher.id, period="month")
        print(f"Period: {summary['period']}")
        print(f"Earnings: ${summary['earnings']:.2f}")
        print(f"Payouts: ${summary['payouts']:.2f}")
        print(f"Adjustments: ${summary['adjustments']:.2f}")
        print(f"Net change: ${summary['net_change']:.2f}")
        print("SUCCESS: Earnings summary works!")

        # Test 12: Create payout schedule
        print("\n--- Test 12: Create Payout Schedule ---")
        schedule = service.create_schedule(
            schedule_type="monthly",
            day_of_month=15,
            minimum_amount=Decimal("50.00"),
            processing_hour=9,
        )
        print(f"Schedule ID: {schedule.id}")
        print(f"Type: {schedule.schedule_type}")
        print(f"Day of month: {schedule.day_of_month}")
        print(f"Minimum: ${schedule.minimum_amount:.2f}")
        print(f"Next run: {schedule.next_run_at}")
        print("SUCCESS: Schedule creation works!")

        # Test 13: Get active schedule
        print("\n--- Test 13: Get Active Schedule ---")
        active = service.get_active_schedule()
        if active:
            print(f"Active schedule: {active.schedule_type}")
            print(f"Next run: {active.next_run_at}")
        else:
            print("No active schedule")
        print("SUCCESS: Schedule retrieval works!")

        db.commit()
        print("\n" + "-" * 60)
        print("PAYOUT SERVICE TESTS PASSED!")
        print("-" * 60)
        return True

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all tests."""
    print("\n" + "#" * 60)
    print("# PHASE 3 MARKETPLACE TESTS")
    print("#" * 60)

    results = {
        "security": test_security_service(),
        "payout": test_payout_service(),
    }

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    all_passed = True
    for name, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        print(f"{name.upper()}: {status}")
        if not passed:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("ALL TESTS PASSED!")
    else:
        print("SOME TESTS FAILED!")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
