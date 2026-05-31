# Spec — Unit 1: Monorepo Scaffold + Auth Service

## Goal

Set up the npm workspaces monorepo structure and build the Authentication service with user registration, secure login returning a signed JWT, role-based access control (ADMIN / OPERATOR), and a reusable auth guard system — so that all subsequent services can protect their resolvers by sharing the same JWT secret and guard patterns.

## Design Decisions

- **Monorepo**: npm workspaces — root `package.json` has `workspaces: ["services/*", "gateway"]`. No Nx, no NestJS monorepo mode. Each service is a standalone NestJS application that can be developed and started independently.
- **Ports**: Auth runs on `4001`. Other services will increment: Vehicles `4002`, Traffic `4003`, Incidents `4004`, Notifications `4005`. Gateway will be `4000`.
- **Shared config**: Root `tsconfig.base.json` with `strict: true`. Each service extends it.
- **GraphQL**: Code-first with `@nestjs/graphql` + Apollo driver (`@nestjs/apollo`). Playground enabled in development.
- **Database**: Prisma ORM with PostgreSQL. `DATABASE_URL` read from `.env` via `@nestjs/config`. Each service has its own `prisma/schema.prisma` and Prisma client.
- **Auth mechanism**: JWT with HS256 algorithm. `@nestjs/jwt` for signing/verifying, `@nestjs/passport` + `passport-jwt` for the strategy integration. Secret injected via `JWT_SECRET` env variable.
- **Password hashing**: `bcrypt` with 12 salt rounds.
- **Validation**: `class-validator` + `class-transformer` on all `@InputType()` DTOs. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Error handling**: Global `ExceptionFilter` catches all exceptions and returns a consistent GraphQL error shape. Never exposes stack traces.
- **Naming**: Files `kebab-case`, classes `PascalCase`, resolvers suffixed with `Resolver`, services suffixed with `Service`, DTOs prefixed with domain action (e.g., `RegisterInput`, `LoginInput`).
- **Files**: All source files go directly under `src/` (no nested `src/auth/` directory — the module IS the service). Exceptions are entities in `src/entities/` and DTOs in `src/dto/`.

## Implementation

### 1. Root monorepo setup

**Files to create:**

```
smart-urban-traffic-management/
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TypeScript config
├── .env.example              # Documented env vars for all services
└── .gitignore                # Updated with workspace-aware entries
```

**Root `package.json`:**

```json
{
  "name": "smart-urban-traffic-management",
  "private": true,
  "workspaces": ["services/*", "gateway"],
  "scripts": {
    "build:auth": "npm run build -w services/auth",
    "dev:auth": "npm run start:dev -w services/auth"
  }
}
```

**`tsconfig.base.json`:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  }
}
```

**`.env.example`:**

```env
# Auth Service
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=change-me-to-a-random-secret
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001
```

**`.gitignore` additions:**

```gitignore
# Env files
.env
.env.local
.env.*.local

# Env example (keep the template but not real secrets)
!.env.example
```

### 2. Scaffold Auth service

Run `nest new services/auth --package-manager npm --skip-git --strict` inside the workspace root. Then adjust the generated files:

**`services/auth/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

**`services/auth/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.AUTH_PORT ?? 4001);
}
bootstrap();
```

### 3. Prisma schema and setup

**`services/auth/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("AUTH_DATABASE_URL")
}

enum Role {
  ADMIN
  OPERATOR
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role     @default(OPERATOR)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

**Generate Prisma client** — `npm run prisma:generate -w services/auth` (add `prisma:generate` script to the service's `package.json`: `"prisma:generate": "prisma generate"`).

Add to `services/auth/package.json` scripts:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "ts-node prisma/seed.ts"
```

### 4. Auth module — files

All files below live under `services/auth/src/`.

#### `auth.module.ts`

```typescript
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
        secret: config.get<string>('AUTH_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('AUTH_JWT_EXPIRATION') ?? '24h',
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [AuthResolver, AuthService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
```

#### `prisma.module.ts`

A small module that exports `PrismaService` (a wrapper around `PrismaClient` that extends it with `onModuleInit` and `enableShutdownHooks`).

#### `prisma.service.ts`

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

#### `auth.service.ts`

Public methods:

- `register(input: RegisterInput): Promise<{ token: string; user: User }>` — checks email uniqueness, hashes password with bcrypt (12 rounds), creates user with OPERATOR role by default, signs JWT with `{ sub: user.id, role: user.role }`, returns token + user.
- `login(input: LoginInput): Promise<{ token: string; user: User }>` — finds user by email, compares password with bcrypt, throws `UnauthorizedException` on mismatch, signs JWT, returns token + user.
- `me(userId: string): Promise<User>` — finds user by ID, throws `NotFoundException` if missing.

