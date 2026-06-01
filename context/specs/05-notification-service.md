# Spec — Unit 5: Notification Service

## Goal

Build the Notification microservice (port 4005) with notification dispatch, listing, and read/unread tracking — all protected by JWT authentication from Unit 1 — so that authenticated users can view their notifications triggered by incidents and congestion alerts, mark individual notifications as read, and bulk-mark all as read.

## Design Decisions

- **Port**: `4005` — consistent with the port plan (Auth 4001, Vehicles 4002, Traffic 4003, Incidents 4004, Notifications 4005).
- **File structure**: Matches previous services — layered `src/` with `guards/`, `decorators/`, `strategies/`, `providers/`, `entities/`, `dto/`, `common/`, and `prisma/`.
- **GraphQL**: Code-first, same `@nestjs/graphql` + `@nestjs/apollo` setup. Playground enabled in development.
- **Guards**: Local copies of `JwtAuthGuard` and `RolesGuard`. JWT secret read from `NOTIFICATION_JWT_SECRET` env var — must match `AUTH_JWT_SECRET`.
- **Database**: Prisma v6 with its own PostgreSQL database (`smart_traffic_notification`).
- **TriggerType enum**: `INCIDENT`, `ZONE_ALERT` — indicates what caused the notification.
- **Notification model**: id, userId, title, message, isRead (default false), triggerType, triggerId, createdAt.
- **No updatedAt**: Notifications are immutable after creation. Only `isRead` changes state.
- **Ownership**: Notifications are scoped to the recipient user (`userId`). Users see only their own notifications. ADMIN users may read or create notifications for any user.
- **Create endpoint**: `createNotification` is ADMIN-only — used for testing and will be called by the Gateway (Unit 6) when incidents/zone alerts trigger notifications.
- **Bulk read**: `markAllNotificationsAsRead` marks all unread notifications for the authenticated user as read.
- **Filtering**: Notifications can be filtered by `isRead` status.
- **Validation**: Same `class-validator` patterns as previous services.
- **Error handling**: Reuses the same `GraphqlExceptionFilter` pattern. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Naming**: Files `kebab-case`, classes `PascalCase`, GraphQL fields `camelCase`, DB columns `snake_case`.
- **No seed script needed** — notifications are created through the API.

## Implementation

### 1. Scaffold Notification service

Run from the repo root:

```bash
npx @nestjs/cli new services/notifications --package-manager npm --skip-git --strict
```

Delete the generated `app.controller.ts`, `app.controller.spec.ts`, `app.service.ts`, `app.module.ts`, and the `test/` directory.

Replace `services/notifications/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Set `"private": true` in `services/notifications/package.json` (already true from scaffold).

**`services/notifications/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.NOTIFICATION_PORT ?? 4005);
}
void bootstrap();
```

### 2. Prisma schema

**`services/notifications/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("NOTIFICATION_DATABASE_URL")
}

enum TriggerType {
  INCIDENT
  ZONE_ALERT
}

