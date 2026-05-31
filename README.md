# Smart Urban Traffic Management Platform

A distributed web-service platform for intelligent urban traffic management, built as a university project (Mini Projet – Web Services & GraphQL). The system is composed of five independent NestJS microservices, each with its own PostgreSQL schema, exposed through a unified GraphQL API Gateway.

## Architecture

```
                         ┌─────────────┐
                         │   Gateway    │
                         │  (GraphQL)   │
                         └──────┬──────┘
              ┌─────────────────┼─────────────────┐
              │        │        │        │        │
         ┌────┴───┐ ┌──┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴───────┐
         │  Auth  │ │Vehicles│ │Traffic│ │Incident│ │Notification│
         └───┬────┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘
             │          │         │         │            │
         ┌───┴──┐  ┌───┴──┐ ┌───┴──┐ ┌───┴──┐   ┌──────┴──────┐
         │Post- │  │Post- │ │Post- │ │Post- │   │   Post-     │
         │greSQL│  │greSQL│ │greSQL│ │greSQL│   │   greSQL    │
         └──────┘  └──────┘ └──────┘ └──────┘   └─────────────┘
```

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
