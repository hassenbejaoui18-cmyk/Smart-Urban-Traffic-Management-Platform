# Build Plan — Smart Urban Traffic Management Platform

## Unit 1 — Monorepo Scaffold + Auth Service

**What it builds:**
- Root `package.json` with npm workspaces pointing to `services/*` and `gateway/`
- Shared `tsconfig.base.json` with strict mode enabled
- `services/auth/` — NestJS app with Prisma, code-first GraphQL, `@nestjs/config`
- `users` table (id, email, password_hash, role, created_at, updated_at)
- `register` mutation (email, password → hashes password, creates user with OPERATOR role, returns JWT)
- `login` mutation (email, password → verifies credentials, returns JWT with `sub` + `role` claims)
- `me` query (returns current user from JWT)
- JWT strategy and `@UseGuards(JwtAuthGuard)` / `@Roles()` decorators
- `class-validator` DTOs, global `ValidationPipe`, global exception filter

**Visible result:** You can hit the Auth service's GraphQL playground, register a user, log in, receive a JWT, and query your own profile.

**Dependencies:** None

---

## Unit 2 — Vehicle Service

**What it builds:**
- `services/vehicles/` — NestJS app with Prisma, code-first GraphQL
- `vehicles` table (id, license_plate, type, zone_id, owner_id, created_at, updated_at)
- `gps_positions` table (id, vehicle_id, latitude, longitude, recorded_at)
- `createVehicle` mutation (authenticated — sets `owner_id` from JWT)
- `vehicles` query (list all, filterable by zone/type)
- `vehicle(id)` query (single vehicle with detail)
- `recordGpsPosition` mutation (authenticated — records lat/lng with timestamp)
- `movementHistory(vehicleId)` query (ordered positions with pagination)
- All resolvers guarded by `JwtAuthGuard` + `RolesGuard`
- Ownership enforcement — OPERATOR sees only own vehicles; ADMIN sees all

**Visible result:** You can create vehicles, list them, record GPS positions, and query movement history — all authenticated via JWT from Unit 1.

**Dependencies:** Unit 1 (JWT guards, role enum, shared auth patterns)

---

## Unit 3 — Traffic Service

**What it builds:**
- `services/traffic/` — NestJS app with Prisma, code-first GraphQL
- `zones` table (id, name, boundary_data, created_at, updated_at)
- `density_snapshots` table (id, zone_id, vehicle_count, classification, computed_at)
- `createZone` mutation (ADMIN only)
- `zones` query (list all)
- `zone(id)` query (single zone with current density)
- `computeDensity` mutation (triggers on-demand — counts vehicles with recent GPS positions in zone, classifies as LOW / MEDIUM / HIGH)
- Scheduled task (`@nestjs/schedule`) runs density computation every N minutes
- Zone classification logic: LOW (0–5 vehicles), MEDIUM (6–20), HIGH (21+)

**Visible result:** You can create zones, trigger density computation, see congestion classifications. Scheduled task auto-computes on a timer.

**Dependencies:** Unit 1 (JWT guards)

---

## Unit 4 — Incident Service

**What it builds:**
- `services/incidents/` — NestJS app with Prisma, code-first GraphQL
- `incidents` table (id, type, status, description, latitude, longitude, zone_id, reported_by, created_at, updated_at)
- `reportIncident` mutation (authenticated — type: ACCIDENT / CONSTRUCTION / ROAD_CLOSED / TRAFFIC_JAM, status: REPORTED)
- `incidents` query (filterable by status, type, zone)
- `incident(id)` query (single incident detail)
- `updateIncidentStatus` mutation (strict order: REPORTED → IN_PROGRESS → RESOLVED; rejects invalid transitions with domain error)
- Status enum and type enum in Prisma schema
- All resolvers guarded by `JwtAuthGuard` + `RolesGuard`

**Visible result:** You can report incidents, list and filter them, and transition status through the allowed workflow. Invalid transitions are rejected.

**Dependencies:** Unit 1 (JWT guards)

---

## Unit 5 — Notification Service

**What it builds:**
- `services/notifications/` — NestJS app with Prisma, code-first GraphQL
- `notifications` table (id, user_id, title, message, is_read, trigger_type, trigger_id, created_at)
- `sendNotification` mutation (ADMIN only — creates a notification for a specific user)
- `notifications` query (authenticated — returns only current user's notifications)
- `markNotificationAsRead` mutation (authenticated — marks own notification as read)
- `unreadCount` query (authenticated — count of unread notifications for current user)
- All resolvers guarded by `JwtAuthGuard`

**Visible result:** You can send notifications as ADMIN, list your own notifications, mark them read, and see your unread count.

**Dependencies:** Unit 1 (JWT guards)

---

## Unit 6 — GraphQL Gateway + Cross-Service Wiring

**What it builds:**
- `gateway/` — NestJS app acting as GraphQL API Gateway
- Composes schemas from all five services into a single endpoint
- Shared `JwtAuthGuard` and `RolesGuard` at the gateway level
- Cross-service event wiring:
  - Incident created/status-changed → Notification service auto-sends notification to relevant users
  - Congestion alert (density crosses threshold up to HIGH) → Notification service auto-sends alert
- Error mapping — all downstream service errors map to consistent GraphQL error shapes

**Visible result:** A single GraphQL endpoint serves all five domains. Notifications fire automatically when incidents are created or congestion spikes. You interact with one URL instead of five.

**Dependencies:** Units 2, 3, 4, 5 (all services must exist to compose their schemas)

---

## Unit 7 — Deliverables

**What it builds:**
- Root `README.md` — project overview, architecture diagram, how to start all services, tech stack
- Per-service `README.md` in each service directory — env vars, migration commands, local dev instructions
- UML class diagrams — one per service showing entities and relationships
- UML sequence diagram — core user flow (register → create vehicle → record position → detect congestion → report incident → receive notification)
- Postman collection — pre-configured GraphQL requests for all mutations/queries
- Sample GraphQL queries file — ready-to-run queries with inline comments

**Visible result:** A complete `docs/` folder with everything needed to understand, run, and demo the project.

**Dependencies:** Unit 6 (system must be working to document accurately)
