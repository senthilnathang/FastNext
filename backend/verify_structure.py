#!/usr/bin/env python3
"""
Backend Structure Verification Script
Verifies the optimized backend structure
"""
import os
import sys
from pathlib import Path


def check_file_exists(path: str) -> bool:
    """Check if file exists"""
    return Path(path).exists()


def check_directory_exists(path: str) -> bool:
    """Check if directory exists"""
    return Path(path).is_dir()


def verify_clean_architecture():
    """Verify clean architecture structure"""
    print("🏗️  Verifying Clean Architecture Structure...")
    
    checks = [
        # Domain Layer
        ("Domain Layer", "app/domain", True),
        ("Domain Entities", "app/domain/entities", True),
        ("Domain Repositories", "app/domain/repositories", True), 
        ("Domain Value Objects", "app/domain/value_objects", True),
        ("User Entity", "app/domain/entities/user.py", False),
        ("Email Value Object", "app/domain/value_objects/email.py", False),
        ("User Repository Interface", "app/domain/repositories/user_repository.py", False),
        
        # Application Layer
        ("Application Layer", "app/application", True),
        ("Use Cases", "app/application/use_cases", True),
        ("Commands", "app/application/commands", True),
        ("Queries", "app/application/queries", True),
        ("Events", "app/application/events", True),
        ("Create User Use Case", "app/application/use_cases/create_user.py", False),
        
        # API Layer
        ("API Dependencies", "app/api/deps", True),
        ("Database Dependencies", "app/api/deps/database.py", False),
        ("Auth Dependencies", "app/api/deps/auth.py", False),
        ("Pagination Dependencies", "app/api/deps/pagination.py", False),
        ("API v1", "app/api/v1", True),
        ("v1 Router", "app/api/v1/main.py", False),
        ("Main API Router", "app/api/main.py", False),
    ]
    
    passed = 0
    total = len(checks)
    
    for name, path, is_dir in checks:
        if is_dir:
            exists = check_directory_exists(path)
            icon = "📁" if exists else "❌"
        else:
            exists = check_file_exists(path)
            icon = "📄" if exists else "❌"
        
        status = "✅" if exists else "❌"
        print(f"  {icon} {name}: {status}")
        
        if exists:
            passed += 1
    
    print(f"\n📊 Structure Check: {passed}/{total} passed")
    return passed == total


def verify_api_organization():
    """Verify API organization"""
    print("\n🌐 Verifying API Organization...")
    
    # Check if old routes directory was moved
    old_routes_exist = check_directory_exists("app/api/routes")
    v1_routes_exist = check_directory_exists("app/api/v1")
    
    print(f"  📁 Old routes directory removed: {'✅' if not old_routes_exist else '❌'}")
    print(f"  📁 v1 routes directory created: {'✅' if v1_routes_exist else '❌'}")
    
    # Check for route files in v1
    route_files = [
        "auth_routes.py", "users.py", "roles.py", "permissions.py",
        "projects.py", "workflow_instances.py", "activity_logs.py"
    ]
    
    moved_files = 0
    for route_file in route_files:
        v1_path = f"app/api/v1/{route_file}"
        if check_file_exists(v1_path):
            moved_files += 1
            print(f"  📄 {route_file}: ✅")
        else:
            print(f"  📄 {route_file}: ❌")
    
    print(f"\n📊 Route Migration: {moved_files}/{len(route_files)} files moved")
    return moved_files >= len(route_files) * 0.8  # 80% threshold


def verify_import_structure():
    """Verify import structure improvements"""
    print("\n📦 Verifying Import Structure...")
    
    # Check main API router structure
    try:
        with open("app/api/main.py", "r") as f:
            content = f.read()
            
        has_version_prefix = 'prefix="/api"' in content
        has_health_check = "health_check" in content
        imports_v1_router = "from app.api.v1.main import v1_router" in content
        
        print(f"  🔄 API versioning: {'✅' if has_version_prefix else '❌'}")
        print(f"  🏥 Health check endpoint: {'✅' if has_health_check else '❌'}")
        print(f"  📥 v1 router import: {'✅' if imports_v1_router else '❌'}")
        
        return has_version_prefix and has_health_check and imports_v1_router
        
    except FileNotFoundError:
        print("  ❌ app/api/main.py not found")
        return False


def main():
    """Main verification function"""
    print("🔍 FastNext Backend Structure Verification")
    print("=" * 50)
    
    # Change to backend directory
    os.chdir(Path(__file__).parent)
    
    # Run all verifications
    results = []
    results.append(verify_clean_architecture())
    results.append(verify_api_organization())
    results.append(verify_import_structure())
    
    # Overall result
    print("\n" + "=" * 50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print("🎉 All structure verifications passed!")
        print("✨ Backend optimization completed successfully")
        return 0
    else:
        print(f"⚠️  {passed}/{total} verifications passed")
        print("🔧 Some optimizations may need attention")
        return 1


if __name__ == "__main__":
    sys.exit(main())