#!/bin/bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")

echo "============================================================"
echo "FULL INSTALL/UNINSTALL CYCLE TEST"
echo "============================================================"

echo ""
echo "1. Initial CRM state:"
curl -s "http://localhost:8000/api/v1/modules/crm" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"   State: {d.get('state')}\")"

echo ""
echo "2. Installing CRM..."
RESULT=$(curl -s -X POST "http://localhost:8000/api/v1/modules/install/crm" -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"   Success: {d.get('success')}\"); print(f\"   Message: {d.get('message')}\")"

echo ""
echo "3. Uninstalling CRM..."
RESULT=$(curl -s -X POST "http://localhost:8000/api/v1/modules/uninstall/crm" -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"   Success: {d.get('success')}\"); print(f\"   Message: {d.get('message')}\")"

echo ""
echo "4. Final CRM state:"
curl -s "http://localhost:8000/api/v1/modules/crm" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"   State: {d.get('state')}\")"

echo ""
echo "============================================================"
echo "TEST COMPLETE"
echo "============================================================"
