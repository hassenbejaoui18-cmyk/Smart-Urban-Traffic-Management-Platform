# Vehicles Service

Vehicle management service — CRUD operations for vehicles, GPS position recording, and movement history queries.

## Architecture Overview

### Service Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                         GraphQL Gateway                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Routes: vehicles, vehicle, createVehicle, updateVehicle,    │   │
│  │  deleteVehicle, recordGpsPosition, gpsPositions, movementHistory│ │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Vehicles Service (:4002)                        │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────────┐  │
│  │  Resolvers   │──▶ VehicleService │──▶ Prisma Client            │  │
│  │  - Vehicle   │  │  (business     │  │  → PostgreSQL            │  │
│  │  - GpsPosit. │  │   logic)       │  │  (vehicles, gps_positions│  │
│  └──────────────┘  └────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

The Vehicles service manages the vehicle registry and GPS tracking data. It works closely with the Traffic service (vehicles are assigned to zones) and the Incident service (incidents reference vehicles). All cross-service references are resolved through the GraphQL gateway.

### Components

1. **VehicleResolver** — Handles GraphQL queries/mutations for vehicle CRUD (`vehicles`, `vehicle`, `createVehicle`, `updateVehicle`, `deleteVehicle`).
2. **GpsPositionResolver** — Handles GPS position recording and movement history queries (`recordGpsPosition`, `gpsPositions`, `movementHistory`).
3. **VehicleService** — Contains all vehicle business logic: creation with zone validation, update with duplicate checking, deletion with referential integrity checks.
4. **Prisma Client** — Type-safe database access to `vehicles` and `gps_positions` tables.

## Data Flow

### Vehicle Creation Flow

```
Client ──createVehicle(input)──▶ Gateway ──▶ VehicleResolver
                                                │
                                                ▼
                                          VehicleService.create()
                                                │
                                ┌───────────────┴───────────────┐
                                │ 1. Validate input             │
                                │    (class-validator DTOs)     │
                                │ 2. Check license plate        │
                                │    uniqueness                 │
                                │ 3. Verify zone_id exists      │
                                │    (via Traffic service ref)  │
                                │ 4. Create vehicle record      │
                                │    in PostgreSQL              │
                                └───────────────┬───────────────┘
                                                │
Client ◀── { vehicle } ── Gateway ◀── VehicleResolver ◀─────────┘
```

### GPS Position Recording Flow

```
Client ──recordGpsPosition(input)──▶ Gateway ──▶ GpsPositionResolver
                                                     │
                                                     ▼
                                              VehicleService
                                              .recordGpsPosition()
                                                     │
                                   ┌─────────────────┴─────────────────┐
                                   │ 1. Validate input                 │
                                   │ 2. Verify vehicle exists          │
                                   │ 3. Create gps_position record     │
                                   │    with recorded_at timestamp     │
                                   └─────────────────┬─────────────────┘
                                                     │
Client ◀── { gpsPosition } ── Gateway ◀──────────────┘
```

### Movement History Query Flow

```
Client ──movementHistory(vehicleId, from, to)──▶ Gateway
                                                     │
                                                     ▼
                                           GpsPositionResolver
                                                │
                                                ▼
                                        VehicleService
                                        .getMovementHistory()
                                                │
                                  ┌──────────────┴──────────────┐
                                  │ 1. Validate vehicle exists  │
                                  │ 2. Query gps_positions      │
                                  │    filtered by vehicle_id   │
                                  │    and date range           │
                                  │ 3. Order by recorded_at ASC │
                                  └──────────────┬──────────────┘
                                                 │
Client ◀── [GpsPosition] ── Gateway ◀────────────┘
```

## Environment Variables

Create a `.env` file from the template:

```bash
cp ../../.env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VEHICLES_DATABASE_URL` | — | PostgreSQL connection string |
| `VEHICLES_JWT_SECRET` | — | Must match Auth service's `AUTH_JWT_SECRET` for token verification |
| `VEHICLES_PORT` | `4002` | Service port |

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

## Run

```bash
# Development (with hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot-reload |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint and fix |
| `npm run prisma:migrate` | Run Prisma migrations |

## GraphQL Operations

### `createVehicle` mutation (requires auth)

```graphql
mutation CreateVehicle($input: CreateVehicleInput!) {
  createVehicle(createVehicleInput: $input) {
    id
    licensePlate
    type
    zoneId
    ownerId
    createdAt
  }
}
```

### `vehicles` query (requires auth)

```graphql
query Vehicles {
  vehicles {
    id
    licensePlate
    type
    zoneId
    ownerId
  }
}
```

### `recordGpsPosition` mutation (requires auth)

```graphql
mutation RecordGpsPosition($input: CreateGpsPositionInput!) {
  recordGpsPosition(createGpsPositionInput: $input) {
    id
    vehicleId
    latitude
    longitude
    recordedAt
  }
}
```

### `movementHistory` query (requires auth)

```graphql
query MovementHistory($vehicleId: String!, $from: DateTime, $to: DateTime) {
  movementHistory(vehicleId: $vehicleId, from: $from, to: $to) {
    id
    latitude
    longitude
    recordedAt
  }
}
```

## Database

### `vehicles` table

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| license_plate | String (unique) | Vehicle identifier |
| type | VehicleType (enum) | CAR, TRUCK, MOTORCYCLE, BUS |
| zone_id | String | References Traffic service zone |
| owner_id | String | References Auth service user |
| created_at | DateTime | Auto-set |
| updated_at | DateTime | Auto-updated |

### `gps_positions` table

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| vehicle_id | String (FK) | References vehicles.id |
| latitude | Float | GPS coordinate |
| longitude | Float | GPS coordinate |
| recorded_at | DateTime | Position timestamp (must be non-null) |
