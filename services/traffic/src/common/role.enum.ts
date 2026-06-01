/**
 * File: role.enum.ts
 * -------------------
 * Local role enum matching Auth service roles.
 * Used by guards and decorators for authorization.
 *
 * @returns {Role}
 */
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}