model Notification {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  title       String
  message     String      @db.Text
  isRead      Boolean     @default(false) @map("is_read")
  triggerType TriggerType @map("trigger_type")
  triggerId   String      @map("trigger_id")
  createdAt   DateTime    @default(now()) @map("created_at")

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

Key schema decisions:
- `TriggerType` enum — `INCIDENT`, `ZONE_ALERT`.
- `isRead` defaults to `false` — new notifications are always unread.
- `userId` and `triggerId` are stored as strings — no foreign key constraints since users and triggers live in other services' databases.
- `@@index([userId, isRead])` — optimises "my unread notifications" queries.
- `@@index([userId, createdAt])` — optimises chronological listing per user.
- No `updatedAt` — notifications are append-only except for the `isRead` toggle.
- No `onDelete` cascade — notifications are preserved as audit records even if the triggering incident is deleted.

Add Prisma scripts to `services/notifications/package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "echo 'No seed needed for notification service'"
```

### 3. Prisma module and service

Identical to previous services — create `providers/prisma.module.ts` and `providers/prisma.service.ts`.

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

**`entities/trigger-type.enum.ts`** — re-export the Prisma enum for GraphQL:

```typescript
import { registerEnumType } from '@nestjs/graphql';
import { TriggerType } from '@prisma/client';

registerEnumType(TriggerType, { name: 'TriggerType' });

export { TriggerType };
```

**`entities/notification.entity.ts`:**

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import { TriggerType } from './trigger-type.enum';

@ObjectType()
export class Notification {
  @Field()
  id!: string;

  @Field()
  userId!: string;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field()
  isRead!: boolean;

  @Field(() => TriggerType)
  triggerType!: TriggerType;

  @Field()
  triggerId!: string;

  @Field()
  createdAt!: Date;
}
```

### 5. DTOs

**`dto/create-notification.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TriggerType } from '../entities/trigger-type.enum';

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsString()
  userId!: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @Field()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  message!: string;

  @Field(() => TriggerType)
  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @Field()
  @IsString()
  triggerId!: string;
}
```

**`dto/notification-filter.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class NotificationFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  isRead?: boolean;
}
```

### 6. Auth guards

Copy the same guard/decorator files from previous services, adapted to read `NOTIFICATION_JWT_SECRET`:

- **`guards/jwt-auth.guard.ts`** — identical to Auth's `JwtAuthGuard` (extends `AuthGuard('jwt')`).
- **`strategies/jwt.strategy.ts`** — reads `NOTIFICATION_JWT_SECRET` from ConfigService.

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
      secretOrKey: config.get<string>('NOTIFICATION_JWT_SECRET')!,
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

**`common/filters/graphql-exception.filter.ts`** — identical to previous services:

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

### 8. Notification service

**`notification.service.ts`:**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from './common/role.enum';
import { PrismaService } from './providers/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    title: string;
    message: string;
    triggerType: string;
    triggerId: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        triggerType: input.triggerType,
        triggerId: input.triggerId,
      },
    });
  }

  async findAll(
    filter: { isRead?: boolean } | null,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const where: Record<string, unknown> = {};

    if (currentUserRole === Role.ADMIN) {
      if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    } else {
      where.userId = currentUserId;
      if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, currentUserId: string, currentUserRole: Role) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    if (
      currentUserRole !== Role.ADMIN &&
      notification.userId !== currentUserId
    ) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(currentUserId: string) {
    await this.prisma.notification.updateMany({
      where: { userId: currentUserId, isRead: false },
      data: { isRead: true },
    });
    return this.prisma.notification.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

Ownership and authorization logic:
- `create` — ADMIN only (called from resolver). In Unit 6 the Gateway will call this when incidents/zone alerts are created.
- `findAll` — ADMIN sees all notifications (optionally filtered by `isRead`). OPERATOR sees only their own.
- `markAsRead` — ADMIN can mark any notification as read. OPERATOR can only mark their own. `NotFoundException` for notifications the user does not own (hides existence from unauthorized users, consistent with previous services).
- `markAllAsRead` — OPERATOR-only convenience method that updates all unread notifications belonging to the current user. ADMIN can use the filtered `findAll` + per-item `markAsRead` for bulk operations.

### 9. Notification resolver

**`notification.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateNotificationInput } from './dto/create-notification.input';
import { NotificationFilterInput } from './dto/notification-filter.input';
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { NotificationService } from './notification.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Resolver(() => Notification)
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @Mutation(() => Notification)
  @Roles(Role.ADMIN)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ) {
    return this.notificationService.create(input);
  }

  @Query(() => [Notification])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async notifications(
    @Args('filter', { nullable: true }) filter: NotificationFilterInput | null,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.findAll(
      filter,
      user.sub,
      user.role as Role,
    );
  }

  @Mutation(() => Notification)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async markNotificationAsRead(
    @Args('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.markAsRead(id, user.sub, user.role as Role);
  }

  @Mutation(() => [Notification])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async markAllNotificationsAsRead(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.markAllAsRead(user.sub);
  }
}
```

### 10. Notification module

**`notification.module.ts`:**

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
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
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
        secret: config.get<string>('NOTIFICATION_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('NOTIFICATION_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    NotificationResolver,
    NotificationService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class NotificationModule {}
```

