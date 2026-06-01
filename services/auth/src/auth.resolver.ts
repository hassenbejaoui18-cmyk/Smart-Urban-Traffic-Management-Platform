import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthPayload } from './entities/auth-payload.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
    // ++++++++++ Step 1: Delegate registration to Register Auth Service +++++++++++
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput) {
    // ++++++++++ Step 1: Delegate login to Login Auth Service +++++++++++
    return this.authService.login(input);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    // ++++++++++ Step 1: Delegate profile retrieval to me Auth Service +++++++++++
    return this.authService.me(user.id);
  }
}
