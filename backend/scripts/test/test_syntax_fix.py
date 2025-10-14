#!/usr/bin/env python3
"""
Test script to verify syntax fixes for data import/export module
"""
import ast
import sys
from pathlib import Path


def test_syntax(file_path):
    """Test if Python file has valid syntax"""
    try:
        with open(file_path, "r") as f:
            source = f.read()

        # Try to parse the AST
        ast.parse(source)
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Unexpected error: {e}"


def main():
    """Test syntax of key files"""
    files_to_test = [
        "app/api/v1/data_import_export.py",
        "app/api/v1/main.py",
        "app/api/main.py",
        "main.py",
    ]

    print("🔄 Testing Python Syntax")
    print("=" * 40)

    all_passed = True

    for file_path in files_to_test:
        full_path = Path(file_path)
        if full_path.exists():
            passed, error = test_syntax(full_path)
            if passed:
                print(f"✅ {file_path}")
            else:
                print(f"❌ {file_path}: {error}")
                all_passed = False
        else:
            print(f"⚠️  {file_path}: File not found")

    print("\n" + "=" * 40)
    if all_passed:
        print("✅ All syntax tests passed!")
        print("🚀 The server should now start without syntax errors")
        print("\nTo start the server:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Start server: python main.py")
    else:
        print("❌ Some syntax errors remain")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
