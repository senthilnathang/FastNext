#!/usr/bin/env python3
"""
CSP Management Script
Add, remove, and manage Content Security Policy URLs
"""
import argparse
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.csp_config import (
    CSPConfig,
    add_csp_url,
    remove_csp_url,
    get_csp_directives,
    get_csp_header,
)


def list_urls():
    """List all current CSP directives and URLs"""
    print("🔒 Current Content Security Policy Configuration:")
    print("=" * 60)

    directives = get_csp_directives()
    for directive, urls in directives.items():
        print(f"\n{directive}:")
        if urls:
            for url in urls:
                print(f"  ✓ {url}")
        else:
            print("  (no URLs configured)")

    print("\n" + "=" * 60)
    print("📋 Complete CSP Header:")
    print(get_csp_header())


def add_url(directive: str, url: str):
    """Add a URL to a CSP directive"""
    try:
        add_csp_url(directive, url)
        print(f"✅ Added '{url}' to {directive}")
        print(f"📋 Updated CSP: {get_csp_header()}")
    except Exception as e:
        print(f"❌ Error adding URL: {e}")


def remove_url(directive: str, url: str):
    """Remove a URL from a CSP directive"""
    try:
        remove_csp_url(directive, url)
        print(f"✅ Removed '{url}' from {directive}")
        print(f"📋 Updated CSP: {get_csp_header()}")
    except Exception as e:
        print(f"❌ Error removing URL: {e}")


def show_header():
    """Show the current CSP header"""
    print("📋 Current CSP Header:")
    print(get_csp_header())


def main():
    parser = argparse.ArgumentParser(description="Manage Content Security Policy URLs")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # List command
    subparsers.add_parser("list", help="List all CSP directives and URLs")

    # Add command
    add_parser = subparsers.add_parser("add", help="Add a URL to a CSP directive")
    add_parser.add_argument("directive", help="CSP directive (e.g., script-src, style-src)")
    add_parser.add_argument("url", help="URL to add (e.g., https://cdn.jsdelivr.net)")

    # Remove command
    remove_parser = subparsers.add_parser("remove", help="Remove a URL from a CSP directive")
    remove_parser.add_argument("directive", help="CSP directive (e.g., script-src, style-src)")
    remove_parser.add_argument("url", help="URL to remove")

    # Header command
    subparsers.add_parser("header", help="Show the current CSP header")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "list":
        list_urls()
    elif args.command == "add":
        add_url(args.directive, args.url)
    elif args.command == "remove":
        remove_url(args.directive, args.url)
    elif args.command == "header":
        show_header()


if __name__ == "__main__":
    main()