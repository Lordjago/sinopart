/**
 * VerifyEmailUseCase: confirm the sign-up email with the 6-digit code
 * (POST /auth/verify-email, authenticated)
 * ---------------------------------------------------------------------------
 * Composes the existing VerifyOtpUseCase rather than duplicating its checks
 * (expiry, attempt cap, hash comparison). This use case adds only what is
 * specific to email confirmation:
 *
 *   1. the OTP must have been issued for EMAIL_VERIFICATION, and
 *   2. it must belong to the signed-in user's own email, so a code issued for
 *      someone else can never confirm your address, and
 *   3. on success, flip `emailVerified`, consume the attempt, and send the
 *      welcome email that points at dealer verification.
 */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  MAIL_SERVICE,
  OTP_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { MailService } from '../../interfaces/services/mail.service';
import { welcomeTemplate } from '../../mail/welcome.template';
import { OtpPurpose } from '../../domain/entities/otp';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { VerifyOtpUseCase } from './verify-otp.usecase';

export interface VerifyEmailInput {
  userId: string;
  codeToken: string;
  code: string;
}

@Injectable()
export class VerifyEmailUseCase extends BaseUseCase<
  VerifyEmailInput,
  { emailVerified: true }
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly verifyOtp: VerifyOtpUseCase,
  ) {
    super();
  }

  async execute(input: VerifyEmailInput): Promise<{ emailVerified: true }> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new ResourceNotFoundError('Account not found.');
    }
    if (user.emailVerified) {
      return { emailVerified: true }; // already done; treat as success
    }

    const otp = await this.otpRepository.findByCodeToken(input.codeToken);
    if (
      !otp ||
      otp.purpose !== OtpPurpose.EMAIL_VERIFICATION ||
      otp.channelAddress !== user.email
    ) {
      throw new ValidationError('That code is not right, or it has expired.');
    }

    // Delegate the code check itself (expiry, attempts, hash compare).
    await this.verifyOtp.execute({
      codeToken: input.codeToken,
      code: input.code,
      expiresInMinutes: 0, // unused by the check; present to satisfy the DTO type
    });

    await this.userRepository.markEmailVerified(user._id!);

    // Burn the attempt so the same code cannot be replayed.
    otp.consumedAt = new Date();
    await this.otpRepository.update(otp);

    /* Welcome them in. Deliberately not awaited: the dealer is watching a
       spinner on the code screen, and nothing about their account depends on
       this mail landing. A send failure is logged by the transport rather than
       surfaced as a failed verification. */
    this.mail.send(welcomeTemplate({ to: user.email, name: user.name }));

    return { emailVerified: true };
  }
}
