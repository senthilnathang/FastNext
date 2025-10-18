#!/usr/bin/env python3
"""
Test script for CSP functionality
"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.csp_config import get_csp_header, get_csp_directives, add_csp_url, remove_csp_url

def test_csp_functionality():
    """Test CSP configuration functionality"""
    print("🧪 Testing CSP Configuration System")
    print("=" * 50)

    # Test getting current CSP header
    print("📋 Current CSP Header:")
    header = get_csp_header()
    print(f"   {header}")
    print()

    # Test getting directives
    print("📋 Current CSP Directives:")
    directives = get_csp_directives()
    for directive, urls in directives.items():
        print(f"   {directive}: {urls}")
    print()

    # Test adding a URL
    print("➕ Adding test URL...")
    add_csp_url("script-src", "https://test.example.com")
    print("   Added https://test.example.com to script-src")
    print(f"   Updated header: {get_csp_header()}")
    print()

    # Test removing the URL
    print("➖ Removing test URL...")
    remove_csp_url("script-src", "https://test.example.com")
    print("   Removed https://test.example.com from script-src")
    print(f"   Final header: {get_csp_header()}")
    print()

    print("✅ CSP functionality tests completed successfully!")

if __name__ == "__main__":
    test_csp_functionality()