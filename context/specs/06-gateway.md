# Spec — Unit 6: GraphQL Gateway + Cross-Service Wiring

## Goal

Build the Apollo Federation Gateway (port 4000) that composes all five microservice schemas into a single GraphQL endpoint, and wire cross-service event flows so that incident creation and status changes automatically trigger notifications — giving the system a unified API surface and autonomous notification behaviour.

## Design Overview

| Component | Role |
|---|---|
| Gateway (`gateway/`) | Apollo Federation gateway that introspects and composes all service subgraph schemas. JWT validation at the gateway level. Single endpoint on port 4000. |
| Auth subgraph (port 4001) | Federated — registers `User` type with `@key(fields: "id")`. |
| Vehicles subgraph (port 4002) | Federated — registers `Vehicle` type with `@key(fields: "id")`. |
| Traffic subgraph (port 4003) | Federated — registers `Zone` type with `@key(fields: "id")`. |
| Incidents subgraph (port 4004) | Federated — registers `Incident` type with `@key(fields: "id")`. Calls Notification service via HTTP when incidents are created or status changes. |
| Notifications subgraph (port 4005) | Federated — registers `Notification` type with `@key(fields: "id")`. |

## Design Decisions

- **Gateway port**: `4000` — serves as the single entry point for all clients.
- **Federation version**: Apollo Federation 2 (`@apollo/subgraph` + `@apollo/gateway`).
- **Driver per service**: Switch from `ApolloDriver` to `ApolloFederationDriver`.
- **Gateway driver**: `ApolloGatewayDriver` with `IntrospectAndCompose` — the gateway introspects each subgraph and composes the supergraph schema automatically.
- **Auth at gateway**: The gateway validates JWT via `JwtAuthGuard` applied globally. Each service keeps its own guards as a fallback for direct-access scenarios (development only).
- **Cross-service notification wiring**: The Incident service gets a `NotificationClientService` that calls the Notification service's `createNotification` mutation via HTTP GraphQL — identical to the Traffic→Vehicle pattern. This avoids requiring an event bus or gateway-level resolvers.
- **Entity federation**: Each service's primary entity gains a `@key(fields: "id")` directive so Apollo Gateway can resolve entity references across services.
- **No breaking changes to existing resolvers**: Service resolvers continue to work as standalone apps. The federation changes are additive.
- **Environment**: Each service's `.env` gets a `NOTIFICATION_SERVICE_URL` var for the Incident service's HTTP client. The gateway reads `GATEWAY_PORT` (default 4000) and `AUTH_JWT_SECRET` for token validation.

## Implementation

### Part A — Update all services for Apollo Federation

Each of the five services requires the same two changes:

1. **Switch to `ApolloFederationDriver`** in `GraphQLModule.forRoot`.
2. **Add `@Directive('@key(fields: "id")')`** to the primary `@ObjectType` entity.

The per-service detail follows below.

#### A1. Auth service

**Install `@apollo/subgraph`** in `services/auth/`:

```bash
npm install @apollo/subgraph -w services/auth
```

**Update `services/auth/src/auth.module.ts`** — change `ApolloDriver` → `ApolloFederationDriver` and add federation config:

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
// ... other imports

