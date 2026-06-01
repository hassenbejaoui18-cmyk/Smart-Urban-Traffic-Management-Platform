# Smart Urban Traffic Management Platform

A distributed web-service platform for intelligent urban traffic management, built as a university project (Mini Projet – Web Services & GraphQL). The system is composed of five independent NestJS microservices, each with its own PostgreSQL schema, exposed through a unified GraphQL API Gateway.

## Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
├──────────────────────────────────────────────────────────────────────┤
│               Apollo Sandbox / HTTP Client (GraphQL)                 │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      GraphQL API Gateway (Port 4000)                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  • Auth guards (JWT validation, role checks)                   │  │
│  │  • Schema composition from all services                        │  │
│  │  • Request routing to the appropriate downstream service       │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────┬─────────────────────────┘
                           │                  │
          ┌────────────────┼──────┬───────────┼──────┬────────────────┐
          │                │      │           │      │                │
          ▼                ▼      ▼           ▼      ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Auth    │    │ Vehicles │    │ Traffic  │    │Incidents │    │Notificat.│
   │ :4001    │    │ :4002    │    │ :4003    │    │ :4004    │    │ :4005    │
   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
        │               │               │               │               │
        ▼               ▼               ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │PostgreSQL│    │PostgreSQL│    │PostgreSQL│    │PostgreSQL│    │PostgreSQL│
   │ (users)  │    │(vehicles,│    │ (zones,  │    │(incidents│    │(notifica.│
   │          │    │ gps_pos.)│    │ density) │    │   )      │    │   )      │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Component Descriptions

1. **Client Layer** — Any HTTP client (Apollo Sandbox, Postman, curl) sends GraphQL queries/mutations to the gateway. Requests carry a JWT in the `Authorization` header for authenticated operations.

2. **GraphQL API Gateway** — The single entry point. It composes the GraphQL schemas from all five services, validates JWT tokens, enforces role-based access, and routes each query/mutation to the appropriate downstream service. The gateway never stores data — it only orchestrates.

3. **Microservices** — Five independent NestJS applications, each owning a single domain:
   - **Auth** — User registration, login, JWT issuance, role guards.
   - **Vehicles** — Vehicle CRUD, GPS position ingestion, movement history queries.
   - **Traffic** — Zone definitions, real-time vehicle density computation, congestion classification (Low / Medium / High).
   - **Incidents** — Incident lifecycle: creation, filtering, mandatory status transitions (Reported → In Progress → Resolved).
   - **Notifications** — Push-style notification creation, listing, and mark-as-read.

4. **PostgreSQL Databases** — Each service has its own dedicated database/schema. Services never access another service's database directly — all cross-service data access is routed through the gateway.

## Data Flow

### End-to-End Request Flow

```
┌────────┐   ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
│ Client │──▶│ Gateway │──▶│ Resolver │──▶│ Service  │──▶│ Prisma/DB │
│(GraphQL)│  │:4000    │   │(thin)    │   │(business │   │(PostgreSQL)│
└────────┘   └─────────┘   └──────────┘   │  logic)  │   └───────────┘
                                           └──────────┘
```

1. **Request arrives** — A GraphQL query/mutation hits the gateway (`http://localhost:4000/graphql`).

2. **Authentication** — The gateway's global `JwtAuthGuard` extracts the `Authorization: Bearer <token>` header, verifies the JWT signature and expiry, and attaches the decoded user payload (`sub`, `role`) to the request context. Unauthenticated requests are rejected immediately.

3. **Authorization** — For guarded operations, `@Roles('ADMIN', 'OPERATOR')` decorators check the user's role against the required roles. Insufficient permissions return a `FORBIDDEN` error.

4. **Routing** — The gateway resolves the requested query/mutation to the appropriate downstream service via Apollo Federation or direct HTTP forwarding.

5. **Resolver** — The target service's resolver parses arguments, extracts the current user from context, and delegates to the service layer. Resolvers contain no business logic.

6. **Service** — The service layer executes all domain logic: validation, transformations, authorization checks, and database interactions via Prisma.

7. **Database** — Prisma translates service calls into SQL queries against the service's dedicated PostgreSQL database.

8. **Response** — Results flow back up the chain: Prisma → Service → Resolver → Gateway → Client. Errors are caught by a global exception filter and returned in a consistent GraphQL error shape.

### Cross-Service Communication

For operations that span multiple services (e.g., triggering a notification when an incident is created), the flow is:

```
Incident Service  ──(HTTP/event)──▶  Notification Service  ──▶  PostgreSQL
       │                                                              │
       └─────────── (returns notification ID) ────────────────────────┘
```

The Incident service emits an event (via `@nestjs/event-emitter` or direct HTTP call) that the Notification service consumes to create a notification record. The gateway can then resolve both incident and notification data in a single federated query.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | NestJS |
| API | GraphQL (code-first, Apollo) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (HS256) + bcrypt |
| Monorepo | npm workspaces |

## Services

| Service | Port | Description |
|---|---|---|
| Auth | 4001 | Registration, login, JWT issuance, role guards |
| Vehicles | 4002 | Vehicle CRUD, GPS position recording, movement history |
| Traffic | 4003 | Zone management, density computation, congestion classification |
| Incidents | 4004 | Incident lifecycle — report, filter, status transitions |
| Notifications | 4005 | Send, list, mark-as-read notifications |
| Gateway | 4000 | Single GraphQL endpoint composing all services |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd smart-urban-traffic-management
npm install
```

### 2. Configure environment variables

Copy the example env file for each service (or configure as needed):

```bash
cp .env.example services/auth/.env
```

Edit each `.env` with your PostgreSQL connection strings and secrets.

### 3. Set up databases

Create a PostgreSQL database per service (or use separate schemas), then run migrations:

```bash
# Auth service
cd services/auth
npx prisma migrate dev
npx prisma db seed
cd ../..
```

The seed script creates an admin user:
- Email: `admin@smarttraffic.com`
- Password: `admin1234`

### 4. Start a service

```bash
# Auth service (development with hot-reload)
npm run dev:auth

# Or from any service directory:
cd services/auth
npm run start:dev
```

### 5. Access GraphQL playground

Open the Apollo Studio Sandbox at `http://localhost:<service-port>/graphql`.

## Project Structure

```
├── gateway/               # GraphQL API Gateway (Unit 6)
├── services/
│   ├── auth/              # Auth service (Unit 1 — done)
│   ├── vehicles/          # Vehicle service (Unit 2)
│   ├── traffic/           # Traffic service (Unit 3)
│   ├── incidents/         # Incident service (Unit 4)
│   └── notifications/     # Notification service (Unit 5)
├── context/               # Project context & specs for AI-assisted development
├── docs/                  # Deliverables (UML, Postman, queries)
├── package.json           # npm workspaces root
└── tsconfig.base.json     # Shared TypeScript config
```

## Build Units

The project is built incrementally across 7 units:

| Unit | What | Status |
|---|---|---|
| 1 | Monorepo scaffold + Auth service | ✅ Done |
| 2 | Vehicle service | ⏳ Pending |
| 3 | Traffic service | ⏳ Pending |
| 4 | Incident service | ⏳ Pending |
| 5 | Notification service | ⏳ Pending |
| 6 | GraphQL Gateway + cross-service wiring | ⏳ Pending |
| 7 | Deliverables (READMEs, UML, Postman, queries) | ⏳ Pending |

See `context/specs/00-build-plan.md` for details.

## License

MIT
