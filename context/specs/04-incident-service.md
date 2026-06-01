# Spec — Unit 4: Incident Service

## Goal

Build the Incident microservice (port 4004) with incident lifecycle management — creation, status transitions (Reported → In Progress → Resolved), listing, and filtering — all protected by JWT authentication from Unit 1 — so that authenticated users can report incidents by type and location, track their resolution progress, and query incident history.

## Design Decisions

- **Port**: `4004` — consistent with the port plan (Auth 4001, Vehicles 4002, Traffic 4003, Incidents 4004, Notifications 4005).
- **File structure**: Matches previous services — layered `src/` with `guards/`, `decorators/`, `strategies/`, `providers/`, `entities/`, `dto/`, `common/`, and `prisma/`.
- **GraphQL**: Code-first, same `@nestjs/graphql` + `@nestjs/apollo` setup. Playground enabled in development.
- **Guards**: Local copies of `JwtAuthGuard` and `RolesGuard`. JWT secret read from `INCIDENT_JWT_SECRET` env var — must match `AUTH_JWT_SECRET`.
- **Database**: Prisma v6 with its own PostgreSQL database (`smart_traffic_incident`).
- **IncidentType enum**: `ACCIDENT`, `CONSTRUCTION`, `ROAD_CLOSED`, `TRAFFIC_JAM` — stored as a Prisma enum.
- **IncidentStatus enum**: `REPORTED`, `IN_PROGRESS`, `RESOLVED` — stored as a Prisma enum.
- **Status transitions**: Must follow the strict order `REPORTED → IN_PROGRESS → RESOLVED`. Invalid transitions (e.g., `REPORTED → RESOLVED`, `IN_PROGRESS → REPORTED`) are rejected with a domain error. This is an architectural invariant from `architecture.md`.
- **Incident model**: id, type (enum), status (enum), description, latitude (optional), longitude (optional), zoneId (optional), reported_by (user id from JWT), created_at, updated_at.
- **Ownership**: Incidents are attributed to the user who reported them (`reported_by`). ADMIN users may read or mutate any incident. OPERATOR users may only read/mutate their own incidents.
- **No update after creation**: Once created, only the `status` field can be changed (via `updateIncidentStatus`). Type, description, and location are immutable.
- **Filtering**: Incidents can be filtered by `status`, `type`, and `zoneId`.
- **Validation**: Same `class-validator` patterns as previous services.
- **Error handling**: Reuses the same `GraphqlExceptionFilter` pattern. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Naming**: Files `kebab-case`, classes `PascalCase`, GraphQL fields `camelCase`, DB columns `snake_case`.
- **No seed script needed** — incidents are created through the API.

## Implementation

### 1. Scaffold Incident service

Run from the repo root:

```bash
npx @nestjs/cli new services/incidents --package-manager npm --skip-git --strict
```

Delete the generated `app.controller.ts`, `app.controller.spec.ts`, `app.service.ts`, `app.module.ts`, and the `test/` directory.

Replace `services/incidents/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Set `"private": true` in `services/incidents/package.json` (already true from scaffold).

**`services/incidents/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IncidentModule } from './incident.module';

async function bootstrap() {
  const app = await NestFactory.create(IncidentModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.INCIDENT_PORT ?? 4004);
}
void bootstrap();
```

### 2. Prisma schema

**`services/incidents/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("INCIDENT_DATABASE_URL")
}

enum IncidentType {
  ACCIDENT
  CONSTRUCTION
  ROAD_CLOSED
  TRAFFIC_JAM
}

enum IncidentStatus {
  REPORTED
  IN_PROGRESS
  RESOLVED
}

model Incident {
  id          String          @id @default(uuid())
  type        IncidentType
  status      IncidentStatus  @default(REPORTED)
  description String          @db.Text
  latitude    Float?
  longitude   Float?
  zoneId      String?         @map("zone_id")
  reportedBy  String          @map("reported_by")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  @@index([status])
  @@index([type])
  @@index([zoneId])
  @@map("incidents")
}
```

Key schema decisions:
- `IncidentType` enum — `ACCIDENT`, `CONSTRUCTION`, `ROAD_CLOSED`, `TRAFFIC_JAM`.
- `IncidentStatus` enum — `REPORTED`, `IN_PROGRESS`, `RESOLVED`.
- `status` defaults to `REPORTED` — new incidents always start as REPORTED.
- `latitude` and `longitude` are optional (`Float?`) — location data is not required.
- `zoneId` is optional (`String?`) — an incident may or may not be associated with a traffic zone.
- `reportedBy` stores the `sub` (user id) from the JWT — ownership reference, not a foreign key constraint (since users live in the Auth service's database).
- `description` is `@db.Text` — supports longer incident descriptions.
- `@@index([status])`, `@@index([type])`, `@@index([zoneId])` — optimises common filter queries.
- No `onDelete` cascade — incidents are not deleted when a user or zone is removed (historical records are preserved).

Add Prisma scripts to `services/incidents/package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "echo 'No seed needed for incident service'"
```

### 3. Prisma module and service

Identical to Auth/Vehicles — create `providers/prisma.module.ts` and `providers/prisma.service.ts`.

**`providers/prisma.module.ts`:**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**`providers/prisma.service.ts`:**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### 4. GraphQL entities

**`entities/incident-type.enum.ts`** — re-export the Prisma enum for GraphQL:

```typescript
import { registerEnumType } from '@nestjs/graphql';
import { IncidentType } from '@prisma/client';

