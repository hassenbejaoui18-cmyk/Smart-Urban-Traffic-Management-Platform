# Auth Service

User authentication service — registration, login, JWT issuance, and role-based access control (ADMIN / OPERATOR).

## Architecture Overview

### Service Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GraphQL Gateway                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Routes: register, login, me                                  │  │
│  │  Decorates requests with JwtAuthGuard / RolesGuard            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Auth Service (:4001)                        │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────────────┐  │
│  │ Resolver │──▶ Auth Service  │──▶ Prisma Client → PostgreSQL  │  │
│  │ (thin)   │  │ (business     │  │ (users table)               │  │
│  │          │  │  logic)       │  │                             │  │
│  └──────────┘  └───────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

The Auth service is the identity provider for the platform. It is the only service that issues JWTs and manages user accounts. All other services and the gateway rely on the Auth service's JWT signing key to validate incoming tokens.

### Components

1. **AuthResolver** — Thin GraphQL resolver that receives `register`, `login`, and `me` mutations/queries, extracts arguments, and delegates to `AuthService`.
2. **AuthService** — Contains all business logic: password hashing with bcrypt, credential verification, JWT signing and verification, user lookup.
3. **JwtStrategy** — Passport strategy that extracts the JWT from the `Authorization` header, verifies the signature and expiry, and returns the decoded user payload.
4. **RolesGuard** — Reads the user's `role` from the decoded JWT payload and compares it against the roles required by the `@Roles()` decorator.
5. **Prisma Client** — Type-safe database access to the `users` table.

## Data Flow

### Registration Flow

```
Client ──register(input)──▶ Gateway ──▶ Auth Resolver ──▶ Auth Service
                                                               │
                                                     ┌─────────▼─────────┐
                                                     │ 1. Validate input │
                                                     │    (class-validator)
                                                     │ 2. Check email    │
                                                     │    uniqueness     │
                                                     │ 3. Hash password  │
                                                     │    (bcrypt 12)    │
                                                     │ 4. Create user    │
                                                     │    in PostgreSQL  │
                                                     │ 5. Sign JWT       │
                                                     │    (sub, role)    │
                                                     └─────────┬─────────┘
                                                               │
Client ◀── { token, user } ── Gateway ◀── Auth Resolver ◀──────┘
```

1. Client sends `register` mutation with email and password to the gateway.
2. Gateway routes the mutation to the Auth service resolver.
3. `AuthResolver` delegates to `AuthService.register()`.
4. `AuthService` validates the input via `class-validator` DTOs, checks that the email is not already taken, hashes the password with bcrypt (12 rounds), and creates a new `User` record in PostgreSQL.
5. A signed JWT is returned containing the user's `id` (`sub`), `role`, `iat`, and `exp`.
6. The response `{ token, user }` flows back through the resolver and gateway to the client.

### Login Flow

```
Client ──login(input)──▶ Gateway ──▶ Auth Resolver ──▶ Auth Service
                                                             │
                                                   ┌─────────▼─────────┐
                                                   │ 1. Validate input │
                                                   │ 2. Lookup user    │
                                                   │    by email       │
                                                   │ 3. Compare        │
                                                   │    password hash  │
                                                   │ 4. Sign JWT       │
                                                   └─────────┬─────────┘
                                                             │
Client ◀── { token, user } ── Gateway ◀── Auth Resolver ◀────┘
```

1. Client sends `login` mutation with email and password.
2. `AuthService.lookup()` queries the `users` table by email.
3. If the user exists, the provided password is compared against the stored bcrypt hash.
4. On match, a new JWT is signed and returned. On mismatch, an `UnauthorizedException` is thrown.

### Token Verification (used by all services)

```
Gateway receives request with Authorization header
       │
       ▼
JwtAuthGuard.extractAndVerify(token)
       │
       ├── Verifies signature using AUTH_JWT_SECRET
       ├── Checks expiry (exp claim)
       └── Decodes payload: { sub, role, iat, exp }
       │
       ▼
Request context populated with current user
       │
       ▼
RolesGuard checks @Roles() decorator against user.role
```

## Tech

- NestJS 11, GraphQL (code-first, Apollo), Prisma 6, PostgreSQL
- JWT (HS256), bcrypt (12 rounds), passport-jwt strategy
- class-validator DTOs, global ValidationPipe, global GraphQL exception filter

## Environment Variables

Create a `.env` file from the template:

```bash
cp ../../.env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `AUTH_DATABASE_URL` | — | PostgreSQL connection string |
| `AUTH_JWT_SECRET` | — | HS256 signing secret |
| `AUTH_JWT_EXPIRATION` | `24h` | Token expiry duration |
| `AUTH_PORT` | `4001` | Service port |

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

The seed creates an admin user:
- **Email:** `admin@smarttraffic.com`
- **Password:** `admin1234`

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
| `npm run prisma:seed` | Seed admin user |

## GraphQL Operations

### `register` mutation

```graphql
mutation Register($input: RegisterInput!) {
  register(registerInput: $input) {
    token
    user { id email role }
  }
}
```

### `login` mutation

```graphql
mutation Login($input: LoginInput!) {
  login(loginInput: $input) {
    token
    user { id email role }
  }
}
```

### `me` query (requires `Authorization: Bearer <token>`)

```graphql
query Me {
  me {
    id email role createdAt
  }
}
```

## Guards and Decorators

- `@UseGuards(JwtAuthGuard)` — requires valid JWT
- `@Roles('ADMIN')` or `@Roles('ADMIN', 'OPERATOR')` — restricts by role
- `@CurrentUser()` — extracts authenticated user in resolvers

## Database

### `users` table

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | String (unique) | Login identifier |
| password_hash | String | bcrypt hash (never exposed) |
| role | Role (enum) | ADMIN or OPERATOR |
| created_at | DateTime | Auto-set |
| updated_at | DateTime | Auto-updated |
