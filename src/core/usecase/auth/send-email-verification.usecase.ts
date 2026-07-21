/**
 * SendEmailVerificationUseCase — email a sign-up confirmation code
 * (POST /auth/send-verification, authenticated)
 * ---------------------------------------------------------------------------
 * Runs right after registration, when the client already holds a JWT. Because
 * the caller is authenticated we take the user id from the token rather than an
 * email in the body — so nobody can use this endpoint to spam arbitrary
 * addresses.
 *
 * Mirrors ForgotPasswordUseCase, but stamps the OTP with
 * `OtpPurpose.EMAIL_VERIFICATION` so the two flows can never be crossed.
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
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';
import { generateCodeToken, generateOtpCode } from '../../utils';

@Injectable()
export class SendEmailVerificationUseCase extends BaseUseCase<
  string,
  CodeTokenDto
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute(userId: string): Promise<CodeTokenDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundError('Account not found.');
    }
    if (user.emailVerified) {
      throw new ValidationError('Your email is already verified.');
    }

    const code = generateOtpCode();
    const codeToken = generateCodeToken();

    const otp: Otp = {
      codeToken,
      email: user.email,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
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
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { codeToken, expiresInMinutes: OTP_TTL_MINUTES };
  }
}