registerEnumType(IncidentType, { name: 'IncidentType' });

export { IncidentType };
```

**`entities/incident-status.enum.ts`** — re-export the Prisma enum for GraphQL:

```typescript
import { registerEnumType } from '@nestjs/graphql';
import { IncidentStatus } from '@prisma/client';

registerEnumType(IncidentStatus, { name: 'IncidentStatus' });

export { IncidentStatus };
```

**`entities/incident.entity.ts`:**

```typescript
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IncidentType } from './incident-type.enum';
import { IncidentStatus } from './incident-status.enum';

@ObjectType()
export class Incident {
  @Field()
  id!: string;

  @Field(() => IncidentType)
  type!: IncidentType;

  @Field(() => IncidentStatus)
  status!: IncidentStatus;

  @Field()
  description!: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field({ nullable: true })
  zoneId?: string;

  @Field()
  reportedBy!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

### 5. DTOs

**`dto/create-incident.input.ts`:**

```typescript
import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IncidentType } from '../entities/incident-type.enum';

@InputType()
export class CreateIncidentInput {
  @Field(() => IncidentType)
  @IsEnum(IncidentType)
  type!: IncidentType;

  @Field()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}
```

**`dto/update-incident-status.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { IncidentStatus } from '../entities/incident-status.enum';

@InputType()
export class UpdateIncidentStatusInput {
  @Field(() => IncidentStatus)
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;
}
```

**`dto/incident-filter.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentStatus } from '../entities/incident-status.enum';
import { IncidentType } from '../entities/incident-type.enum';

@InputType()
export class IncidentFilterInput {
  @Field(() => IncidentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @Field(() => IncidentType, { nullable: true })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}
```

### 6. Auth guards

Copy the same guard/decorator files from previous services, adapted to read `INCIDENT_JWT_SECRET`:

- **`guards/jwt-auth.guard.ts`** — identical to Auth's `JwtAuthGuard` (extends `AuthGuard('jwt')`).
- **`strategies/jwt.strategy.ts`** — reads `INCIDENT_JWT_SECRET` from ConfigService.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('INCIDENT_JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, role: payload.role };
  }
}
```

- **`guards/roles.guard.ts`** — identical to Auth's `RolesGuard`.
- **`decorators/roles.decorator.ts`** — identical to Auth's `Roles` decorator.
- **`decorators/current-user.decorator.ts`** — identical to Auth's `CurrentUser` decorator.
- **`common/role.enum.ts`** — same local role enum:

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}
```

### 7. Global exception filter

**`common/filters/graphql-exception.filter.ts`** — identical to Auth/Vehicles:

```typescript
import { Catch, HttpException, InternalServerErrorException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown) {
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
```

### 8. Incident service

**`incident.service.ts`:**

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from './common/role.enum';
import { IncidentStatus } from './entities/incident-status.enum';
import { PrismaService } from './providers/prisma.service';

@Injectable()
export class IncidentService {
  private readonly validTransitions: Record<IncidentStatus, IncidentStatus[]> =
    {
      [IncidentStatus.REPORTED]: [IncidentStatus.IN_PROGRESS],
      [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
      [IncidentStatus.RESOLVED]: [],
    };

  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: {
      type: string;
      description: string;
      latitude?: number;
      longitude?: number;
      zoneId?: string;
    },
    reportedBy: string,
  ) {
    return this.prisma.incident.create({
      data: {
        type: input.type,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        zoneId: input.zoneId,
        reportedBy,
      },
    });
  }

