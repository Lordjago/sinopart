/**
 * ForgotPasswordUseCase — start a password reset (POST /auth/forgot-password)
 * ---------------------------------------------------------------------------
 * Issues a 6-digit code, stores only its HASH, emails the code, and returns the
 * `codeToken` handle the client uses for the next two steps.
 *
 * SECURITY — account enumeration: if the email has no account we still return a
 * perfectly normal-looking `codeToken` (a decoy) and send nothing. An attacker
 * therefore cannot use this endpoint to discover which emails are registered.
 * The decoy simply never verifies, because nothing was persisted.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  MAIL_SERVICE,
  OTP_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import type { MailService } from '../../interfaces/services/mail.service';
import { OtpPurpose, OTP_TTL_MINUTES } from '../../domain/entities/otp';
import type { Otp } from '../../domain/entities/otp';
import type { EmailDto } from '../../../application/dtos/auth/email.dto';
import { generateCodeToken, generateOtpCode } from '../../utils';
import { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';

@Injectable()
export class ForgotPasswordUseCase extends BaseUseCase<EmailDto, CodeTokenDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute(dto: EmailDto): Promise<CodeTokenDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      return {
        codeToken: generateCodeToken(),
        expiresInMinutes: OTP_TTL_MINUTES,
      };
    }

    const code = generateOtpCode();
    const codeToken = generateCodeToken();

    const otp: Otp = {
      codeToken,
      email: user.email,
      purpose: OtpPurpose.PASSWORD_RESET,
      codeHash: await this.auth.hashPassword(code),
      attempts: 0,
      verified: false,
      consumedAt: null,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    };
    await this.otpRepository.create(otp);

    await this.mail.sendOtpCode({
      to: user.email,
      code,
      purpose: OtpPurpose.PASSWORD_RESET,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { codeToken, expiresInMinutes: OTP_TTL_MINUTES };
  }
}