#### `auth.resolver.ts`

```typescript
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return this.authService.me(user.id);
  }
}
```

#### GraphQL types (`entities/`)

**`user.entity.ts`:**

```typescript
@ObjectType()
export class User {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field(() => Role)
  role: Role;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

**`auth-payload.entity.ts`:**

```typescript
@ObjectType()
export class AuthPayload {
  @Field()
  token: string;

  @Field(() => User)
  user: User;
}
```

GraphQL enums are generated from the Prisma enums. Create a mirror enum file:

**`entities/role.enum.ts`:**

```typescript
@registerEnumType(Role, { name: 'Role' })
export { Role };
```

#### DTOs (`dto/`)

**`register.input.ts`:**

```typescript
@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
```

**`login.input.ts`:**

```typescript
@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  password: string;
}
```

#### Auth guards

**`jwt-auth.guard.ts`:**

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**`jwt.strategy.ts`:**

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('AUTH_JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: Role }): Promise<User> {
    return { id: payload.sub, role: payload.role } as User;
  }
}
```

**`roles.guard.ts`:**

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

**`roles.decorator.ts`:**

```typescript
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
```

**`current-user.decorator.ts`:**

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    return context.switchToHttp().getRequest().user;
  },
);
```

### 5. Global exception filter

**`common/filters/graphql-exception.filter.ts`:**

```typescript
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: GqlArgumentsHost) {
    // Pass through GraphQL and HTTP exceptions as-is
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;
    // Wrap unknown errors
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
```

Register this filter in `AuthModule` as a global provider.

### 6. Seed script

**`prisma/seed.ts`:**

```typescript
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@smarttraffic.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return;

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: await bcrypt.hash('admin1234', 12),
      role: Role.ADMIN,
    },
  });

  console.log('Seeded admin user:', adminEmail);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Add to `services/auth/package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

### 7. Environment files

**`services/auth/.env`** (create, do not commit):

```env
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=dev-secret-do-not-use-in-production
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001
```

## Dependencies

### Runtime (install via `npm install` inside `services/auth/`)

| Package | Purpose |
|---|---|
| `@nestjs/config` | Environment variable loading and validation |
| `@nestjs/graphql` | GraphQL module for NestJS |
| `@nestjs/apollo` | Apollo driver integration for NestJS GraphQL |
| `@nestjs/jwt` | JWT signing and verification utilities |
| `@nestjs/passport` | Passport strategy integration |
| `passport` | Authentication middleware |
| `passport-jwt` | JWT strategy for Passport |
| `@prisma/client` | Prisma database client (generated) |
| `prisma` | Prisma CLI (dev dependency) |
| `bcrypt` | Password hashing |
| `class-validator` | DTO validation decorators |
| `class-transformer` | DTO transformation (ValidationPipe requires it) |
| `apollo-server-express` | Apollo Server Express (peer dependency of `@nestjs/apollo`) |
| `graphql` | GraphQL runtime |

### Dev dependencies (install via `npm install --save-dev`)

| Package | Purpose |
|---|---|
| `@types/bcrypt` | bcrypt TypeScript types |
| `@types/passport-jwt` | passport-jwt TypeScript types |
| `ts-node` | Run seed scripts and migrations |

## Verification Checklist

1. `npm install` at root resolves all workspaces without errors.
2. `npm run prisma:generate -w services/auth` generates the Prisma client without errors.
3. `AUTH_DATABASE_URL` points to a running PostgreSQL. Run `npm run prisma:migrate -w services/auth` — the `users` table is created with all columns and the `Role` enum.
4. `npm run prisma:seed -w services/auth` creates the admin user without errors.
5. `npm run start:dev -w services/auth` starts on port 4001 without errors.
6. Open GraphQL playground at `http://localhost:4001/graphql`.
7. Run `mutation register` with a valid email and password (8+ chars) — returns a JWT token and user object.
8. Run `mutation register` with the same email again — returns a validation or conflict error.
9. Run `mutation register` with an invalid email or short password — returns validation errors.
10. Run `mutation login` with the seeded admin credentials — returns a JWT token and user with role `ADMIN`.
11. Run `mutation login` with a wrong password — returns `UnauthorizedException`.
12. Run `query me` with the JWT from login in the `Authorization` header — returns the current user.
13. Run `query me` without a token — returns `UnauthorizedException`.
14. Run `query me` with an expired or tampered token — returns `UnauthorizedException`.
15. The `passwordHash` field is never returned in any GraphQL response.
