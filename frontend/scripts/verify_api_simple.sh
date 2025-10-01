#!/bin/bash
# Simple Frontend API Integration Verification Script
# Checks for proper /api/v1 usage and API_CONFIG implementation

echo "🔍 Frontend API Integration Verification"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

# Function to check file and report
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo -e "  ✅ ${GREEN}$description${NC}"
        ((passed++))
        return 0
    else
        echo -e "  ❌ ${RED}$description - File missing${NC}"
        ((failed++))
        return 1
    fi
}

# Function to check for pattern in file
check_pattern() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    local should_exist="$4" # true if pattern should exist, false if it shouldn't
    
    if [ ! -f "$file" ]; then
        echo -e "  ❌ ${RED}$description - File not found${NC}"
        ((failed++))
        return 1
    fi
    
    if grep -q "$pattern" "$file"; then
        if [ "$should_exist" = "true" ]; then
            echo -e "  ✅ ${GREEN}$description${NC}"
            ((passed++))
        else
            echo -e "  ❌ ${RED}$description - Found problematic pattern${NC}"
            ((failed++))
        fi
    else
        if [ "$should_exist" = "true" ]; then
            echo -e "  ❌ ${RED}$description - Pattern not found${NC}"
            ((failed++))
        else
            echo -e "  ✅ ${GREEN}$description${NC}"
            ((passed++))
        fi
    fi
}

echo ""
echo "📦 Checking API Configuration..."
check_file "src/shared/services/api/config.ts" "API Config file exists"
check_pattern "src/shared/services/api/config.ts" "/api/v1/" "API config uses v1 endpoints" "true"
check_pattern "src/shared/services/api/config.ts" "USERS: '/api/v1/users'" "Users endpoint configured" "true"
check_pattern "src/shared/services/api/config.ts" "ROLES: '/api/v1/roles'" "Roles endpoint configured" "true"
check_pattern "src/shared/services/api/config.ts" "PERMISSIONS: '/api/v1/permissions'" "Permissions endpoint configured" "true"

echo ""
echo "🔧 Checking Service Files..."
check_file "src/shared/services/api/users.ts" "Users service exists"
check_pattern "src/shared/services/api/users.ts" "API_CONFIG" "Users service imports API_CONFIG" "true"

check_file "src/shared/services/permissions.ts" "Permissions service exists"  
check_pattern "src/shared/services/permissions.ts" "API_CONFIG" "Permissions service uses API_CONFIG" "true"
check_pattern "src/shared/services/permissions.ts" "apiClient.get('/permissions" "Permissions service avoids hardcoded endpoints" "false"

check_file "src/shared/services/projects.ts" "Projects service exists"
check_pattern "src/shared/services/projects.ts" "API_CONFIG" "Projects service uses API_CONFIG" "true"
check_pattern "src/shared/services/projects.ts" "apiClient.get('/projects" "Projects service avoids hardcoded endpoints" "false"

echo ""
echo "🔄 Checking tRPC Routers..."
check_file "src/lib/trpc/routers/users.ts" "Users tRPC router exists"
check_pattern "src/lib/trpc/routers/users.ts" "API_CONFIG" "Users tRPC router imports API_CONFIG" "true"
check_pattern "src/lib/trpc/routers/users.ts" "apiClient.get('/users" "Users tRPC avoids hardcoded endpoints" "false"

check_file "src/lib/trpc/routers/roles.ts" "Roles tRPC router exists"
check_pattern "src/lib/trpc/routers/roles.ts" "API_CONFIG" "Roles tRPC router imports API_CONFIG" "true"
check_pattern "src/lib/trpc/routers/roles.ts" "apiClient.get('/roles" "Roles tRPC avoids hardcoded endpoints" "false"

check_file "src/lib/trpc/routers/permissions.ts" "Permissions tRPC router exists"
check_pattern "src/lib/trpc/routers/permissions.ts" "API_CONFIG" "Permissions tRPC router imports API_CONFIG" "true"

check_file "src/lib/trpc/routers/projects.ts" "Projects tRPC router exists"
check_pattern "src/lib/trpc/routers/projects.ts" "API_CONFIG" "Projects tRPC router imports API_CONFIG" "true"

echo ""
echo "🔍 Checking for Old Patterns..."
# Check for any remaining old API patterns
if find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "apiClient\.get('/[^a]" | head -1 > /dev/null 2>&1; then
    echo -e "  ⚠️  ${YELLOW}Found potential hardcoded endpoints${NC}"
    find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "apiClient\.get('/[^a]" | head -3 | while read file; do
        echo "    - $file"
    done
    ((failed++))
else
    echo -e "  ✅ ${GREEN}No hardcoded endpoints found${NC}"
    ((passed++))
fi

echo ""
echo "=================================================="
echo "📊 Verification Results:"
echo "  Passed: $passed ✅"
echo "  Failed: $failed ❌"
echo "  Total:  $((passed + failed))"

if [ $failed -eq 0 ]; then
    echo ""
    echo -e "🎉 ${GREEN}All API integrations are properly updated!${NC}"
    echo -e "✨ ${GREEN}Frontend is ready for the new /api/v1 structure${NC}"
    exit 0
else
    echo ""
    echo -e "⚠️  ${YELLOW}Some issues need attention${NC}"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Ensure all service files import API_CONFIG"
    echo "  2. Replace any remaining hardcoded endpoints"
    echo "  3. Update tRPC routers to use API_CONFIG.ENDPOINTS"
    exit 1
fi