### 11. Environment file

**`services/notifications/.env`** (create, do not commit):

```env
NOTIFICATION_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_notification
NOTIFICATION_JWT_SECRET=dev-secret-change-in-production
NOTIFICATION_JWT_EXPIRATION=24h
NOTIFICATION_PORT=4005
```

`NOTIFICATION_JWT_SECRET` must match `AUTH_JWT_SECRET` so that tokens signed by the Auth service are accepted by the Notification service.

Update `.env.example` at repo root to include Notification service variables:

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

# Notification Service
NOTIFICATION_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_notification
NOTIFICATION_JWT_SECRET=change-me-to-a-random-secret
NOTIFICATION_JWT_EXPIRATION=24h
NOTIFICATION_PORT=4005
```

### 12. Root package.json scripts

Add to root `package.json`:

```json
"build:notifications": "npm run build -w services/notifications",
"dev:notifications": "npm run start:dev -w services/notifications"
```

## GraphQL API

### `createNotification` (mutation — ADMIN only)

```graphql
mutation CreateNotification($input: CreateNotificationInput!) {
  createNotification(input: $input) {
    id
    userId
    title
    message
    isRead
    triggerType
    triggerId
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "userId": "<user-uuid>",
    "title": "Accident Reported on Highway 101",
    "message": "An accident has been reported near exit 5. Please proceed with caution.",
    "triggerType": "INCIDENT",
    "triggerId": "<incident-uuid>"
  }
}
```

### `notifications` (query)

```graphql
query Notifications($filter: NotificationFilterInput) {
  notifications(filter: $filter) {
    id
    title
    message
    isRead
    triggerType
    triggerId
    createdAt
  }
}
```

Variables:
```json
{ "filter": { "isRead": false } }
```

Filter can be omitted to get all notifications for the current user.

### `markNotificationAsRead` (mutation)

```graphql
mutation MarkNotificationAsRead($id: String!) {
  markNotificationAsRead(id: $id) {
    id
    isRead
  }
}
```

### `markAllNotificationsAsRead` (mutation)

```graphql
mutation MarkAllNotificationsAsRead {
  markAllNotificationsAsRead {
    id
    title
    isRead
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

1. `npm install` at root resolves the new `services/notifications` workspace without errors.
2. `npm run prisma:generate -w services/notifications` generates the Prisma client with `Notification` model and `TriggerType` enum.
3. Create the `smart_traffic_notification` database. Run `npm run prisma:migrate -w services/notifications` — the `notifications` table is created with all columns and indexes.
4. `npm run start:dev -w services/notifications` starts on port 4005 without errors.
5. Open GraphQL playground at `http://localhost:4005/graphql`.
6. Run `mutation createNotification` *without* an `Authorization` header — returns an authentication error.
7. Run `mutation createNotification` with an OPERATOR JWT — returns a `FORBIDDEN` error (ADMIN-only).
8. Run `mutation createNotification` with an ADMIN JWT — returns the created notification with `isRead: false`.
9. Run `mutation createNotification` with a title shorter than 3 characters — returns a validation error.
10. Run `query notifications` as OPERATOR — returns only that user's notifications.
11. Run `query notifications` as ADMIN — returns all notifications across all users.
12. Run `query notifications` with `{ "isRead": false }` filter — returns only unread notifications.
13. Run `mutation markNotificationAsRead` with a valid ID the user owns — returns the notification with `isRead: true`.
14. Run `mutation markNotificationAsRead` with a valid ID another user owns (as OPERATOR) — returns `NotFoundException`.
15. Run `mutation markNotificationAsRead` with a non-existent ID — returns `NotFoundException`.
16. Create multiple notifications, then run `mutation markAllNotificationsAsRead` as OPERATOR — all notifications for that user have `isRead: true`.
17. `npm run build -w services/notifications` passes with no TypeScript errors.
