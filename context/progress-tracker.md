# Progress Tracker

## Current Phase

Context setup — complete

## Current Goal

Build the Authentication service (innermost dependency — all other services depend on it).

## Completed

- Git repo initialized and connected to remote (`origin/main`)
- `.gitignore` updated (ignores `Six-File+Context+Methodology/`, common NestJS artifacts, env files)
- `context/project-overview.md` — written with overview, goals, user flow, features, in/out of scope, success criteria
- `context/architecture.md` — written with stack table, system boundaries, storage model, auth model, invariants (6 rules)
- `context/code-standards.md` — written with NestJS/TypeScript conventions, file organization, naming, patterns, error handling, testing, Prisma standards, preferred vs discouraged examples
- `context/ai-workflow-rules.md` — written with spec-driven approach, scoping rules, split conditions, missing requirements policy, protected files, verification checklist
- `ui-context.md` skipped — frontend is a bonus; will create later if needed
- Framework confirmed: NestJS (code-first GraphQL, Prisma, PostgreSQL)

## In Progress

- Nothing yet

## Next Up

1. Scaffold the monorepo with NestJS for Auth service
2. Set up Prisma schema for Auth (`users` table with roles)
3. Implement Auth service: register, login, JWT issuance, role guards

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