  async findAll(
    filter: {
      status?: string;
      type?: string;
      zoneId?: string;
    } | null,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const where: Record<string, unknown> = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;
    if (filter?.zoneId) where.zoneId = filter.zoneId;
    if (currentUserRole !== Role.ADMIN) where.reportedBy = currentUserId;

    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUserId: string, currentUserRole: Role) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    if (
      currentUserRole !== Role.ADMIN &&
      incident.reportedBy !== currentUserId
    ) {
      throw new NotFoundException('Incident not found');
    }

    return incident;
  }

  async updateStatus(
    id: string,
    newStatus: IncidentStatus,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    if (
      currentUserRole !== Role.ADMIN &&
      incident.reportedBy !== currentUserId
    ) {
      throw new NotFoundException('Incident not found');
    }

    const allowed = this.validTransitions[incident.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${incident.status} to ${newStatus}. Allowed transitions: ${incident.status} → ${allowed.join(' → ') || 'none'}`,
      );
    }

    return this.prisma.incident.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}
```

Ownership and authorization logic:
- `create` — authenticated user sets themselves as `reportedBy`. Open to ADMIN and OPERATOR.
- `findAll` — ADMIN sees all incidents. OPERATOR sees only their own (`reportedBy` filter).
- `findOne` — ADMIN can access any incident. OPERATOR gets `NotFoundException` for incidents they do not own (hides existence from unauthorized users, consistent with Vehicle service pattern).
- `updateStatus` — same ownership model as `findOne`. ADMIN can update any incident's status. OPERATOR can update only their own. Invalid transitions are rejected with a clear error message.

Status transition table:

| Current status | Allowed next statuses |
|---|---|
| REPORTED | IN_PROGRESS |
| IN_PROGRESS | RESOLVED |
| RESOLVED | (none — terminal state) |

### 9. Incident resolver

**`incident.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateIncidentInput } from './dto/create-incident.input';
import { IncidentFilterInput } from './dto/incident-filter.input';
import { UpdateIncidentStatusInput } from './dto/update-incident-status.input';
import { Incident } from './entities/incident.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { IncidentService } from './incident.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Resolver(() => Incident)
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentResolver {
  constructor(private readonly incidentService: IncidentService) {}

  @Mutation(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async createIncident(
    @Args('input') input: CreateIncidentInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.create(input, user.sub);
  }

  @Mutation(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async updateIncidentStatus(
    @Args('id') id: string,
    @Args('input') input: UpdateIncidentStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.updateStatus(
      id,
      input.status,
      user.sub,
      user.role,
    );
  }

  @Query(() => [Incident])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async incidents(
    @Args('filter', { nullable: true }) filter: IncidentFilterInput | null,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.findAll(filter, user.sub, user.role);
  }

  @Query(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async incident(
    @Args('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.findOne(id, user.sub, user.role);
  }
}
```

### 10. Incident module

**`incident.module.ts`:**

```typescript
import { join } from 'path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import ms from 'ms';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { IncidentResolver } from './incident.resolver';
import { IncidentService } from './incident.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('INCIDENT_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('INCIDENT_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    IncidentResolver,
    IncidentService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class IncidentModule {}
```

### 11. Environment file

**`services/incidents/.env`** (create, do not commit):

```env
INCIDENT_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_incident
INCIDENT_JWT_SECRET=dev-secret-change-in-production
INCIDENT_JWT_EXPIRATION=24h
INCIDENT_PORT=4004
```

`INCIDENT_JWT_SECRET` must match `AUTH_JWT_SECRET` so that tokens signed by the Auth service are accepted by the Incident service.

Update `.env.example` at repo root to include Incident service variables:

```env
# Auth Service
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=change-me-to-a-random-secret
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001

# Vehicle Service
VEHICLE_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_vehicle
VEHICLE_JWT_SECRET=change-me-to-a-random-secret
VEHICLE_JWT_EXPIRATION=24h
VEHICLE_PORT=4002

# Traffic Service
TRAFFIC_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_traffic
TRAFFIC_JWT_SECRET=change-me-to-a-random-secret
TRAFFIC_JWT_EXPIRATION=24h
TRAFFIC_PORT=4003
TRAFFIC_DENSITY_LOW_MAX=5
TRAFFIC_DENSITY_MEDIUM_MAX=20
VEHICLE_SERVICE_URL=http://localhost:4002/graphql

# Incident Service
INCIDENT_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_incident
INCIDENT_JWT_SECRET=change-me-to-a-random-secret
INCIDENT_JWT_EXPIRATION=24h
INCIDENT_PORT=4004
```

### 12. Root package.json scripts

Add to root `package.json`:

```json
"build:incidents": "npm run build -w services/incidents",
"dev:incidents": "npm run start:dev -w services/incidents"
```

## GraphQL API

### `createIncident` (mutation)

```graphql
mutation CreateIncident($input: CreateIncidentInput!) {
  createIncident(input: $input) {
    id
    type
    status
    description
    latitude
    longitude
    zoneId
    reportedBy
    createdAt
    updatedAt
  }
}
```

Variables:
```json
{
  "input": {
    "type": "ACCIDENT",
    "description": "Multi-vehicle collision on Highway 101 near exit 5",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "zoneId": null
  }
}
```

### `updateIncidentStatus` (mutation)

```graphql
mutation UpdateIncidentStatus($id: String!, $input: UpdateIncidentStatusInput!) {
  updateIncidentStatus(id: $id, input: $input) {
    id
    status
    updatedAt
  }
}
```

Variables:
```json
{
  "id": "<incident-uuid>",
  "input": { "status": "IN_PROGRESS" }
}
```

### `incidents` (query)

```graphql
query Incidents($filter: IncidentFilterInput) {
  incidents(filter: $filter) {
    id
    type
    status
    description
    latitude
    longitude
    zoneId
    reportedBy
    createdAt
    updatedAt
  }
}
```

Variables:
```json
{ "filter": { "status": "REPORTED", "type": null, "zoneId": null } }
```

### `incident` (query)

```graphql
query Incident($id: String!) {
  incident(id: $id) {
    id
    type
    status
    description
    reportedBy
    createdAt
  }
}
```

## Dependencies

### Runtime

| Package | Purpose |
|---|---|
| `@nestjs/config` | Environment variable loading and validation |
| `@nestjs/graphql` | GraphQL module for NestJS |
| `@nestjs/apollo` | Apollo driver integration |
| `@nestjs/jwt` | JWT verification (mirror of Auth's signing key) |
| `@nestjs/passport` | Passport strategy integration |
| `passport` | Authentication middleware |
| `passport-jwt` | JWT strategy for Passport |
| `@prisma/client` | Prisma database client (generated) |
| `prisma` | Prisma CLI (dev dependency) |
| `class-validator` | DTO validation decorators |
| `class-transformer` | DTO transformation |
| `apollo-server-express` | Apollo Server Express (peer dependency) |
| `graphql` | GraphQL runtime |

### Dev dependencies

| Package | Purpose |
|---|---|
| `@types/passport-jwt` | passport-jwt TypeScript types |
| `@nestjs/cli` | nest build / start commands |
| `typescript` | TypeScript compiler |

## Verification Checklist

1. `npm install` at root resolves the new `services/incidents` workspace without errors.
2. `npm run prisma:generate -w services/incidents` generates the Prisma client with `Incident` model, `IncidentType` and `IncidentStatus` enums.
3. Create the `smart_traffic_incident` database. Run `npm run prisma:migrate -w services/incidents` — the `incidents` table is created with all columns and indexes.
4. `npm run start:dev -w services/incidents` starts on port 4004 without errors.
5. Open GraphQL playground at `http://localhost:4004/graphql`.
6. Run `mutation createIncident` *without* an `Authorization` header — returns an authentication error.
7. Run `mutation createIncident` with a valid ADMIN JWT — returns the created incident with status `REPORTED`.
8. Run `mutation createIncident` with a valid OPERATOR JWT — returns the created incident with `reportedBy` set to the OPERATOR's user id.
9. Run `mutation createIncident` with a description shorter than 10 characters — returns a validation error.
10. Run `query incidents` as ADMIN — returns all incidents across all users.
11. Run `query incidents` as OPERATOR — returns only that OPERATOR's incidents.
12. Run `query incidents` with a status filter (e.g., `{ "status": "REPORTED" }`) — returns only matching incidents.
13. Run `query incident` with a valid ID the user owns — returns the incident details.
14. Run `query incident` with a valid ID another user owns (as OPERATOR) — returns `NotFoundException`.
15. Run `query incident` with a non-existent ID — returns `NotFoundException`.
16. Run `mutation updateIncidentStatus` to transition `REPORTED → IN_PROGRESS` — succeeds.
17. Run `mutation updateIncidentStatus` to transition `IN_PROGRESS → RESOLVED` — succeeds.
18. Run `mutation updateIncidentStatus` to transition `REPORTED → RESOLVED` — returns `BadRequestException` with a transition error message.
19. Run `mutation updateIncidentStatus` on an already `RESOLVED` incident — returns `BadRequestException` (terminal state).
20. Run `mutation updateIncidentStatus` as OPERATOR on an incident owned by another user — returns `NotFoundException`.
21. `npm run build -w services/incidents` passes with no TypeScript errors.
