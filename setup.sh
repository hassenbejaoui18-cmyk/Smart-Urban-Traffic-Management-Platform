#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Smart Urban Traffic Management — One-Command Setup
# ─────────────────────────────────────────────────────────────
# Usage:  ./setup.sh              # full setup + start all services
#         ./setup.sh --skip-start # setup only, skip dev:all
#         ./setup.sh --db-user postgres  # custom PG user
# ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { printf "${GREEN}✓${NC} %s\n" "$1"; }
info() { printf "${YELLOW}▶${NC} %s\n" "$1"; }
err()  { printf "${RED}✗${NC} %s\n" "$1" >&2; exit 1; }

# ── Parse flags ──
SKIP_START=false
DB_USER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-start) SKIP_START=true; shift ;;
    --db-user)    DB_USER="$2"; shift 2 ;;
    *)            err "Unknown flag: $1. Usage: ./setup.sh [--skip-start] [--db-user <user>]" ;;
  esac
done

# ── Determine PostgreSQL user ──
if [[ -z "$DB_USER" ]]; then
  DB_USER=$(whoami)
fi
log "PostgreSQL user: $DB_USER"

# ── Root directory ──
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

SERVICES_DIRS=("auth" "vehicles" "traffic" "incidents" "notifications")
DATABASES=(
  "smart_traffic_auth"
  "smart_traffic_vehicle"
  "smart_traffic_traffic"
  "smart_traffic_incident"
  "smart_traffic_notification"
)

# Verify PostgreSQL connection
info "Checking PostgreSQL connection..."
if ! psql -U "$DB_USER" -c "SELECT 1" template1 &>/dev/null; then
  err "Cannot connect to PostgreSQL as user '$DB_USER'. Is PostgreSQL running?"
fi
log "PostgreSQL is reachable"

# ── Create databases (ignore if already exist) ──
info "Creating databases..."
for db in "${DATABASES[@]}"; do
  psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$db'" template1 | grep -q 1 \
    && log "Database '$db' already exists" \
    || { psql -U "$DB_USER" -c "CREATE DATABASE $db;" template1 && log "Created database '$db'"; }
done

# ── Generate JWT secret ──
JWT_SECRET=$(openssl rand -hex 32)
log "Generated JWT secret"

# ── Generate .env files ──
info "Generating .env files..."

# Auth
cat > services/auth/.env <<ENVEOF
AUTH_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=${JWT_SECRET}
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001
ENVEOF
log "services/auth/.env written"

# Vehicles
cat > services/vehicles/.env <<ENVEOF
VEHICLE_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_vehicle
VEHICLE_JWT_SECRET=${JWT_SECRET}
VEHICLE_JWT_EXPIRATION=24h
VEHICLE_PORT=4002
ENVEOF
log "services/vehicles/.env written"

# Traffic
cat > services/traffic/.env <<ENVEOF
TRAFFIC_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_traffic
TRAFFIC_JWT_SECRET=${JWT_SECRET}
TRAFFIC_JWT_EXPIRATION=24h
TRAFFIC_PORT=4003
TRAFFIC_DENSITY_LOW_MAX=5
TRAFFIC_DENSITY_MEDIUM_MAX=20
VEHICLE_SERVICE_URL=http://localhost:4002/graphql
ENVEOF
log "services/traffic/.env written"

# Incidents
cat > services/incidents/.env <<ENVEOF
INCIDENT_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_incident
INCIDENT_JWT_SECRET=${JWT_SECRET}
INCIDENT_JWT_EXPIRATION=24h
INCIDENT_PORT=4004
NOTIFICATION_SERVICE_URL=http://localhost:4005/graphql
ENVEOF
log "services/incidents/.env written"

# Notifications
cat > services/notifications/.env <<ENVEOF
NOTIFICATION_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_notification
NOTIFICATION_JWT_SECRET=${JWT_SECRET}
NOTIFICATION_JWT_EXPIRATION=24h
NOTIFICATION_PORT=4005
ENVEOF
log "services/notifications/.env written"

# Gateway
cat > gateway/.env <<ENVEOF
GATEWAY_PORT=4000
AUTH_JWT_SECRET=${JWT_SECRET}
ENVEOF
log "gateway/.env written"

# Root .env (for reference / direct use)
cat > .env <<ENVEOF
AUTH_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=${JWT_SECRET}
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001

VEHICLE_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_vehicle
VEHICLE_JWT_SECRET=${JWT_SECRET}
VEHICLE_JWT_EXPIRATION=24h
VEHICLE_PORT=4002

TRAFFIC_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_traffic
TRAFFIC_JWT_SECRET=${JWT_SECRET}
TRAFFIC_JWT_EXPIRATION=24h
TRAFFIC_PORT=4003
TRAFFIC_DENSITY_LOW_MAX=5
TRAFFIC_DENSITY_MEDIUM_MAX=20
VEHICLE_SERVICE_URL=http://localhost:4002/graphql

INCIDENT_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_incident
INCIDENT_JWT_SECRET=${JWT_SECRET}
INCIDENT_JWT_EXPIRATION=24h
INCIDENT_PORT=4004
NOTIFICATION_SERVICE_URL=http://localhost:4005/graphql

NOTIFICATION_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/smart_traffic_notification
NOTIFICATION_JWT_SECRET=${JWT_SECRET}
NOTIFICATION_JWT_EXPIRATION=24h
NOTIFICATION_PORT=4005

GATEWAY_PORT=4000
ENVEOF
log "root .env written"

# ── Install dependencies ──
info "Installing npm dependencies..."
npm install
log "Dependencies installed"

# ── Generate Prisma clients ──
info "Generating Prisma clients..."
npm run prisma:generate:all
log "Prisma clients generated"

# ── Sync database schemas ──
info "Syncing database schemas..."
for s in "${SERVICES_DIRS[@]}"; do
  printf "  %s... " "$s"
  if (cd "services/${s}" && npx prisma db push --accept-data-loss 2>/dev/null); then
    printf "${GREEN}OK${NC}\n"
  else
    printf "${RED}FAILED${NC}\n"
    err "${s} schema sync failed"
  fi
done

# ── Seed admin user ──
info "Seeding admin user..."
if (cd services/auth && npx prisma db seed 2>/dev/null); then
  log "Admin user seeded (admin@smarttraffic.com / admin1234)"
else
  err "Seeding admin user failed"
fi

# ── Build all services ──
info "Building all services..."
npm run build:all
log "All services built"

# ── Regenerate Prisma clients (survive npm prune during install) ──
info "Regenerating Prisma clients..."
npm run prisma:generate:all
log "Prisma clients regenerated"

# ── Done ──
info "── Setup complete ──"
echo ""
echo "  Gateway:       http://localhost:4000/graphql"
echo "  Auth:          http://localhost:4001/graphql"
echo "  Vehicles:      http://localhost:4002/graphql"
echo "  Traffic:       http://localhost:4003/graphql"
echo "  Incidents:     http://localhost:4004/graphql"
echo "  Notifications: http://localhost:4005/graphql"
echo ""
echo "  Admin login:   admin@smarttraffic.com / admin1234"
echo ""

if [[ "$SKIP_START" == false ]]; then
  info "Starting all services (Ctrl+C to stop)..."
  npm run dev:all
else
  log "Run 'npm run dev:all' to start all services"
fi
