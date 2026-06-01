# Progress Tracker

## Current Phase

Unit 1 — Monorepo scaffold + Auth service — complete
Unit 2 — Vehicle service — implemented, migration applied, build passes

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
- Unit 3 spec at `context/specs/03-traffic-service.md` — zone management, density computation, congestion classification, scheduled task, cross-service vehicle client
- **Unit 3 complete** — Traffic service on port 4003 with zone CRUD, density computation, congestion classification (LOW/MEDIUM/HIGH), scheduled 5-minute density task, cross-service Vehicle client, migration applied, build passes

## In Progress

- **Unit 4** — Incident service scaffolded, Prisma schema created (IncidentType, IncidentStatus enums + Incident model), service/resolver/module implemented with strict status transitions (REPORTED → IN_PROGRESS → RESOLVED), ownership scoping, filtering by status/type/zoneId. Build passes. Migration not yet applied.

## Next Up

1. **Unit 5** — Notification service (send, list, mark-read)
2. **Unit 6** — GraphQL Gateway + cross-service event wiring
3. **Unit 7** — Deliverables (UML diagrams, Postman, sample queries)

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
