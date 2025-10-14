#!/usr/bin/env python3
"""
Create system configuration tables manually
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def create_system_config_tables():
    """Create system configuration tables directly"""

    try:
        from app.core.config import settings
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker

        # Create database connection
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        SessionLocal = sessionmaker(bind=engine)

        with engine.connect() as connection:
            # Check if tables already exist
            result = connection.execute(
                text(
                    """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'system_configurations'
            """
                )
            )

            if result.fetchone():
                print("✅ system_configurations table already exists")
                return True

            print("Creating system configuration tables...")

            # Create system_configurations table
            connection.execute(
                text(
                    """
                CREATE TABLE system_configurations (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) NOT NULL UNIQUE,
                    category VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    config_data JSONB NOT NULL DEFAULT '{}',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    is_system_config BOOLEAN NOT NULL DEFAULT FALSE,
                    requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
                    default_value JSONB NOT NULL DEFAULT '{}',
                    validation_schema JSONB NOT NULL DEFAULT '{}',
                    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
                    previous_version JSONB NOT NULL DEFAULT '{}',
                    tags JSONB NOT NULL DEFAULT '[]',
                    environment VARCHAR(50) NOT NULL DEFAULT 'production',
                    last_applied_at TIMESTAMP WITH TIME ZONE,
                    last_validated_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by INTEGER,
                    updated_by INTEGER
                )
            """
                )
            )

            # Create indexes
            connection.execute(
                text(
                    """
                CREATE INDEX idx_system_configurations_key ON system_configurations(key);
                CREATE INDEX idx_system_configurations_category ON system_configurations(category);
                CREATE INDEX idx_system_configurations_category_active ON system_configurations(category, is_active);
            """
                )
            )

            # Create configuration audit logs table
            connection.execute(
                text(
                    """
                CREATE TABLE configuration_audit_logs (
                    id SERIAL PRIMARY KEY,
                    configuration_key VARCHAR(255) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    old_value JSONB NOT NULL DEFAULT '{}',
                    new_value JSONB NOT NULL DEFAULT '{}',
                    change_reason TEXT,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    environment VARCHAR(50),
                    validation_passed BOOLEAN,
                    validation_errors JSONB NOT NULL DEFAULT '[]',
                    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    created_by INTEGER,
                    updated_by INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """
                )
            )

            # Create indexes for audit logs
            connection.execute(
                text(
                    """
                CREATE INDEX idx_configuration_audit_logs_key ON configuration_audit_logs(configuration_key);
                CREATE INDEX idx_configuration_audit_logs_action ON configuration_audit_logs(action);
                CREATE INDEX idx_configuration_audit_logs_timestamp ON configuration_audit_logs(timestamp);
            """
                )
            )

            connection.commit()

            print("✅ System configuration tables created successfully!")

            # Insert default data import/export configuration
            print("Creating default data import/export configuration...")

            connection.execute(
                text(
                    """
                INSERT INTO system_configurations (
                    key, category, name, description, config_data, is_active, is_system_config, created_by
                ) VALUES (
                    'data_import_export.default',
                    'data_import_export',
                    'Default Data Import/Export Configuration',
                    'Default settings for data import and export operations',
                    :config_data,
                    TRUE,
                    TRUE,
                    1
                )
            """
                ),
                {
                    "config_data": """{
                    "max_file_size_mb": 100,
                    "allowed_formats": ["csv", "json", "xlsx"],
                    "batch_size": 1000,
                    "timeout_seconds": 300,
                    "enable_validation": true,
                    "enable_audit_log": true,
                    "require_approval": false,
                    "notify_on_completion": true,
                    "compression_level": "medium",
                    "retention_days": 30,
                    "encryption_enabled": false,
                    "parallel_processing": true,
                    "max_concurrent_jobs": 5,
                    "memory_limit_mb": 512
                }"""
                },
            )

            connection.commit()
            print("✅ Default configuration inserted successfully!")

            return True

    except Exception as e:
        print(f"❌ Failed to create configuration tables: {e}")
        import traceback

        traceback.print_exc()
        return False


def verify_tables():
    """Verify that tables were created correctly"""

    try:
        from app.core.config import settings
        from sqlalchemy import create_engine, text

        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

        with engine.connect() as connection:
            # Check system_configurations table
            result = connection.execute(
                text(
                    """
                SELECT COUNT(*) as count FROM system_configurations
                WHERE category = 'data_import_export'
            """
                )
            )
            count = result.fetchone()[0]

            print(f"✅ Found {count} data import/export configuration(s)")

            # Test the specific query that the endpoint uses
            result = connection.execute(
                text(
                    """
                SELECT * FROM system_configurations
                WHERE category = 'data_import_export' AND is_active = TRUE
                LIMIT 1
            """
                )
            )
            config = result.fetchone()

            if config:
                print("✅ Configuration endpoint query test successful")
                print(f"   Config key: {config[1]}")
                print(f"   Config name: {config[3]}")
                return True
            else:
                print("❌ No active data import/export configuration found")
                return False

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False


if __name__ == "__main__":
    print("Creating System Configuration Tables...")
    print("=" * 50)

    success1 = create_system_config_tables()
    success2 = verify_tables() if success1 else False

    print("\n" + "=" * 50)
    if success1 and success2:
        print("✅ CONFIGURATION TABLES SETUP SUCCESSFUL!")
        print("\n🎯 What was created:")
        print("  - ✅ system_configurations table")
        print("  - ✅ configuration_audit_logs table")
        print("  - ✅ Required indexes for performance")
        print("  - ✅ Default data import/export configuration")

        print("\n🚀 Configuration endpoint should now work!")
        print("   Try: GET /api/v1/config/data-import-export/current")

    else:
        print("❌ Setup failed!")
        sys.exit(1)
