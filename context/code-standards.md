# Code Standards

## General

- Every service must be a self-contained NestJS application with its own module, resolvers, services, and DTOs.
- Keep modules small and single-purpose — one domain per service, one concern per module.
- Fix root causes, do not layer workarounds. If a bug repeats, fix the validation or abstraction that allowed it.
- Do not mix unrelated concerns in one resolver or service. Cross-cutting logic (auth, logging) belongs in guards, interceptors, or filters.

## TypeScript

- Strict mode is required throughout the project. `strict: true` in every `tsconfig.json`.
- Avoid `any` — use explicit interfaces, type aliases, or `unknown` with type guards.
- Validate all external input at system boundaries (GraphQL DTOs / `InputType` classes) before trusting it.
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and primitive aliases.
- Mark readonly fields with `readonly` modifier. Use `ReadonlyArray<T>` for immutable arrays.

## NestJS

- Every feature follows the module pattern: `*.module.ts` (one per domain), `*.resolver.ts` (GraphQL), `*.service.ts` (business logic), `*.guard.ts` (auth), `dto/*` (validation).
- Resolvers must be thin — they parse the request context, delegate to a service, and return a result. No business logic in resolvers.
- Services contain all domain logic. They are injectable, stateless, and testable in isolation.
- Guards handle authentication and authorization only. Never put business logic in a guard.
- Use `@nestjs/graphql` with the code-first approach (`@ObjectType`, `@Field`, `@Mutation`, `@Query` decorators) rather than schema-first `.graphql` files.
- Use `@nestjs/config` for environment variables. Validate config with a validated config schema class.
- Use `class-validator` + `class-transformer` decorators on DTO / `InputType` classes for input validation.
- Apply `ValidationPipe` globally with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

### Resolver — Preferred

Resolvers must be thin: they parse request context, apply guards/decorators, delegate to a service, and return the result. Each method has a file-level JSDoc on the class and a single step comment delegating to the service.

```typescript
/**
 * Resolver: AuthResolver
 * ----------------------
 * GraphQL resolver for authentication operations.
 * Exposes register, login, and me queries/mutations.
 * Delegates all business logic to AuthService.
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput) {
    // ++++++++++ Step 1: Delegate registration to AuthService +++++++++++
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput) {
    // ++++++++++ Step 1: Delegate login to AuthService +++++++++++
    return this.authService.login(input);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    // ++++++++++ Step 1: Delegate profile retrieval to AuthService +++++++++++
    return this.authService.me(user.id);
  }
}
```

### Resolver — Discouraged

```typescript
// ❌ Business logic in resolver, no JSDoc, no step comments
@Query(() => [Vehicle])
async vehicles(@Context() ctx: any) {
  const user = ctx.req.user;
  if (!user) throw new UnauthorizedException();
  if (user.role !== 'ADMIN') {
    // manual filtering instead of a guard...
  }
  return this.prisma.vehicle.findMany({ where: { ownerId: user.sub } });
}
```

### Service — Preferred

Services contain all domain logic. Each public method must have JSDoc with `@param` and `@returns`, and step comments breaking down the internal flow.

```typescript
/**
 * Service: AuthService
 * --------------------
 * Handles user registration, login, and profile retrieval.
 * Uses bcrypt for password hashing and JwtService for token signing.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Register Service
   * ----------------
   * Registers a new user with the given email and password.
   * Checks for duplicate email, hashes the password, creates the user,
   * and returns a signed JWT along with the user object.
   *
   * @param {RegisterInput} input - The registration input containing email and password.
   * @returns {Promise<{ token: string; user: User }>} - The signed JWT and created user.
   * @throws {ConflictException} - If the email is already registered.
   */
  async register(input: RegisterInput) {
    // ++++++++++ Step 1: Check if email is already registered +++++++++++
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // ++++++++++ Step 2: Hash the password with bcrypt +++++++++++
    const passwordHash = await bcrypt.hash(input.password, 12);

    // ++++++++++ Step 3: Create the user in the database +++++++++++
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: Role.OPERATOR,
      },
    });

    // ++++++++++ Step 4: Sign a JWT for the new user +++++++++++
    const token = this.jwt.sign({ sub: user.id, role: user.role });

    // ++++++++++ Step 5: Return token and user data +++++++++++
    return { token, user };
  }
}
```

