import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  INVITATION_REPOSITORY,
  OTP_REPOSITORY,
  SMS_SERVICE,
  SUPPLIER_REPOSITORY,
} from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import type { SmsService } from '../../interfaces/services/sms.service';
import { OtpPurpose, OTP_TTL_MINUTES } from '../../domain/entities/otp';
import type { Otp } from '../../domain/entities/otp';
import { InvitationStatus } from '../../domain/entities/invitation';
import { ValidationError } from '../../errors/validation.error';
import type { SendOtpDto } from '../../../application/dtos/supplier/send-otp.dto';
import type { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';
import {
  generateCodeToken,
  generateOtpCode,
  normalizeCnPhone,
} from '../../utils';

@Injectable()
export class SendPhoneOtpUseCase extends BaseUseCase<SendOtpDto, CodeTokenDto> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    @Inject(SMS_SERVICE) private readonly sms: SmsService,
  ) {
    super();
  }

  async execute(dto: SendOtpDto): Promise<CodeTokenDto> {
    const phone = normalizeCnPhone(dto.phone);
    const existing = await this.suppliers.findByPhone(phone);

    let inviteCode: string | null = null;
    if (!existing) {
      if (!dto.invite?.trim()) {
        throw new ValidationError('An invitation code is required to sign up.');
      }
      const invite = await this.invitations.findByCode(dto.invite.trim());
      const usable =
        invite &&
        invite.status === InvitationStatus.ACTIVE &&
        (!invite.expiresAt || invite.expiresAt.getTime() > Date.now());
      if (!usable) {
        throw new ValidationError('That invitation is invalid or has expired.');
      }
      inviteCode = invite!.code;
    }

    const code = generateOtpCode();
    const codeToken = generateCodeToken();

    const otp: Otp = {
      codeToken,
      channelAddress: phone,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      codeHash: await this.auth.hashPassword(code),
      attempts: 0,
      verified: false,
      inviteCode,
      consumedAt: null,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    };
    await this.otps.create(otp);

    await this.sms.sendOtpCode({
      phone,
      code,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { codeToken, expiresInMinutes: OTP_TTL_MINUTES };
  }
}
