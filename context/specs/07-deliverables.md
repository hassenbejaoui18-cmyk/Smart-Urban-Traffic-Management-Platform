# Spec — Unit 7: Deliverables

## Goal

Polish the project for a smooth demo: embed UML diagrams in the root README so they render in any Markdown reader, provide a one-command setup script, and add a getting-started guide with demo steps.

## Deliverables

### 1. UML diagrams in root README

Embed both the class diagram and the sequence diagram directly in `README.md` using Mermaid fenced blocks so they render natively in GitHub, VS Code, and other Markdown readers. No separate `.puml` files.

- **Class diagram** — entities and relationships across all 5 services (User, Vehicle, GpsPosition, Zone, DensitySnapshot, Incident, Notification).
- **Sequence diagram** — core end-to-end flow: register/login, create vehicle, record GPS, compute density, report incident, update incident status.

### 2. Setup script (`setup.sh`)

A single shell script at the project root that automates the full setup:

- Detect the PostgreSQL user (default: `whoami`, override with `--db-user <user>`).
- Create all 5 databases (`smart_traffic_auth`, `smart_traffic_vehicle`, `smart_traffic_traffic`, `smart_traffic_incident`, `smart_traffic_notification`).
- Generate `.env` files for each service and the gateway with the correct database URLs and a shared random `AUTH_JWT_SECRET`.
- Run `npm install` to install all dependencies.
- Run `prisma generate` for all 5 services.
- Run `prisma db push` to sync schemas.
- Seed the admin user (`admin@smarttraffic.com` / `admin1234`).
- Build all 6 apps.
- Optionally start all services with `npm run dev:all` (supports `--skip-start` to skip this step).

### 3. Getting-started guide (`GETTING_STARTED.md`)

A markdown file at the project root that walks the user through the demo:

- Prerequisites (Node.js 18+, PostgreSQL, npm).
- One-command setup and start.
- Automated seed data credentials.
- Step-by-step demo walkthrough via Apollo Sandbox or curl:
  - Login as admin → save JWT.
  - Query `me` to verify authentication.
  - Query vehicles, traffic zones, incidents, notifications.
- Notes on graph traversal through the gateway.

## Verification Checklist

1. `setup.sh` runs end-to-end without errors on a machine with PostgreSQL running.
2. After setup, `npm run dev:all` starts all 6 services and the gateway.
3. Login + `me` query work through the gateway at `http://localhost:4000/graphql`.
4. README Mermaid diagrams render correctly in a Markdown viewer.
5. `GETTING_STARTED.md` contains clear, accurate demo steps.