### Service — Discouraged

```typescript
// ❌ No JSDoc, no step comments, unclear flow
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: any) {
    return this.prisma.user.create({ data: input });
  }
}
```

## Project Structure and File Organization

```
services/<service-name>/
├── src/
│   ├── <domain>.module.ts          # Module definition
│   ├── <domain>.resolver.ts        # GraphQL entry point (thin)
│   ├── <domain>.service.ts         # Domain logic
│   ├── main.ts                     # Bootstrap
│   ├── guards/                     # Auth & authorization guards
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/                 # Custom parameter/method decorators
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── strategies/                 # Passport strategies
│   │   └── jwt.strategy.ts
│   ├── providers/                  # Shared infrastructure (Prisma, etc.)
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── dto/                        # Input validation DTOs
│   │   ├── create-<entity>.input.ts
│   │   ├── update-<entity>.input.ts
│   │   └── <entity>-filter.input.ts
│   ├── entities/                   # GraphQL @ObjectType decorated
│   │   └── <entity>.ts
│   └── common/                     # Cross-cutting concerns
│       └── filters/
│           └── graphql-exception.filter.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
    ├── unit/
    └── e2e/

gateway/
├── src/
│   ├── gateway.module.ts
│   ├── gateway.resolver.ts
│   ├── auth/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── federation/
│       └── service-reference.ts
└── test/
```

## Naming Conventions

- **Files**: `kebab-case` — `vehicle.service.ts`, `jwt-auth.guard.ts`, `create-vehicle.input.ts`.
- **Classes**: `PascalCase` — `VehicleService`, `CreateVehicleInput`, `JwtAuthGuard`.
- **Functions / methods**: `camelCase` — `findAll()`, `createVehicle()`, `markAsRead()`.
- **GraphQL fields**: `camelCase` — `licensePlate`, `recordedAt`, `isRead`.
- **Database columns**: `snake_case` — `license_plate`, `recorded_at`, `owner_id`.
- **Environment variables**: `SCREAMING_SNAKE_CASE` — `JWT_SECRET`, `DATABASE_URL`, `AUTH_SERVICE_URL`.
- **Folders**: `kebab-case` — `guards/`, `decorators/`, `strategies/`, `providers/`, `dto/`, `entities/`, `common/`.
- **Enum values**: `SCREAMING_SNAKE_CASE` — `ACCIDENT`, `ROAD_CLOSED`, `IN_PROGRESS`.

## Architectural Patterns

- **Microservices architecture** — Five independent NestJS services, each with its own database schema and Prisma client. No direct database access across services.
- **GraphQL Federation** — The gateway composes schemas from all services. Each service defines its own resolvers and types. The gateway aggregates and routes requests.
- **Repository pattern** — Wrap Prisma queries in injectable service methods. Repositories (or service methods) are the only code that touches the database.
- **Dependency Injection** — Use NestJS constructor injection for all dependencies. Never instantiate services manually.
- **Event-driven cross-service communication** — Use NestJS `@nestjs/event-emitter` or a lightweight message bus for cross-service events (e.g., incident created → notification dispatch). Avoid synchronous HTTP calls between services inside request handlers where possible.

## Error Handling and Validation Standards

- Define a global `ExceptionFilter` that catches all unhandled exceptions and returns a consistent GraphQL error shape.
- Use NestJS built-in HTTP exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`) mapped to appropriate GraphQL errors.
- Every `InputType` must have `class-validator` decorators on all fields:
  - `@IsString()`, `@IsEmail()`, `@IsEnum()`, `@IsOptional()`, `@MinLength()`, `@MaxLength()`, `@IsNumber()`, `@IsLatitude()`, `@IsLongitude()`.
- Return domain-specific error messages, not stack traces. Never expose internal error details to the client.
- Use `@BadRequestException` with a structured message array for validation failures.
- Log all errors at the appropriate level (`warn` for validation, `error` for unexpected failures) using the NestJS Logger.

### Preferred

```typescript
@InputType()
export class CreateVehicleInput {
  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  licensePlate: string;