@Module({
  imports: [
    // ...
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
    // ...
  ],
})
```

**Update `services/auth/src/entities/user.entity.ts`** — add `@Directive('@key(fields: "id")')`:

```typescript
import { Directive, Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

#### A2. Vehicle service

**Install `@apollo/subgraph`** in `services/vehicles/`:

```bash
npm install @apollo/subgraph -w services/vehicles
```

**Update `services/vehicles/src/vehicle.module.ts`** — switch to federation driver:

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

// In imports array:
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
```

**Update `services/vehicles/src/entities/vehicle.entity.ts`** — add `@Directive('@key(fields: "id")')`:

```typescript
import { Directive, Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Vehicle {
  @Field()
  id!: string;

  @Field()
  licensePlate!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  zoneId?: string;

  @Field()
  ownerId!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

#### A3. Traffic service

**Install `@apollo/subgraph`** in `services/traffic/`:

```bash
npm install @apollo/subgraph -w services/traffic
```

**Update `services/traffic/src/traffic.module.ts`** — switch to federation driver:

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

// In imports array:
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
```

**Update `services/traffic/src/entities/zone.entity.ts`** — add `@Directive('@key(fields: "id")')`:

```typescript
import { Directive, Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Zone {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  boundary?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

#### A4. Incident service

**Install `@apollo/subgraph`** in `services/incidents/`:

```bash
npm install @apollo/subgraph -w services/incidents
```

**Update `services/incidents/src/incident.module.ts`** — switch to federation driver:

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

// In imports array:
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
```

**Update `services/incidents/src/entities/incident.entity.ts`** — add `@Directive('@key(fields: "id")')`:

```typescript
import { Directive, Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Incident {
  // existing fields unchanged
}
```

#### A5. Notification service

**Install `@apollo/subgraph`** in `services/notifications/`:

```bash
npm install @apollo/subgraph -w services/notifications
```

**Update `services/notifications/src/notification.module.ts`** — switch to federation driver:

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

// In imports array:
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
```

**Update `services/notifications/src/entities/notification.entity.ts`** — add `@Directive('@key(fields: "id")')`:

```typescript
import { Directive, Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Notification {
  // existing fields unchanged
}
```

### Part B — Cross-service wiring: Incident → Notification

Add an HTTP GraphQL client to the Incident service that triggers a notification whenever an incident is created or its status changes. This follows the same pattern as the Traffic service's `VehicleClientService`.

**`services/incidents/src/providers/notification-client.service.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncidentType } from '../entities/incident-type.enum';
import { IncidentStatus } from '../entities/incident-status.enum';

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;

  constructor(config: ConfigService) {
    this.notificationServiceUrl =
      config.get<string>('NOTIFICATION_SERVICE_URL') ?? 'http://localhost:4005/graphql';
  }

  async notifyIncidentCreated(
    userId: string,
    incidentId: string,
    type: IncidentType,
    description: string,
  ) {
    const title = `Incident Reported: ${type}`;
    const message = `A ${type.toLowerCase().replace(/_/g, ' ')} incident has been reported: ${description}`;
    await this.sendNotification(userId, title, message, 'INCIDENT', incidentId);
  }

  async notifyIncidentStatusChanged(
    userId: string,
    incidentId: string,
    status: IncidentStatus,
  ) {
    const title = `Incident Status Updated`;
    const message = `Incident status has changed to ${status}.`;
    await this.sendNotification(userId, title, message, 'INCIDENT', incidentId);
  }

  private async sendNotification(
    userId: string,
    title: string,
    message: string,
    triggerType: string,
    triggerId: string,
  ) {
    try {
      const query = `
        mutation ($input: CreateNotificationInput!) {
          createNotification(input: $input) { id }
        }
      `;
      await fetch(this.notificationServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            input: { userId, title, message, triggerType, triggerId },
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to send notification for incident ${triggerId}`, error);
    }
  }
}
```

Note: The client sends HTTP requests without a JWT, matching the Traffic→Vehicle internal-call pattern. In production this would use an internal service token.

**Update `services/incidents/src/incident.service.ts`** — inject `NotificationClientService` and call it after `create` and `updateStatus`:

- Add `NotificationClientService` to the constructor.
- After creating an incident, fire `notifyIncidentCreated`.
- After updating status, fire `notifyIncidentStatusChanged`.

**Update `services/incidents/src/incident.module.ts`** — register `NotificationClientService` in the `providers` array.

**Add to `services/incidents/.env`**:

```env
NOTIFICATION_SERVICE_URL=http://localhost:4005/graphql
```

**Add to `.env.example`**:

```env
NOTIFICATION_SERVICE_URL=http://localhost:4005/graphql
```

### Part C — Gateway service

Scaffold a new NestJS app for the gateway:

```bash
npx @nestjs/cli new gateway --package-manager npm --skip-git --strict
```

Delete scaffold artifacts (`app.controller.ts`, `app.controller.spec.ts`, `app.service.ts`, `app.module.ts`, `test/`).

Replace `gateway/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Set up `gateway/package.json` with required dependencies:

```json
{
  "name": "gateway",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/config": "^4.0.1",
    "@nestjs/graphql": "^13.0.3",
    "@nestjs/apollo": "^13.0.3",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.5",
    "@apollo/gateway": "^2.9.3",
    "@apollo/subgraph": "^2.9.3",
    "apollo-server-express": "^3.13.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "graphql": "^16.10.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@types/node": "^24.0.0",
    "@types/passport-jwt": "^4.0.1",
    "typescript": "^5.7.3",
    "ts-node": "^10.9.2"
  }
}
```

Create directory structure:

```
gateway/src/
├── auth/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── gateway.module.ts
├── gateway.resolver.ts     (optional — for cross-service custom logic)
└── main.ts
```

**`gateway/src/auth/jwt-auth.guard.ts`:**

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

**`gateway/src/auth/roles.guard.ts`:**

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const ctx = GqlExecutionContext.create(context);
    const { role } = ctx.getContext().req.user;
    return requiredRoles.includes(role);
  }
}
```

**`gateway/src/gateway.module.ts`:**

```typescript
import { join } from 'path';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { IntrospectAndCompose } from '@apollo/gateway';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import ms from 'ms';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'auth', url: 'http://localhost:4001/graphql' },
            { name: 'vehicles', url: 'http://localhost:4002/graphql' },
            { name: 'traffic', url: 'http://localhost:4003/graphql' },
            { name: 'incidents', url: 'http://localhost:4004/graphql' },
            { name: 'notifications', url: 'http://localhost:4005/graphql' },
          ],
        }),
      },
      playground: true,
    }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('AUTH_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('AUTH_JWT_EXPIRATION') ?? '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
})
export class GatewayModule {}
```

Note: The gateway does not register the `JwtAuthGuard` globally — guards are applied to individual resolvers when needed, or can be registered as global guards via `APP_GUARD`. Since Apollo Gateway auto-generates the schema from subgraphs and has no resolvers of its own, auth is enforced at the subgraph level (each service validates JWT independently). The gateway's `JwtModule` and `PassportModule` are included so that any future gateway-level resolvers can reuse them.

**`gateway/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  await app.listen(process.env.GATEWAY_PORT ?? 4000);
}
void bootstrap();
```

**`gateway/.env`** (create, do not commit):

```env
GATEWAY_PORT=4000
AUTH_JWT_SECRET=dev-secret-change-in-production
AUTH_JWT_EXPIRATION=24h
```

`AUTH_JWT_SECRET` must match the same value used by all services so that the gateway can validate tokens.

### Part D — Root workspace updates

**Root `package.json`** — add gateway scripts:

```json
"build:gateway": "npm run build -w gateway",
"dev:gateway": "npm run start:dev -w gateway"
```

**`.env.example`** — add Gateway section:

```env
# Gateway
GATEWAY_PORT=4000

