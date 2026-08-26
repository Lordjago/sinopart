import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  OTP_REPOSITORY,
  SMS_SERVICE,
} from '../../injection.token';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import type { SmsService } from '../../interfaces/services/sms.service';
import { OtpPurpose, OTP_TTL_MINUTES } from '../../domain/entities/otp';
import { ValidationError } from '../../errors/validation.error';
import type { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';
// generateOtpCode is unimported while the static OTP below is in force.
// import { generateOtpCode } from '../../utils';

@Injectable()
export class ResendPhoneOtpUseCase extends BaseUseCase<
  CodeTokenDto,
  CodeTokenDto
> {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(SMS_SERVICE) private readonly sms: SmsService,
  ) {
    super();
  }

  async execute(dto: CodeTokenDto): Promise<CodeTokenDto> {
    const otp = await this.otps.findByCodeToken(dto.codeToken);
    if (
      !otp ||
      otp.consumedAt ||
      otp.purpose !== OtpPurpose.PHONE_VERIFICATION
    ) {
      throw new ValidationError(
        'This request is no longer valid. Please start again.',
      );
    }

    // TEMPORARY: no SMS provider is integrated yet, so a random code could
    // not be delivered and nobody could get through phone verification.
    // Every supplier OTP is the fixed code below. Everything else is
    // unchanged: it is still hashed, still expires, still attempt-capped.
    // TO REMOVE once SMS is live: delete the literal, uncomment the line
    // below, and restore the generateOtpCode import at the top of this file.
    const code = '890123';
    // const code = generateOtpCode();
    otp.codeHash = await this.auth.hashPassword(code);
    otp.attempts = 0;
    otp.verified = false;
    otp.expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.otps.update(otp);

    await this.sms.sendOtpCode({
      phone: otp.channelAddress,
      code,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { codeToken: otp.codeToken, expiresInMinutes: OTP_TTL_MINUTES };
  }
}
