/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  MAIL_SERVICE,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import type { MailService } from '../../interfaces/services/mail.service';
import { newSignInTemplate } from '../../mail/new-signin.template';
import { describeUserAgent } from '../../utils';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { AuthResponse } from '../../../application/dtos/auth/auth.response';
import type { LoginDto } from '../../../application/dtos/auth/login.dto';

/**
 * Where the sign-in came from, read off the request by the controller.
 *
 * Optional throughout: the use case is also called from places with no HTTP
 * request to hand, and a missing user agent should never fail a login.
 */
export interface SignInContext {
  userAgent?: string;
  /** Reserved: there is no GeoIP lookup yet, so this is currently never set. */
  location?: string;
}

@Injectable()
export class AuthenticateUserUseCase extends BaseUseCase<
  LoginDto & SignInContext,
  AuthResponse
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute(dto: LoginDto & SignInContext): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedError('Email or password is wrong.');
    }

    const matches = await this.auth.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!matches) {
      throw new UnauthorizedError('Email or password is wrong.');
    }

    const publicUser = UserMapper.toPublic(user);
    const token = this.auth.signToken({
      sub: publicUser.id,
      name: publicUser.name,
      email: publicUser.email,
      role: publicUser.role,
      tier: publicUser.tier,
      verified: publicUser.verified,
    });

    /* Security notice. Not awaited: a sign-in must not wait on, or fail
       because of, an email.

       Note this fires on EVERY sign-in, not only unrecognised ones — we do
       not fingerprint devices yet, so there is nothing to compare against.
       Worth revisiting: a notice that arrives every single time is one people
       learn to ignore, which is the opposite of what it is for. */
    this.mail.send(
      newSignInTemplate({
        to: publicUser.email,
        device: describeUserAgent(dto.userAgent),
        location: dto.location,
      }),
    );

    return { user: publicUser, token };
  }
}
