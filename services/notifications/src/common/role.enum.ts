/**
 * File: role.enum.ts
 * -------------------
 * Enum defining the two supported user roles.
 * Used by RolesGuard and @Roles decorator for authorization.
 *
 * @returns {Role} - ADMIN for full access, OPERATOR for limited access.
 */
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}