  @Field()
  @IsString()
  @IsIn(['CAR', 'TRUCK', 'MOTORCYCLE', 'BUS'])
  type: string;
}
```

### Discouraged

```typescript
// ❌ No validation, trusting raw input
@InputType()
export class CreateVehicleInput {
  @Field()
  licensePlate: string;

  @Field()
  type: string;
}
```

## Testing Expectations

- **Unit tests** are required for all service classes. Mock Prisma client and test business logic in isolation.
- **Resolver tests** verify that guards are applied, correct service methods are called, and the return shape matches the `@ObjectType`.
- **E2E tests** cover the full GraphQL flow through the gateway for at least one success and one failure case per mutation/query.
- Use `@nestjs/testing` `Test.createTestingModule` for all test setups.
- Name test files `*.spec.ts` and place them next to the source file they test (or in `test/unit/`).
- Aim for at least 70% line coverage on service files.

## Documentation Requirements

- Every file (hook, component, service, resolver, guard, module, client, utility, etc.) must have a file-level JSDoc comment at the top explaining its purpose, usage, and return value (if applicable).
- Every public method on a service must have a JSDoc comment explaining what it does, parameters, and return value.
- Every GraphQL `@ObjectType` must have `@Field` descriptions for non-obvious fields.
- Each service's `README.md` documents its architecture overview, data flow, environment variables, Prisma migration commands, and how to run it locally.
- The root `README.md` documents the overall architecture with a high-level diagram, the end-to-end data flow, how to start all services, and links to each service's README.

### README Structure

Every README (root and per-service) must include the following sections:

#### Architecture Overview
A high-level architectural description including:
- An ASCII diagram showing the service and its surrounding layers (clients, databases, other services).
- A description of each component in the diagram and its role.
- How the service fits into the broader system.

#### Data Flow
A clear walkthrough of how data moves through the service:
- **Entry points** — how data enters the service (GraphQL mutations/queries, events, scheduled tasks).
- **Processing** — what happens to the data (validation, business logic, transformations).
- **Storage** — where data is persisted and in what shape.
- **Outputs** — what is returned to callers or emitted to other services.

For the root README, the Data Flow covers end-to-end request flow across all services.

### JSDoc File-Level Structure

File-level JSDoc MUST be placed **after** all import statements, just before the
first exported declaration (class, function, enum, or constant). This keeps the
documentation adjacent to what it describes and avoids visual noise at the top
of the file.

```typescript
import { ... } from '...';

/**
 * File: <filename>
 * -----------------
 * <Brief description of the file's purpose and responsibilities.>
 *
 * <Optional: more detailed explanation of usage, context, or
 *  side effects.>
 *
 * @returns {<type>} - <Description of what the file exports or returns.>
 */
```

## Database and Prisma

- Use Prisma as the ORM for all services. Define one `schema.prisma` per service.
- Name models in `PascalCase` (singular): `User`, `Vehicle`, `GpsPosition`, `Zone`, `Incident`, `Notification`.
- Every model must have an `id` field of type `String` with `@default(uuid())`.
- Every model must have `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` fields.
- Use enums in Prisma schema for fixed sets: `role`, `incident_type`, `incident_status`, `congestion_level`.
- Write all database migrations with `prisma migrate dev`. Never edit migration files manually.

### Preferred

```prisma
model Vehicle {
  id           String        @id @default(uuid())
  licensePlate String        @unique
  type         VehicleType
  ownerId      String
  owner        User          @relation(fields: [ownerId], references: [id])
  positions    GpsPosition[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

### Discouraged

```prisma
// ❌ No UUID, no timestamps, no relations defined
model Vehicle {
  id    Int    @id @default(autoincrement())
  plate String
  type  String
}
```
