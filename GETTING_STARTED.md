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

### 3. Explore vehicles

```graphql
query Vehicles {
  vehicles { id licensePlate type zoneId ownerId }
}
```

### 4. Explore traffic zones

```graphql
query Zones {
  zones { id name }
}
```

### 5. Explore incidents

```graphql
query Incidents {
  incidents { id type status description createdAt }
}
```

### 6. Explore notifications

```graphql
query Notifications {
  notifications { id title message isRead createdAt }
}
```

## Graph Traversal

Because all services are composed through the Apollo Gateway, you can query related data across services in a single request. For example, an incident references a `zoneId` that belongs to the Traffic service — the gateway resolves this automatically.

## Troubleshooting

| Symptom | Likely Fix |
|---|---|
| `ECONNREFUSED` on a service port | Wait a few seconds for all services to start, then retry |
| `Cannot read properties of undefined` on login | Ensure PostgreSQL is running and `psql` works with `./setup.sh --db-user <your-user>` |
| `JWT verification failed` | Re-run `./setup.sh` to regenerate env files with a matching secret |
| Port conflict | Kill existing processes: `lsof -ti:4000-4005 \| xargs kill -9` |
