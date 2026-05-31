# Auth Service

User authentication service — registration, login, JWT issuance, and role-based access control (ADMIN / OPERATOR).

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
