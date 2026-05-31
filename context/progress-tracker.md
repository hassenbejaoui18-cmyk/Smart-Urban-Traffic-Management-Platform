# Progress Tracker

## Current Phase

Context setup — complete

## Current Goal

Scaffold monorepo and build the Auth service (Unit 1).

## Completed

- Git repo initialized and connected to remote (`origin/main`)
- `.gitignore` updated (ignores `Six-File+Context+Methodology/`, common NestJS artifacts, env files)
- `context/project-overview.md` — written with overview, goals, user flow, features, in/out of scope, success criteria
- `context/architecture.md` — written with stack table, system boundaries, storage model, auth model, invariants (6 rules)
- `context/code-standards.md` — written with NestJS/TypeScript conventions, file organization, naming, patterns, error handling, testing, Prisma standards, preferred vs discouraged examples
- `context/ai-workflow-rules.md` — written with spec-driven approach, scoping rules, split conditions, missing requirements policy, protected files, verification checklist
- `ui-context.md` skipped — frontend is a bonus; will create later if needed
- Framework confirmed: NestJS (code-first GraphQL, Prisma, PostgreSQL)
- Build plan created at `context/specs/00-build-plan.md` — 7 units in dependency order

## In Progress

- Nothing yet

## Next Up

1. **Unit 1** — Scaffold monorepo + Auth service (register, login, JWT, role guards)
2. **Unit 2** — Vehicle service (CRUD, GPS positions, movement history)
3. **Unit 3** — Traffic service (zones, density computation, congestion classification)
4. **Unit 4** — Incident service (reporting, status transitions)
5. **Unit 5** — Notification service (send, list, mark-read)
6. **Unit 6** — GraphQL Gateway + cross-service event wiring
7. **Unit 7** — Deliverables (READMEs, UML diagrams, Postman, sample queries)

## Open Questions

- Threshold values for traffic density classification (Low / Medium / High) — not yet defined in the spec. Will pick defaults when implementing Traffic service.

## Architecture Decisions

- **NestJS code-first GraphQL** over schema-first — keeps TypeScript types and GraphQL schema in sync automatically via decorators.
- **No direct service-to-service DB access** — enforced by per-service Prisma clients. All cross-service queries go through the GraphQL gateway.
- **In-process event bus** for cross-service communication (e.g., incident → notification) to keep initial architecture simple. Can extract to a message broker later if needed.

## Session Notes

- All four context files (overview, architecture, code-standards, ai-workflow-rules) are written and consistent with each other.
- No code has been generated yet. The project directory is a git repo with remote configured, ready for the first service scaffold.
- Start with `nest new` in `services/auth/`, then add Prisma, then implement resolvers.
