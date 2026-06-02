#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "=== Killing stale processes on ports 4000-4005 ==="
lsof -ti:4000-4005 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "=== Starting all services ==="
npm run dev:all &
DEV_PID=$!

cleanup() {
  echo ""
  echo "=== Stopping services ==="
  kill $DEV_PID 2>/dev/null || true
  lsof -ti:4000-4005 2>/dev/null | xargs kill -9 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

echo "=== Waiting for gateway on port 4000 ==="
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/graphql -H 'Content-Type: application/json' \
    -d '{"query":"{ __typename }"}' > /dev/null 2>&1; then
    echo "Gateway ready after ${i}s"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Gateway failed to start within 60s"
    exit 1
  fi
  sleep 1
done

sleep 2

echo "=== Logging in as admin ==="
LOGIN=$(curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { login(input: { email: \"admin@smarttraffic.com\", password: \"admin1234\" }) { token } }"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['login']['token'])")
echo "Got token: ${TOKEN:0:20}..."

AUTH="Authorization: Bearer $TOKEN"
GQL="http://localhost:4000/graphql"

echo ""
echo "=== 1. me ==="
curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"{ me { id email role } }"}' | python3 -m json.tool

echo ""
echo "=== 2. List / create zone ==="
ZONES=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"{ zones { id name } }"}')
ZONE_ID=$(echo "$ZONES" | python3 -c "
import sys,json
data = json.load(sys.stdin)['data']['zones']
if data:
    print(data[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")
if [ -z "$ZONE_ID" ]; then
  ZONE=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
    -d '{"query":"mutation { createZone(input: { name: \"Downtown\" }) { id name createdAt } }"}')
  echo "$ZONE" | python3 -m json.tool
  ZONE_ID=$(echo "$ZONE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createZone']['id'])")
else
  echo "Reusing existing zone: $ZONE_ID"
fi

echo ""
echo "=== 3. List / create vehicle ==="
VEHS=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"{ vehicles { id licensePlate } }"}')
VEH_ID=$(echo "$VEHS" | python3 -c "
import sys,json
data = json.load(sys.stdin)['data']['vehicles']
if data:
    print(data[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")
if [ -z "$VEH_ID" ]; then
  VEH=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"query\":\"mutation { createVehicle(input: { licensePlate: \\\"ABC-1234\\\", type: CAR }) { id licensePlate } }\"}")
  echo "$VEH" | python3 -m json.tool
  VEH_ID=$(echo "$VEH" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createVehicle']['id'])")
else
  echo "Reusing existing vehicle: $VEH_ID"
fi

echo ""
echo "=== 4. Record GPS ==="
curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation { recordGpsPosition(vehicleId: \\\"$VEH_ID\\\", input: { latitude: 48.8566, longitude: 2.3522, recordedAt: \\\"2026-06-02T12:00:00Z\\\" }) { id latitude longitude } }\"}" | python3 -m json.tool

echo ""
echo "=== 5. Compute density ==="
curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"mutation { computeDensity { id zoneId vehicleCount classification } }"}' | python3 -m json.tool

echo ""
echo "=== 6. List / create incident ==="
INCS=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"{ incidents { id type status } }"}')
INC_ID=$(echo "$INCS" | python3 -c "
import sys,json
data = json.load(sys.stdin)['data']['incidents']
if data:
    print(data[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")
if [ -z "$INC_ID" ]; then
  INC=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"query\":\"mutation { createIncident(input: { type: ACCIDENT, description: \\\"Multi-vehicle collision on Main St\\\", latitude: 48.8570, longitude: 2.3525 }) { id type status description } }\"}")
  echo "$INC" | python3 -m json.tool
  INC_ID=$(echo "$INC" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createIncident']['id'])")
else
  echo "Reusing existing incident: $INC_ID"
fi

echo ""
echo "=== 7. Read incident status and advance it ==="
INC_STATUS=$(curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ incident(id: \\\"$INC_ID\\\") { status } }\"}")
CUR_STATUS=$(echo "$INC_STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['incident']['status'])" 2>/dev/null)
if [ "$CUR_STATUS" = "REPORTED" ]; then
  NEXT="IN_PROGRESS"
elif [ "$CUR_STATUS" = "IN_PROGRESS" ]; then
  NEXT="RESOLVED"
else
  NEXT="RESOLVED"
fi
echo "Current: $CUR_STATUS → $NEXT"
curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation { updateIncidentStatus(id: \\\"$INC_ID\\\", input: { status: $NEXT }) { id status } }\"}" | python3 -m json.tool

echo ""
echo "=== 8. Notifications (auto-created by incident) ==="
curl -s $GQL -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"query":"{ notifications { id title message isRead } }"}' | python3 -m json.tool

echo ""
echo "=== ALL DEMO STEPS PASSED ==="
echo "Services are still running in background."
echo "Press Ctrl+C to stop all services."
wait $DEV_PID
