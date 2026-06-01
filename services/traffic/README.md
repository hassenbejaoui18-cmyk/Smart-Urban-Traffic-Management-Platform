# Traffic Service

Zone management, vehicle density computation, and congestion classification (Low / Medium / High) for the Smart Urban Traffic Management platform.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Incoming GraphQL Request                          │
│              (http://localhost:4003/graphql)                              │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Guards Layer                                                          │
│    ├── JwtAuthGuard — verifies JWT signature & expiry via Passport       │
│    └── RolesGuard — checks @Roles() metadata (ADMIN / OPERATOR)         │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. Resolver Layer                                                        │
│    ├── ZoneResolver — routes zone CRUD to TrafficService                 │
│    └── DensityResolver — routes density queries to TrafficService        │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. Service Layer                                                         │
│    └── TrafficService                                                   │
│        ├── Zone CRUD (create, list, find by id)                         │
│        ├── Density computation (on-demand mutation + scheduled cron)     │
│        └── Congestion classification (LOW / MEDIUM / HIGH)              │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│ 4a. Providers (Prisma)       │  │ 4b. Vehicle Client                   │
│     └── PrismaService —      │  │     └── VehicleClientService —       │
│         type-safe DB access  │  │         HTTP GraphQL call to         │
│         via Prisma ORM       │  │         Vehicles service (:4002)     │
└──────────────┬───────────────┘  └──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. Database Layer (PostgreSQL — smart_traffic_traffic)                   │
│    ├── zones table (id, name, boundary, created_at, updated_at)         │
│    └── density_snapshots (id, zone_id, vehicle_count, classification,   │
│                           computed_at)                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Descriptions

1. **Guards Layer** — `JwtAuthGuard` validates the bearer JWT via Passport JWT strategy (reads `TRAFFIC_JWT_SECRET`). `RolesGuard` enforces `@Roles(ADMIN)` on zone creation and `@Roles(ADMIN, OPERATOR)` on queries.

2. **Resolver Layer** — Thin GraphQL handlers. `ZoneResolver` handles zone CRUD; `DensityResolver` handles density computation and queries. Neither contains business logic.

3. **Service Layer** — `TrafficService` implements all domain logic: zone CRUD, density computation (with classification thresholds), and a `@Cron(EVERY_5_MINUTES)` scheduled task.

4. **Providers** — `PrismaService` provides type-safe database access. `VehicleClientService` makes HTTP GraphQL requests to the Vehicles service to count vehicles per zone when computing density.

5. **Database Layer** — Dedicated PostgreSQL database (`smart_traffic_traffic`) with two tables: `zones` and `density_snapshots`. Never accessed by other services.

## Data Flow

### Zone Creation

```
Client ──createZone(input)──▶ JwtAuthGuard ──▶ RolesGuard(ADMIN) ──▶
ZoneResolver ──▶ TrafficService.createZone() ──▶ PrismaService ──▶ PostgreSQL
```

1. **Entry** — `createZone` mutation with `CreateZoneInput` (name, optional boundary). JWT must carry ADMIN role.
2. **Guard** — `JwtAuthGuard` verifies the token; `RolesGuard` checks ADMIN role.
3. **Processing** — `ZoneResolver` delegates to `TrafficService.createZone()` which validates input via `class-validator` and inserts a row.
4. **Storage** — A new row is inserted into the `zones` table.
5. **Output** — The created `Zone` object is returned to the client.

### On-Demand Density Computation

```
Client ──computeDensity(input)──▶ JwtAuthGuard ──▶ RolesGuard ──▶
DensityResolver ──▶ TrafficService.computeDensity()
    │
    ├── [if vehicleCount provided] ──▶ classify() ──▶ create DensitySnapshot
    │
    └── [if no vehicleCount] ──▶ VehicleClientService
                                └── HTTP POST :4002/graphql (vehicles query)
                                    └── count vehicles per zone
                                        └── classify() ──▶ create DensitySnapshot
```

1. **Entry** — `computeDensity` mutation. Optional `ComputeDensityInput` with `zoneId` and/or `vehicleCount`.
2. **Processing** — If `vehicleCount` is provided, it's used directly. Otherwise, `VehicleClientService` queries the Vehicles service for vehicle counts per zone. The count is classified using configurable thresholds (`TRAFFIC_DENSITY_LOW_MAX` and `TRAFFIC_DENSITY_MEDIUM_MAX`).
3. **Storage** — `DensitySnapshot` rows are created in the `density_snapshots` table (immutable — never modified after creation).
4. **Output** — The created snapshot(s) are returned.

### Scheduled Density Computation

```
@Cron(EVERY_5_MINUTES) ──▶ TrafficService.handleScheduledDensityComputation()
                               └── computeDensity({})  // all zones, no explicit counts
                                   └── VehicleClientService
                                       └── HTTP POST :4002/graphql
                                           └── createMany DensitySnapshots
```

1. **Entry** — `@nestjs/schedule` triggers `handleScheduledDensityComputation` every 5 minutes.
2. **Processing** — Computes density for all zones by querying the Vehicles service.
3. **Storage** — Batch-inserts `DensitySnapshot` records.
4. **Output** — Logs completion; no client response (scheduled background task).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TRAFFIC_DATABASE_URL` | — | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/smart_traffic_traffic`) |
| `TRAFFIC_JWT_SECRET` | — | JWT secret (must match `AUTH_JWT_SECRET` so Auth-issued tokens are accepted) |
| `TRAFFIC_JWT_EXPIRATION` | `24h` | JWT token expiration duration |
| `TRAFFIC_PORT` | `4003` | Port the service listens on |
| `TRAFFIC_DENSITY_LOW_MAX` | `5` | Max vehicle count for LOW classification (above this → MEDIUM) |
| `TRAFFIC_DENSITY_MEDIUM_MAX` | `20` | Max vehicle count for MEDIUM classification (above this → HIGH) |
| `VEHICLE_SERVICE_URL` | `http://localhost:4002/graphql` | Vehicles service GraphQL endpoint for density queries |

## Prisma Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create a migration after schema changes
npm run prisma:migrate

# (No seed — zones are created through the API)
```

## Running Locally

```bash
# From repo root:
npm run dev:traffic

# Or from this directory:
npm run start:dev
```

The service starts on `http://localhost:4003/graphql`. Open the Apollo Sandbox to run queries and mutations.

## GraphQL API

### `createZone` (mutation)
Creates a new traffic zone. ADMIN only.

```graphql
mutation CreateZone($input: CreateZoneInput!) {
  createZone(input: $input) { id name boundary }
}
```

### `zones` (query)
Lists all zones.

```graphql
query Zones { zones { id name boundary } }
```

### `zone` (query)
Finds a single zone by ID.

```graphql
query Zone($id: String!) { zone(id: $id) { id name createdAt } }
```

### `computeDensity` (mutation)
Triggers density computation. Optionally specify `zoneId` for a single zone and `vehicleCount` to bypass the Vehicles service call.

```graphql
mutation ComputeDensity($input: ComputeDensityInput) {
  computeDensity(input: $input) { zoneId vehicleCount classification computedAt }
}
```

### `densitySnapshots` (query)
Returns density snapshot history (optionally filtered by zone).

### `currentDensity` (query)
Returns the latest density classification per zone.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| API | GraphQL (code-first, Apollo) |
| ORM | Prisma v6 |
| Database | PostgreSQL |
| Auth | JWT (HS256, via Passport) |
| Scheduling | `@nestjs/schedule` (`@Cron`) |
