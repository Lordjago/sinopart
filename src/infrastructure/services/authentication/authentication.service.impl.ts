/**
 * AuthenticationServiceImpl — the ADAPTER for the AuthenticationService port
 * ---------------------------------------------------------------------------
 * Supplies the auth primitives the core needs, using real libraries the core is
 * kept unaware of: bcrypt for password hashing and @nestjs/jwt for signing
 * tokens. Bound to the AUTHENTICATION_SERVICE token in service.module.
 *
 * Because the core depends only on the interface, swapping bcrypt→argon2 or
 * changing the JWT library means editing only this file.
 */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthenticationService } from '../../../core/interfaces/services/authentication.service';

// bcrypt "cost": higher = slower = harder to brute force. 10 is a sensible
// default that stays fast enough for logins.
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthenticationServiceImpl implements AuthenticationService {
  constructor(private readonly jwtService: JwtService) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  signToken(claims: Record<string, unknown>): string {
    // Secret + expiry come from JwtModule's config (see service.module).
    return this.jwtService.sign(claims);
  }
}
