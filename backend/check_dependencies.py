#!/usr/bin/env python3
"""
Check for missing dependencies required by the import/export system
"""
import importlib
import sys
from pathlib import Path


def check_module(module_name, package_name=None):
    """Check if a module can be imported"""
    try:
        importlib.import_module(module_name)
        return True, None
    except ImportError as e:
        return False, str(e)


def main():
    """Check all required dependencies"""
    print("🔄 Checking Import/Export Dependencies")
    print("=" * 50)

    # List of modules required by the import/export system
    required_modules = [
        ("aiofiles", "aiofiles"),
        ("openpyxl", "openpyxl"),
        ("xlsxwriter", "XlsxWriter"),
        ("pandas", "pandas"),
        ("xlrd", "xlrd"),
        ("lxml", "lxml"),
        ("yaml", "PyYAML"),
        ("xml.etree.ElementTree", None),  # Built-in
        ("csv", None),  # Built-in
        ("json", None),  # Built-in
        ("io", None),  # Built-in
        ("tempfile", None),  # Built-in
        ("pathlib", None),  # Built-in
        ("asyncio", None),  # Built-in
    ]

    missing_modules = []

    for module_name, package_name in required_modules:
        available, error = check_module(module_name)
        display_name = package_name or module_name

        if available:
            print(f"✅ {display_name}")
        else:
            print(f"❌ {display_name}: {error}")
            if package_name:  # Only add to missing if it's an installable package
                missing_modules.append(package_name)

    print("\n" + "=" * 50)

    if missing_modules:
        print("❌ Missing Dependencies Found!")
        print(f"   Missing: {', '.join(missing_modules)}")
        print("\n📦 To install missing dependencies:")
        print("   pip install " + " ".join(missing_modules))
        print("\n   Or install all requirements:")
        print("   pip install -r requirements.txt")
        return 1
    else:
        print("✅ All dependencies are available!")
        print("\n🚀 You can now start the server:")
        print("   python main.py")
        return 0


if __name__ == "__main__":
    sys.exit(main())
