import type { User } from '../../domain/entities/user';
import { ForbiddenError } from '../../errors/forbidden.error';

/**
 * The gate every dealer payment passes through.
 *
 * Paying for an inspection or a car moves real money toward a real vehicle, so
 * the dealer must have cleared verification first. Mirrors the supplier-side
 * rule in `create-listing.usecase.ts`, which refuses to publish a listing from
 * an unverified store.
 *
 * TAKES A `User` ROW, NOT AN `AuthUser`. The `verified` claim in the JWT is
 * minted at login and never refreshed, so a dealer verified after their last
 * sign-in still carries `false` until their token rotates. Gating on the claim
 * would lock out exactly the people who just got approved. Callers must pass
 * the row they read from USER_REPOSITORY.
 */
export function requireVerifiedDealer(user: User | null | undefined): void {
  if (!user) throw new ForbiddenError('Account not found.');
  if (!user.verified) {
    throw new ForbiddenError(
      'Your account must be verified before you can pay. Complete your verification to continue.',
    );
  }
}
