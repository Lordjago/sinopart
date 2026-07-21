/**
 * UsersSeeder — creates a demo dealer on first boot
 * ---------------------------------------------------------------------------
 * Seeds one verified dealer so you can log in immediately without registering:
 *
 *     email:    dealer@sinopart.test
 *     password: password123
 *
 * Idempotent (skips if the user already exists). It depends on the
 * USER_REPOSITORY and AUTHENTICATION_SERVICE ports — hashing the password
 * through the same adapter the login flow uses. Remove this in production; you
 * never want a known-password account in a real deployment.
 */
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AUTHENTICATION_SERVICE,
  USER_REPOSITORY,
} from '../../../../core/injection.token';
import { UserRole, UserTier } from '../../../../core/domain/entities/user';
import type { User } from '../../../../core/domain/entities/user';
import type { UserRepository } from '../../../../core/interfaces/repository/user.repository';
import type { AuthenticationService } from '../../../../core/interfaces/services/authentication.service';

const DEMO_EMAIL = 'dealer@sinopart.test';
const DEMO_PASSWORD = 'password123';

@Injectable()
export class UsersSeeder implements OnModuleInit {
  private readonly logger = new Logger('UsersSeeder');

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.userRepository.findByEmail(DEMO_EMAIL);
    if (existing) {
      this.logger.log('Demo dealer already exists — skipping seed.');
      return;
    }

    const passwordHash = await this.auth.hashPassword(DEMO_PASSWORD);
    const demo: User = {
      name: 'Umar Ishola',
      business: 'Ishola Motors',
      email: DEMO_EMAIL,
      phone: '+234 800 000 0000',
      passwordHash,
      role: UserRole.BUYER,
      tier: UserTier.TIER_1,
      verified: true,
      emailVerified: true,
    };
    await this.userRepository.create(demo);
    this.logger.log(`Seeded demo dealer (${DEMO_EMAIL} / ${DEMO_PASSWORD}).`);
  }
}
