#!/bin/bash

TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "============================================================"
echo "FULL INSTALL/UNINSTALL CYCLE TEST"
echo "============================================================"

echo ""
echo "1. Initial CRM state:"
curl -s "http://localhost:8000/api/v1/modules/crm" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "2. Installing CRM..."
curl -s -X POST "http://localhost:8000/api/v1/modules/install/crm" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "3. CRM state after install:"
curl -s "http://localhost:8000/api/v1/modules/crm" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "4. Uninstalling CRM..."
curl -s -X POST "http://localhost:8000/api/v1/modules/uninstall/crm" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "5. Final CRM state:"
curl -s "http://localhost:8000/api/v1/modules/crm" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "============================================================"
echo "TEST COMPLETE"
echo "============================================================"