# Incident → Notification cross-service wiring
NOTIFICATION_SERVICE_URL=http://localhost:4005/graphql
```

## GraphQL API

After the gateway starts, a single `POST /graphql` is available at `http://localhost:4000/graphql`. All existing queries and mutations from all five services are available at this single endpoint.

Example — create an incident and receive a notification (triggered automatically):

```graphql
mutation CreateIncident($input: CreateIncidentInput!) {
  createIncident(input: $input) {
    id
    type
    status
    description
  }
}
```

After this mutation runs, the Incident service automatically calls the Notification service to create a notification for the incident reporter. Verify by querying notifications:

```graphql
query Notifications {
  notifications {
    id
    title
    message
    isRead
    triggerType
    triggerId
  }
}
```

## Dependencies

### Gateway runtime

| Package | Purpose |
|---|---|
| `@nestjs/config` | Environment variable loading |
| `@nestjs/graphql` | GraphQL module |
| `@nestjs/apollo` | Apollo driver integration for Gateway driver |
| `@apollo/gateway` | Apollo Gateway — schema composition and query planning |
| `@apollo/subgraph` | Subgraph support (needed by gateway for reference resolution) |
| `@nestjs/jwt` | JWT validation at gateway level |
| `@nestjs/passport` | Passport integration |
| `passport` | Authentication middleware |
| `passport-jwt` | JWT strategy |
| `apollo-server-express` | Apollo Server Express |
| `graphql` | GraphQL runtime |

### Per-service addition

| Service | Package |
|---|---|
| auth, vehicles, traffic, incidents, notifications | `@apollo/subgraph` |

### Incident service addition

| Package | Purpose |
|---|---|
| (none — uses native `fetch`) | HTTP GraphQL client for Notification service |

## Verification Checklist

1. `npm install` at root resolves all updated workspaces without errors.
2. Each service builds independently: `npm run build -w services/auth`, `npm run build -w services/vehicles`, `npm run build -w services/traffic`, `npm run build -w services/incidents`, `npm run build -w services/notifications`, `npm run build -w gateway`.
3. Start all five services on their respective ports.
4. Start the gateway on port 4000 — it composes all subgraph schemas without errors.
5. Open `http://localhost:4000/graphql` — the playground shows mutations/queries from all five services in the schema.
6. Register a user and log in via gateway: `mutation login` at `POST /graphql` on port 4000 returns a JWT.
7. Use that JWT to create an incident via the gateway: `mutation createIncident` succeeds.
8. Query notifications via the gateway: `query notifications` shows the auto-generated notification with `triggerType: INCIDENT`.
9. Update incident status via the gateway: `mutation updateIncidentStatus` succeeds.
10. Query notifications again — a second notification is present for the status change.
11. Query vehicles, zones, and density via the gateway — all return results.
12. `npm run build -w gateway` passes with no TypeScript errors.
