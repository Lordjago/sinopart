/**
 * ResetPasswordUseCase — set the new password (POST /auth/reset-password)
 * ---------------------------------------------------------------------------
 * The critical guard is `if (!otp.verified)`. Without it, anyone holding a
 * codeToken could change a password WITHOUT ever knowing the 6-digit code —
 * which would make the whole OTP step decorative. This is exactly the check that
 * makes the "codeToken-only" reset DTO safe.
 *
 * After a successful reset the attempt is consumed (single-use), so the same
 * codeToken cannot reset the password twice.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  AUTHENTICATION_SERVICE,
  OTP_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { OtpRepository } from '../../interfaces/repository/otp.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { ValidationError } from '../../errors/validation.error';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import type { ResetPasswordDto } from '../../../application/dtos/auth/reset-password.dto';

@Injectable()
export class ResetPasswordUseCase extends BaseUseCase<
  ResetPasswordDto,
  { updated: true }
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: OtpRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: ResetPasswordDto): Promise<{ updated: true }> {
    const otp = await this.otpRepository.findByCodeToken(dto.codeToken);

    if (!otp || otp.consumedAt || otp.expiresAt.getTime() < Date.now()) {
      throw new ValidationError(
        'This reset request is no longer valid. Please start again.',
      );
    }
    // The code must have been proven first.
    if (!otp.verified) {
      throw new ValidationError(
        'Please verify your code before setting a new password.',
      );
    }

    const user = await this.userRepository.findByEmail(otp.email);
    if (!user) {
      throw new ResourceNotFoundError('Account not found.');
    }

    const passwordHash = await this.auth.hashPassword(dto.password);
    await this.userRepository.updatePassword(user._id!, passwordHash);

    // Burn the attempt so it cannot be replayed.
    otp.consumedAt = new Date();
    await this.otpRepository.update(otp);

    return { updated: true };
  }
}
