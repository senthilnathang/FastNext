#!/usr/bin/env python3
"""
Fix missing dependencies for the Dynamic Import/Export system
"""
import subprocess
import sys
from pathlib import Path


def run_command(command, description):
    """Run a shell command and return success status"""
    print(f"📦 {description}...")
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, check=True
        )
        print(f"✅ {description} completed successfully")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"   Error output: {e.stderr}")
        return False, e.stderr


def main():
    """Fix dependencies and test import"""
    print("🔄 Fixing Dynamic Import/Export Dependencies")
    print("=" * 60)

    # Step 1: Install missing dependencies
    missing_deps = ["openpyxl", "xlsxwriter", "xlrd", "lxml"]

    print(f"\n1. Installing missing dependencies: {', '.join(missing_deps)}")
    install_command = f"pip install {' '.join(missing_deps)}"
    success, output = run_command(install_command, "Installing missing packages")

    if not success:
        print("\n❌ Dependency installation failed!")
        print("   Try installing manually with:")
        print(f"   {install_command}")
        return 1

    # Step 2: Test imports
    print("\n2. Testing imports...")
    test_success, test_output = run_command(
        "python3 check_dependencies.py", "Checking all dependencies"
    )

    if not test_success:
        print("❌ Some dependencies are still missing")
        return 1

    # Step 3: Test main import
    print("\n3. Testing main application import...")
    import_success, import_output = run_command(
        "python3 -c \"from app.api.v1.data_import_export import router; print('✅ Import/Export module loaded successfully')\"",
        "Testing import/export module",
    )

    if not import_success:
        print("❌ Application import failed")
        print("   There might be other missing dependencies or configuration issues")
        return 1

    # Step 4: Test syntax
    print("\n4. Testing syntax...")
    syntax_success, syntax_output = run_command(
        "python3 test_syntax_fix.py", "Testing Python syntax"
    )

    if not syntax_success:
        print("❌ Syntax tests failed")
        return 1

    print("\n" + "=" * 60)
    print("🎉 All fixes applied successfully!")
    print("\n✅ Dependencies installed")
    print("✅ Imports working")
    print("✅ Syntax validated")

    print("\n🚀 Next Steps:")
    print("1. Start the backend server:")
    print("   python main.py")
    print("\n2. Start the frontend server (in another terminal):")
    print("   cd ../frontend")
    print("   npm run dev")
    print("\n3. Test Dynamic Import/Export:")
    print("   http://localhost:3000/settings/data-import")
    print("   http://localhost:3000/settings/data-export")

    return 0


if __name__ == "__main__":
    sys.exit(main())
