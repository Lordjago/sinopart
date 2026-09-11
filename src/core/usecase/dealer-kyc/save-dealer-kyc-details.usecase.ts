/**
 * SaveDealerKycDetailsUseCase: the typed half of the wizard (POST /kyc/details)
 * ---------------------------------------------------------------------------
 * The importer's wizard saves as it goes, one step at a time, so this is a
 * MERGE: whatever the dealer just filled in is written and everything else is
 * left alone. Sending only an address must never blank out the BVN entered on
 * a previous visit.
 *
 * A dealer whose file is already approved, or is sitting with the back office,
 * cannot quietly edit it underneath the reviewer. They have to be bounced back
 * to ACTION (or refused) first.
 *
 * When a BVN/NIN is supplied it is also CHECKED against the registry before it
 * is stored, and every attempt is written to the identity_verifications log.
 * A mismatch is recorded rather than thrown: the number is still saved, the
 * file is flagged, and the back office decides. Only an unusable number (wrong
 * length, or one the registry rejects outright) stops the save.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  DEALER_KYC_REPOSITORY,
  IDENTITY_VERIFICATION_REPOSITORY,
  IDENTITY_VERIFICATION_SERVICE,
  USER_REPOSITORY,
} from '../../injection.token';
import type {
  DealerKycDetailsInput,
  DealerKycRepository,
} from '../../interfaces/repository/dealer-kyc.repository';
import type { IdentityVerificationRepository } from '../../interfaces/repository/identity-verification.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type {
  IdentityLookupResult,
  IdentityVerificationService,
} from '../../interfaces/services/identity-verification.service';
import {
  DealerIdType,
  EDITABLE_DEALER_KYC_STATUSES,
  IdVerificationStatus,
} from '../../domain/entities/dealer-kyc';
import { IdentityVerificationOutcome } from '../../domain/entities/identity-verification';
import { ValidationError } from '../../errors/validation.error';
import { matchesAccountName } from './identity-match';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

/** BVN and NIN are both 11 digits in Nigeria. */
const ID_LENGTH = 11;

export interface SaveDealerKycDetailsCommand extends DealerKycDetailsInput {
  userId: string;
}

@Injectable()
export class SaveDealerKycDetailsUseCase extends BaseUseCase<
  SaveDealerKycDetailsCommand,
  DealerKycStatusView
> {
  private readonly logger = new Logger('DealerKyc');

  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
    @Inject(IDENTITY_VERIFICATION_REPOSITORY)
    private readonly attempts: IdentityVerificationRepository,
    @Inject(IDENTITY_VERIFICATION_SERVICE)
    private readonly identity: IdentityVerificationService,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute({
    userId,
    ...details
  }: SaveDealerKycDetailsCommand): Promise<DealerKycStatusView> {
    const existing = await this.dealerKyc.ensureForUser(userId);
    if (!EDITABLE_DEALER_KYC_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'Your verification is with our team. You cannot change it while it is being reviewed.',
      );
    }

    let verification: IdVerificationStatus | null = null;
    let reference: string | null = null;

    if (details.idNumber !== undefined) {
      const digits = details.idNumber.replace(/\D/g, '');
      if (digits.length !== ID_LENGTH) {
        throw new ValidationError(
          `Your ${details.idType === DealerIdType.NIN ? 'NIN' : 'BVN'} is ${ID_LENGTH} digits.`,
        );
      }
      details.idNumber = digits;

      const checked = await this.verifyIdentity(
        userId,
        details.idType ?? existing.idType ?? DealerIdType.BVN,
        digits,
      );
      verification = checked.status;
      reference = checked.reference;
    }

    const saved = await this.dealerKyc.saveDetails(userId, details);

    if (verification) {
      const withVerification = await this.dealerKyc.saveIdVerification(userId, {
        status: verification,
        // Only stamp a pass. A later failed re-check must not erase the record
        // of a check that genuinely succeeded.
        verifiedAt:
          verification === IdVerificationStatus.VERIFIED
            ? new Date()
            : undefined,
        reference,
      });
      return toDealerKycStatusView(withVerification);
    }

    return toDealerKycStatusView(saved);
  }

  /**
   * Look the number up, compare it to the account, and log the attempt.
   *
   * Returns the status to stamp on the file. A provider outage propagates (the
   * dealer should retry, not be silently recorded as unverified), but a clean
   * "this number is not yours" is a recorded outcome, not an exception.
   */
  private async verifyIdentity(
    userId: string,
    idType: DealerIdType,
    digits: string,
  ): Promise<{ status: IdVerificationStatus; reference: string | null }> {
    const user = await this.users.findById(userId);

    let lookup: IdentityLookupResult;
    try {
      lookup =
        idType === DealerIdType.NIN
          ? await this.identity.lookupNin(digits)
          : await this.identity.lookupBvn(digits);
    } catch (error) {
      // Record the failed attempt before rethrowing, so an outage is visible in
      // the audit trail rather than leaving a silent gap.
      await this.attempts.record({
        userId,
        idType,
        idLast4: digits.slice(-4),
        outcome: IdentityVerificationOutcome.ERROR,
        reason: (error as Error).message,
        providerReference: null,
        payload: null,
        attemptedAt: new Date(),
      });
      throw error;
    }

    if (!lookup.found) {
      await this.attempts.record({
        userId,
        idType,
        idLast4: digits.slice(-4),
        outcome: IdentityVerificationOutcome.NOT_FOUND,
        reason: 'Registry has no record of this number.',
        providerReference: lookup.reference,
        payload: null,
        attemptedAt: new Date(),
      });
      return {
        status: IdVerificationStatus.NOT_FOUND,
        reference: lookup.reference,
      };
    }

    const match = matchesAccountName(
      user?.name ?? '',
      lookup.firstName,
      lookup.lastName,
    );

    await this.attempts.record({
      userId,
      idType,
      idLast4: digits.slice(-4),
      outcome: match.matched
        ? IdentityVerificationOutcome.VERIFIED
        : IdentityVerificationOutcome.MISMATCH,
      reason: match.reason,
      providerReference: lookup.reference,
      // Encrypted by the adapter. Only what a reviewer would need to adjudicate
      // a mismatch — the /advance photo and address are already discarded.
      payload: {
        firstName: lookup.firstName,
        lastName: lookup.lastName,
        dateOfBirth: lookup.dateOfBirth,
        phone: lookup.phone,
      },
      attemptedAt: new Date(),
    });

    if (!match.matched) {
      this.logger.warn(
        `Identity mismatch for ${userId} on ${idType} …${digits.slice(-4)}`,
      );
    }

    return {
      status: match.matched
        ? IdVerificationStatus.VERIFIED
        : IdVerificationStatus.MISMATCH,
      reference: lookup.reference,
    };
  }
}
