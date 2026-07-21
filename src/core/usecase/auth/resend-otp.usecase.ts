/**
 * ResendOtpUseCase — send a fresh code for an existing attempt
 * (POST /auth/resend-otp)
 * ---------------------------------------------------------------------------
 * Backs the "Resend code" button. It reuses the SAME codeToken, so the client
 * does not have to restart the flow, but rotates the code itself: a new hash, a
 * new expiry, `attempts` reset to 0, and `verified` back to false (the old code
 * must not stay valid).
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  MAIL_SERVICE,
  OTP_REPOSITORY,
} from '../../injection.token';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import type { MailService } from '../../interfaces/services/mail.service';
import { OTP_TTL_MINUTES } from '../../domain/entities/otp';
import { ValidationError } from '../../errors/validation.error';
import type { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';
import { generateOtpCode } from '../../utils';

@Injectable()
export class ResendOtpUseCase extends BaseUseCase<CodeTokenDto, CodeTokenDto> {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute(dto: CodeTokenDto): Promise<CodeTokenDto> {
    const otp = await this.otpRepository.findByCodeToken(dto.codeToken);

    if (!otp || otp.consumedAt) {
      throw new ValidationError(
        'This reset request is no longer valid. Please start again.',
      );
    }

    const code = generateOtpCode();
    otp.codeHash = await this.auth.hashPassword(code);
    otp.attempts = 0;
    otp.verified = false;
    otp.expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.otpRepository.update(otp);

    await this.mail.sendOtpCode({
      to: otp.email,
      code,
      purpose: otp.purpose,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { codeToken: otp.codeToken, expiresInMinutes: OTP_TTL_MINUTES };
  }
}
