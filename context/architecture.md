# Architecture

## Stack

| Layer | Technology | Role |
|---|---|---|
| API Gateway | NestJS + GraphQL (Apollo Federation) | Single entry point; routes queries/mutations to the correct service, aggregates responses, enforces auth |
| Auth Service | NestJS | User registration, login, JWT issuance, role guards |
| Vehicle Service | NestJS | CRUD for vehicles; GPS position ingestion and movement history |
| Traffic Service | NestJS | Zone management; density computation; congestion classification |
| Incident Service | NestJS | Incident lifecycle — create, list, filter, status transitions |
| Notification Service | NestJS | Send notifications; list and mark-as-read |
| Database | PostgreSQL | Relational storage for all persistent domain data |
| Auth mechanism | JWT (signed with RS256 or HS256) | Stateless bearer token carried in GraphQL `Authorization` header |
| Runtime | Node.js (LTS) | JavaScript runtime for all services |
| Package manager | npm or yarn | Dependency management across all services |

## System Boundaries

```
smart-urban-traffic-management/
├── gateway/                  # GraphQL API Gateway (Apollo Federation)
│   ├── src/
│   │   ├── auth/            # Auth guards, JWT validation middleware
│   │   └── federation/      # Service composition & schema stitching
│   └── test/
│
├── services/
│   ├── auth/                # Authentication service
│   │   ├── src/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.resolver.ts     # GraphQL resolvers
│   │   │   ├── auth.service.ts      # Business logic
│   │   │   ├── jwt.strategy.ts      # JWT sign/verify logic
│   │   │   ├── roles.guard.ts       # Role-based guard
│   │   │   └── dto/                 # Input validation DTOs
│   │   └── prisma/                  # Prisma schema & migrations
│   │
│   ├── vehicles/            # Vehicle management service
│   │   ├── src/
│   │   │   ├── vehicle.resolver.ts
│   │   │   ├── vehicle.service.ts
│   │   │   ├── gps-position.resolver.ts
│   │   │   └── dto/
│   │   └── prisma/
│   │
│   ├── traffic/             # Traffic management service
│   │   ├── src/
│   │   │   ├── zone.resolver.ts
│   │   │   ├── zone.service.ts
│   │   │   ├── density.resolver.ts
│   │   │   └── density.service.ts   # Congestion classification logic
│   │   └── prisma/
│   │
│   ├── incidents/           # Incident management service
│   │   ├── src/
│   │   │   ├── incident.resolver.ts
│   │   │   ├── incident.service.ts
│   │   │   └── dto/
│   │   └── prisma/
│   │
│   └── notifications/       # Notification service
│       ├── src/
│       │   ├── notification.resolver.ts
│       │   ├── notification.service.ts
│       │   └── dto/
│       └── prisma/
│
├── db/                      # Shared database tooling
│   ├── migrations/          # Global migrations (if not per-service)
│   └── seeds/               # Seed data for development
│
├── docs/                    # UML diagrams, Postman collection, GraphQL queries
├── context/                 # Project context files (AGENTS.md, architecture, etc.)
├── .gitignore
├── README.md
└── package.json              # Root workspace config (if using monorepo)
```

## Storage Model

| Store | What lives here | Details |
|---|---|---|
| PostgreSQL | All persistent data | Users, vehicles, GPS positions, traffic zones, density snapshots, incidents, notifications |
| In-memory (Map/Cache) | Token blacklist / revoked JWTs | Short-lived; survives until token natural expiry |
| In-memory (service level) | Current density counters | Volatile — recomputed on demand or periodically from DB |

### Database Schema Boundaries (per service)

- **Auth** — `users` (id, email, password_hash, role, created_at, updated_at)
- **Vehicles** — `vehicles` (id, license_plate, type, zone_id, owner_id, created_at); `gps_positions` (id, vehicle_id, latitude, longitude, recorded_at)
- **Traffic** — `zones` (id, name, boundary_data, created_at); `density_snapshots` (id, zone_id, vehicle_count, classification, computed_at)
- **Incidents** — `incidents` (id, type, status, description, latitude, longitude, zone_id, reported_by, created_at, updated_at)
- **Notifications** — `notifications` (id, user_id, title, message, is_read, trigger_type, trigger_id, created_at)

Services **must not** read from another service's tables directly. All cross-service queries go through the GraphQL gateway.

## Auth and Access Model

1. **Registration** — A user signs up with email and password. The password is hashed with bcrypt. A default role of `OPERATOR` is assigned unless specified as `ADMIN` during seeding.

2. **Login** — The auth service verifies credentials and returns a signed JWT containing `sub` (user id), `role` (ADMIN or OPERATOR), and `iat`/`exp`.

3. **Request authentication** — Every GraphQL request passes through an auth guard in the gateway that extracts the JWT from the `Authorization: Bearer <token>` header, verifies the signature, and attaches the decoded payload to the request context.

4. **Role-based access** — Mutations and queries are decorated with role guards:
   - `@Roles('ADMIN')` — only administrators may execute.
   - `@Roles('ADMIN', 'OPERATOR')` — any authenticated user may execute.
   - Unauthenticated requests are rejected with a `UNAUTHENTICATED` error.

5. **Ownership** — Vehicles belong to the user who created them (`owner_id`). Incidents are attributed to the user who reported them (`reported_by`). Notifications are scoped to the recipient user (`user_id`). Only ADMIN users may read or mutate resources owned by another user.

6. **Service-to-service auth** — Internal service calls (if any, e.g., Auth service validating a token for another service) use an internal shared secret or forward the original JWT for decentralized verification.

## AI / Background Task Models

This project does not use AI models. Background tasks are limited to:

- **Density computation** — A scheduled task (e.g., via `@nestjs/schedule` or `node-cron`) runs every N minutes, queries recent GPS positions per zone, classifies density, and stores a `density_snapshot`. This can run inside the Traffic service process.
- **Notification dispatch** — When an incident is created or its status changes, the Incident service emits an event (or calls the Notification service via HTTP/gRPC) to trigger notification creation. This happens synchronously or via an in-process event bus.

## Invariants

1. **Services must not access another service's database directly.** All cross-domain data access must go through the GraphQL gateway, which resolves the appropriate service. No `JOIN` or raw query across service schemas.

2. **Every GPS position record must include a non-null `recorded_at` timestamp.** Positions without timestamps are rejected at the validation layer. This guarantees that movement history queries produce ordered, meaningful results.

3. **Incident status transitions must follow the strict order: Reported → In Progress → Resolved.** No other transition (e.g., Reported → Resolved, or Resolved → In Progress) is allowed. The service must reject invalid transitions with a domain error.

4. **A notification must always reference an existing user and an existing trigger (incident or zone alert).** Orphaned notifications (no valid `user_id`, no valid `trigger_id`) must never be created. Foreign key constraints and application-level validation enforce this.

5. **JWT tokens must always be validated for signature and expiry on every protected request.** No protected resolver may skip the auth guard. An expired or tampered token must always result in an `UNAUTHENTICATED` error regardless of the user's role.

6. **Password hashes must never be logged, returned in API responses, or stored outside the `users` table.** The `password_hash` column must be excluded from all GraphQL type definitions and resolver selections.
