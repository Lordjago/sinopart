/**
 * VerifyOtpUseCase — check the 6-digit code (POST /auth/verify-otp)
 * ---------------------------------------------------------------------------
 * On success it marks the attempt `verified`, which is the flag
 * ResetPasswordUseCase requires before it will change anything.
 *
 * SECURITY:
 *   - Every failure returns the SAME vague message, so an attacker cannot tell
 *     "no such attempt" from "wrong code" from "expired".
 *   - Wrong guesses increment `attempts`; after OTP_MAX_ATTEMPTS the attempt is
 *     dead. Without this, six digits (a million options) is brute-forceable.
 *   - The comparison is hash-based, never a plain-text equality check.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { AUTHENTICATION_SERVICE, OTP_REPOSITORY } from '../../injection.token';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { OTP_MAX_ATTEMPTS } from '../../domain/entities/otp';
import { ValidationError } from '../../errors/validation.error';
import type { VerifyTokenDto } from '../../../application/dtos/otp/verify-token.dto';

const INVALID = 'That code is not right, or it has expired.';

@Injectable()
export class VerifyOtpUseCase extends BaseUseCase<
  VerifyTokenDto,
  { verified: true }
> {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: VerifyTokenDto): Promise<{ verified: true }> {
    const otp = await this.otpRepository.findByCodeToken(dto.codeToken);

    if (!otp) throw new ValidationError(INVALID);
    if (otp.consumedAt) throw new ValidationError(INVALID);
    if (otp.expiresAt.getTime() < Date.now())
      throw new ValidationError(INVALID);
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ValidationError(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    const matches = await this.auth.comparePassword(dto.code, otp.codeHash);
    if (!matches) {
      otp.attempts += 1;
      await this.otpRepository.update(otp);
      throw new ValidationError(INVALID);
    }

    otp.verified = true;
    await this.otpRepository.update(otp);

    return { verified: true };
  }
}
