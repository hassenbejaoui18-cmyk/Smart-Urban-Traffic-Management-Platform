# Progress Tracker

## Current Phase

Unit 6 — GraphQL Gateway + cross-service wiring — complete

## Completed

- Git repo initialized and connected to remote (`origin/main`)
- `.gitignore` updated (ignores `Six-File+Context+Methodology/`, common NestJS artifacts, env files)
- `context/project-overview.md` — written with overview, goals, user flow, features, in/out of scope, success criteria
- `context/architecture.md` — written with stack table, system boundaries, storage model, auth model, invariants (6 rules)
- `context/code-standards.md` — written with NestJS/TypeScript conventions, file organization, naming, patterns, error handling, testing, Prisma standards, preferred vs discouraged examples, README structure requirements, JSDoc file-level documentation rules
- JSDoc file-level comments and public method docs added to all 18 auth service source files
- Auth service reorganized into layer-based structure: `guards/`, `decorators/`, `strategies/`, `providers/`, `dto/`, `entities/`, `common/`
- `context/ai-workflow-rules.md` — written with spec-driven approach, scoping rules, split conditions, missing requirements policy, protected files, verification checklist
- `ui-context.md` skipped — frontend is a bonus; will create later if needed
- Framework confirmed: NestJS (code-first GraphQL, Prisma, PostgreSQL)
- Build plan created at `context/specs/00-build-plan.md` — 7 units in dependency order
- Unit 1 spec at `context/specs/01-auth-service.md`
- **Unit 1 complete** — Root monorepo scaffolded with npm workspaces, Auth service on port 4001 with register/login/me, JWT issuance + role guards, Prisma schema for `users` table, seed script for admin user
- Unit 2 spec at `context/specs/02-vehicle-service.md`
- **Unit 2 complete** — Vehicle service on port 4002 with vehicle CRUD, GPS position recording, movement history, pagination, Prisma schema (`vehicles`, `gps_positions`), migration applied
- Unit 3 spec at `context/specs/03-traffic-service.md`
- **Unit 3 complete** — Traffic service on port 4003 with zone CRUD, density computation, congestion classification (LOW/MEDIUM/HIGH), scheduled 5-minute density task, cross-service Vehicle client, migration applied, build passes
- Unit 4 spec at `context/specs/04-incident-service.md`
- **Unit 4 complete** — Incident service on port 4004 with incident CRUD, status transitions (REPORTED→IN_PROGRESS→RESOLVED), role-scoped queries, Prisma schema (`incidents` table)
- Unit 5 spec at `context/specs/05-notification-service.md`
- **Unit 5 complete** — Notification service on port 4005 with create, list (filterable by isRead), markAsRead, markAllAsRead, Prisma schema (`notifications` table)
- Unit 6 spec at `context/specs/06-gateway.md`
- **Unit 6 complete** — All 5 services switched to `ApolloFederationDriver`, primary entities decorated with `@Directive('@key(fields: "id")')`, Gateway service scaffolded on port 4000 with `IntrospectAndCompose`, Incident→Notification cross-service wiring via `NotificationClientService`, gateway scripts in root package.json, `.env.example` updated

## Next Up

1. **Unit 7** — Deliverables (UML diagrams, Postman, sample queries)

## Changes

- JSDoc file-level rule added to `code-standards.md`: JSDoc must be placed **after** all import statements (was previously top-of-file).
- Notification service (16 source files) follows the new JSDoc-after-imports rule.
- All 5 services switched from `ApolloDriver` to `ApolloFederationDriver` with federation: 2 config.
- All 5 primary entity `@ObjectType` classes annotated with `@Directive('@key(fields: "id")')`.
- Gateway service created at `gateway/` with `ApolloGatewayDriver` + `IntrospectAndCompose`.
- Incident service wired to Notification service via `NotificationClientService` (HTTP GraphQL).

## Open Questions

- Threshold values for traffic density classification (Low / Medium / High) — not yet defined in the spec. Will pick defaults when implementing Traffic service.

## Architecture Decisions

- **NestJS code-first GraphQL** over schema-first — keeps TypeScript types and GraphQL schema in sync automatically via decorators.
- **No direct service-to-service DB access** — enforced by per-service Prisma clients. All cross-service queries go through the GraphQL gateway.
- **In-process event bus** for cross-service communication (e.g., incident → notification) to keep initial architecture simple. Can extract to a message broker later if needed.
- **Prisma v6** over v7 — v7 dropped `url` in datasource blocks, requiring a new config format (`prisma.config.ts`). v6 is stable and matches the spec.
- **All source files flat under `src/`** — no nested module subdirectories. The module IS the service. Entities in `src/entities/`, DTOs in `src/dto/`, filters in `src/common/filters/`.
- **GqlExecutionContext** used in guards and decorators instead of `switchToHttp()` — ensures proper GraphQL context extraction and satisfies `@typescript-eslint/no-unsafe-*` rules when typed.

## Session Notes

- **Unit 1 implementation notes:**
  - Used `npx @nestjs/cli` (not globally installed) to scaffold `services/auth/`
  - Prisma v7 was initially installed but broke the schema format (no `url` in datasource). Downgraded to Prisma v6.19.3.
  - NestJS v11 scaffold uses `module: "nodenext"` by default, but the base config overrides to `"commonjs"` — works fine.
  - `strict: true` required `!` definite assignment assertions on all DTO/entity class properties, and proper typing of `GqlExecutionContext` to satisfy `@typescript-eslint/no-unsafe-*` rules.
  - `@nestjs/jwt` v11 uses `ms.StringValue` branded type for `expiresIn` — cast with `ms.StringValue` to satisfy both TypeScript and ESLint.
  - `APP_FILTER` provider pattern used for the global exception filter registration.
  - Removed unused scaffold files (`app.controller.ts`, `app.service.ts`, `app.module.ts`, `app.controller.spec.ts`, `test/` directory).
  - Build and lint both pass cleanly.
