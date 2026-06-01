import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { PrismaService } from './providers/prisma.service';

/**
 * Service: AuthService
 * --------------------
 * Handles user registration, login, and profile retrieval.
 * Uses bcrypt for password hashing and JwtService for token signing.
 *
 * @returns {Object} - An object containing token and user data.
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

  /**
   * Login Service
   * -------------
   * Authenticates a user with email and password.
   * Verifies credentials, signs a JWT, and returns it with the user object.
   *
   * @param {LoginInput} input - The login input containing email and password.
   * @returns {Promise<{ token: string; user: User }>} - The signed JWT and authenticated user.
   * @throws {UnauthorizedException} - If credentials are invalid.
   */
  async login(input: LoginInput) {
    // ++++++++++ Step 1: Look up user by email +++++++++++
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ++++++++++ Step 2: Verify password against stored hash +++++++++++
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ++++++++++ Step 3: Sign a JWT for the authenticated user +++++++++++
    const token = this.jwt.sign({ sub: user.id, role: user.role });

    // ++++++++++ Step 4: Return token and user data +++++++++++
    return { token, user };
  }

  /**
   * Me Service
   * ----------
   * Retrieves the authenticated user's profile by their user ID.
   *
   * @param {string} userId - The UUID of the user to look up.
   * @returns {Promise<User>} - The user object.
   * @throws {NotFoundException} - If the user is not found.
   */
  async me(userId: string) {
    // ++++++++++ Step 1: Look up user by ID +++++++++++
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ++++++++++ Step 2: Return the user profile +++++++++++
    return user;
  }
}
