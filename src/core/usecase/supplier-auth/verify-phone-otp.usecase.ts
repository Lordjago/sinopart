/**
 * VerifyPhoneOtpUseCase — confirm the SMS code and issue a supplier token
 * (POST /supplier-auth/otp/verify)
 * ---------------------------------------------------------------------------
 * Composes the existing VerifyOtpUseCase (expiry, attempt cap, hash compare) and
 * adds the supplier-specific tail:
 *   1. the OTP must have purpose PHONE_VERIFICATION,
 *   2. on success, find-or-create the Supplier for that phone (consuming the
 *      invite that authorised a brand-new one),
 *   3. sign a JWT with role SELLER, and
 *   4. consume the OTP so the code can't be replayed.
 *
 * Passwordless: identity is the phone, proven by the code — there is no password.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INVITATION_REPOSITORY,
  OTP_REPOSITORY,
  SUPPLIER_REPOSITORY,
  AUTHENTICATION_SERVICE,
} from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { OtpPurpose } from '../../domain/entities/otp';
import {
  SupplierAccountStatus,
  SupplierTier,
} from '../../domain/entities/supplier';
import type { Supplier } from '../../domain/entities/supplier';
import { InvitationStatus } from '../../domain/entities/invitation';
import { UserRole } from '../../domain/entities/user';
import { ValidationError } from '../../errors/validation.error';
import type { SupplierAuthResponse } from '../../../application/dtos/supplier/auth.response';
import type { VerifyTokenDto } from '../../../application/dtos/otp/verify-token.dto';
import { VerifyOtpUseCase } from '../auth/verify-otp.usecase';

@Injectable()
export class VerifyPhoneOtpUseCase extends BaseUseCase<
  VerifyTokenDto,
  SupplierAuthResponse
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
    private readonly verifyOtp: VerifyOtpUseCase,
  ) {
    super();
  }

  async execute(dto: VerifyTokenDto): Promise<SupplierAuthResponse> {
    const otp = await this.otps.findByCodeToken(dto.codeToken);
    if (!otp || otp.purpose !== OtpPurpose.PHONE_VERIFICATION) {
      throw new ValidationError('That code is not right, or it has expired.');
    }

    // Delegate the code check itself (expiry, attempts, hash compare). Throws on
    // any failure; on success it marks the OTP verified.
    await this.verifyOtp.execute({
      codeToken: dto.codeToken,
      code: dto.code,
      expiresInMinutes: 0, // unused by the check; present to satisfy the DTO type
    });

    const phone = otp.channelAddress;
    let supplier = await this.suppliers.findByPhone(phone);

    // First-time sign-up: consume the invite and create the supplier.
    if (!supplier) {
      const invite = otp.inviteCode
        ? await this.invitations.findByCode(otp.inviteCode)
        : null;
      const usable =
        invite &&
        invite.status === InvitationStatus.ACTIVE &&
        (!invite.expiresAt || invite.expiresAt.getTime() > Date.now());
      if (!usable) {
        throw new ValidationError(
          'That invitation is no longer valid. Please start again.',
        );
      }

      const newSupplier: Supplier = {
        phone,
        storeName: invite.storeName?.trim() || 'New supplier',
        province: '', // completed later during KYC / profile
        tier: SupplierTier.NEW,
        accountStatus: SupplierAccountStatus.REGISTERED,
        invitedBy: invite.code,
        termsAcceptedAt: null,
      };
      supplier = await this.suppliers.create(newSupplier);
      await this.invitations.markConsumed(invite.code, supplier._id!);
    }

    // Burn the OTP so the same code can't be replayed.
    otp.consumedAt = new Date();
    await this.otps.update(otp);

    const storeVerified =
      supplier.accountStatus === SupplierAccountStatus.VERIFIED;

    const token = this.auth.signToken({
      sub: supplier._id,
      name: supplier.storeName,
      phone: supplier.phone,
      role: UserRole.SELLER,
      tier: supplier.tier,
      verified: storeVerified,
    });

    return { supplier, token, storeVerified };
  }
}
