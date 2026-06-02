# Getting Started

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ (running locally)
- **npm**

## One-Command Setup

```bash
# Full setup: databases, env files, dependencies, schema sync,
# seed data, build, and start all services:
./setup.sh
```

The script will:
1. Detect your PostgreSQL user (or use `--db-user <user>`).
2. Create all 5 databases (`smart_traffic_auth`, `smart_traffic_vehicle`, `smart_traffic_traffic`, `smart_traffic_incident`, `smart_traffic_notification`).
3. Generate `.env` files with database URLs and a random JWT secret.
4. Install npm dependencies.
5. Generate Prisma clients for all services.
6. Sync database schemas.
7. Seed the admin user.
8. Build all services.
9. Start everything with `npm run dev:all`.

### Flags

| Flag | Description |
|---|---|
| `--skip-start` | Set up without starting services |
| `--db-user <user>` | PostgreSQL username (default: current system user) |

### Manual Start

```bash
# If you used --skip-start:
npm run dev:all
```

## Services

| Service | Port | GraphQL Endpoint |
|---|---|---|
| Gateway | 4000 | http://localhost:4000/graphql |
| Auth | 4001 | http://localhost:4001/graphql |
| Vehicles | 4002 | http://localhost:4002/graphql |
| Traffic | 4003 | http://localhost:4003/graphql |
| Incidents | 4004 | http://localhost:4004/graphql |
| Notifications | 4005 | http://localhost:4005/graphql |

## Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@smarttraffic.com | admin1234 |

## Demo Walkthrough

Open the Apollo Sandbox at **http://localhost:4000/graphql** and run these queries in order.

### 1. Login as admin

```graphql
mutation Login {
  login(input: { email: "admin@smarttraffic.com", password: "admin1234" }) {
    token
    user { id email role }
  }
}
```

Copy the `token` value from the response. In Apollo Sandbox, set an HTTP header:

```
Authorization: Bearer <paste-token-here>
```

### 2. Verify authentication

```graphql
query Me {
  me { id email role createdAt }
}
```

You should see your admin user details.

### 3. Create a traffic zone

```graphql
mutation CreateZone {
  createZone(input: { name: "Downtown" }) {
    id name createdAt
  }
}
```

Save the returned `id` — you'll use it when creating a vehicle and incident.

### 4. List zones

```graphql
query Zones {
  zones { id name }
}
```

### 5. Create a vehicle

```graphql
mutation CreateVehicle {
  createVehicle(input: { licensePlate: "ABC-1234", type: CAR }) {
    id licensePlate type ownerId
  }
}
```

Save the returned `id` for the next step.

### 6. Record a GPS position

```graphql
mutation RecordGpsPosition {
  recordGpsPosition(
    vehicleId: "<paste-vehicle-id>",
    input: { latitude: 48.8566, longitude: 2.3522, recordedAt: "2026-06-02T12:00:00Z" }
  ) {
    id latitude longitude recordedAt
  }
}
```

### 7. View vehicles and movement history

```graphql
query Vehicles {
  vehicles { id licensePlate type zoneId ownerId }
}

query MovementHistory {
  movementHistory(vehicleId: "<paste-vehicle-id>") {
    items { id latitude longitude recordedAt }
    total
  }
}
```

### 8. Compute traffic density

```graphql
mutation ComputeDensity {
  computeDensity { id zoneId vehicleCount classification }
}
```

### 9. Report an incident

```graphql
mutation CreateIncident {
  createIncident(input: {
    type: ACCIDENT,
    description: "Multi-vehicle collision on Main St",
    latitude: 48.8570,
    longitude: 2.3525
  }) {
    id type status description latitude longitude createdAt
  }
}
```

Save the returned `id` for the next step.

### 10. Update incident status

```graphql
mutation UpdateIncidentStatus {
  updateIncidentStatus(
    id: "<paste-incident-id>",
    input: { status: IN_PROGRESS }
  ) {
    id status
  }
}
```

Try other statuses: `RESOLVED` is the final state.

### 11. View incidents

```graphql
query Incidents {
  incidents { id type status description createdAt }
}
```

### 12. View notifications

When an incident is created, the Incidents service automatically notifies the Notifications service.

```graphql
query Notifications {
  notifications { id title message isRead triggerType triggerId createdAt }
}
```

### 13. Mark a notification as read

```graphql
mutation MarkNotificationAsRead {
  markNotificationAsRead(id: "<paste-notification-id>") {
    id isRead
  }
}
```

## Graph Traversal

Because all services are composed through the Apollo Gateway, you can query related data across services in a single request. For example, an incident references a `zoneId` that belongs to the Traffic service — the gateway resolves this automatically.

When you create an incident (step 9), the Incidents service calls the Notifications service internally to generate a notification, which you can then read in step 12 — all through the gateway.

## Troubleshooting

| Symptom | Likely Fix |
|---|---|
| `ECONNREFUSED` on a service port | Wait a few seconds for all services to start, then retry |
| `Cannot read properties of undefined` on login | Ensure PostgreSQL is running and `psql` works with `./setup.sh --db-user <your-user>` |
| `JWT verification failed` | Re-run `./setup.sh` to regenerate env files with a matching secret |
| Port conflict | Kill existing processes: `lsof -ti:4000-4005 \| xargs kill -9` |
