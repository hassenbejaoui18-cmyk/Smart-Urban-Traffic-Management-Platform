# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. The context files (`project-overview.md`, `architecture.md`, `code-standards.md`) define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior from scratch. Implement one service at a time, starting from the innermost dependency (Auth) and working outward.

## Scoping Rules

- Work on exactly one feature unit at a time. A unit is one of: a complete service, a single resolver group, a database schema, or a cross-cutting concern (auth guards, global pipes).
- Do not make speculative changes. Every modification must be justified by a requirement in `project-overview.md` or an explicit user request.
- Do not combine unrelated system boundaries in a single implementation step. For example, do not modify the Vehicle service and the Incident service in the same step unless they share a cross-cutting concern.
- Do not add bonus/out-of-scope features (WebSocket, frontend, CI/CD, tests) unless the user explicitly asks for them.
- do not make commmits until i ask for it 
## When to Split Work

Split an implementation step if it combines:

- Work in two different services (e.g., Auth + Vehicle in one step)
- Database schema changes and resolver implementation — do schema first, verify it, then add resolvers
- Behavior not clearly defined in the context files — seek clarification before proceeding
- A change that cannot be verified end to end within 30 minutes of focused work

If a change cannot be verified with a single `npm run start:dev` or a GraphQL query in under a minute, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files. If a resolver, field, or mutation is not listed in `project-overview.md`, do not create it.
- If a requirement is ambiguous (e.g., "density threshold" is not numerically defined), pick a reasonable default and document it in `progress-tracker.md` as a decision.
- If a requirement is missing entirely, add it as an open question in `progress-tracker.md` under "Open Questions" before continuing.
- Never guess database column types, enum values, or validation rules. Check `architecture.md` and `code-standards.md` first. If not defined there, ask the user.

## Protected Files

Do not modify the following unless explicitly instructed:

- `context/` files — these define the spec. Only modify them when the architecture, scope, or standards actually change during implementation. Do not edit them to "keep them in sync with code" — they drive the code, not the other way around.
- Any generated or scaffolded NestJS boilerplate that you did not write yourself (e.g., `nest new` generated files beyond what is needed).
- Third-party dependency source files inside `node_modules/`.
- The root `package.json` `scripts` section unless adding a new run command.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture, service boundaries, or data flow — update `architecture.md`
- Storage model decisions (new tables, changed relationships) — update `architecture.md`
- Code conventions or standards that were missing — update `code-standards.md`
- Feature scope, success criteria, or user flow — update `project-overview.md`
- Progress, decisions, and open questions — update `progress-tracker.md` after every meaningful implementation step

If a context file change would have affected earlier work, update it immediately. If it only affects future work, update it before starting the next unit.

## Verification Checklist Before Moving to the Next Unit

1. The current unit compiles without errors (`npm run build` or `nest build` passes).
2. The current service starts and its GraphQL playground/schema is accessible.
3. Every mutation and query in the unit was tested manually via the GraphQL playground with valid input, invalid input, and unauthenticated requests.
4. No invariant defined in `architecture.md` was violated.
5. The Prisma migration (if any) applied cleanly and rolled back cleanly.
6. `progress-tracker.md` reflects the completed work with an updated `completed` list and current `phase`.
7. If any architectural decision was made during implementation, `architecture.md` was updated to reflect it.
8. The `context/` files are internally consistent — no contradiction between `project-overview.md`, `architecture.md`, and `code-standards.md`.
