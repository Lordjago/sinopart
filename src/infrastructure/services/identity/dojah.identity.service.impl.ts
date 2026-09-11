/**
 * DojahIdentityServiceImpl: BVN/NIN lookups against Dojah.io
 * ---------------------------------------------------------------------------
 * The only file in the codebase that knows Dojah exists. Everything above the
 * port hands over a number and reads back an IdentityLookupResult.
 *
 * ERROR CONTRACT, and why it differs from the mail/Slack adapters: those
 * swallow failures because a dropped alert must not fail a user's request. An
 * identity check is load-bearing — if it did not happen, the caller must not be
 * allowed to record it as if it did. So this throws:
 *
 *   - ValidationError (-> 422) when Dojah rejects the NUMBER. User-correctable,
 *     and the message is safe to show.
 *   - a plain Error (-> 500, generic message, stack logged) for anything else:
 *     outage, timeout, bad credentials, malformed payload.
 *
 * NEVER log the identity number. Dojah's own reference and the last four digits
 * are enough to trace a call; the full BVN is exactly what must not end up in a
 * log aggregator.
 */
import { Logger } from '@nestjs/common';
import type {
  IdentityLookupResult,
  IdentityVerificationService,
} from '../../../core/interfaces/services/identity-verification.service';
import { ValidationError } from '../../../core/errors/validation.error';

export interface DojahConfig {
  /** Dojah application id, sent as the `AppId` header. */
  appId: string;
  /** Dojah secret key, sent RAW as `Authorization` — no `Bearer ` prefix. */
  privateKey: string;
  /** e.g. https://sandbox.dojah.io or https://api.dojah.io */
  baseUrl: string;
}

/** Dojah wraps every successful payload in an `entity` object. */
interface DojahEnvelope {
  entity?: Record<string, unknown> | null;
  error?: unknown;
}

/** Dojah is a third-party call on a user-facing request: fail fast. */
const TIMEOUT_MS = 15_000;

/** Only ever show the tail of an identity number, never the number. */
function last4(value: string): string {
  return value.slice(-4);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export class DojahIdentityServiceImpl implements IdentityVerificationService {
  private readonly logger = new Logger('IdentityVerification');

  constructor(private readonly config: DojahConfig) {}

  async lookupBvn(bvn: string): Promise<IdentityLookupResult> {
    return this.lookup('bvn', '/api/v1/kyc/bvn/advance', 'bvn', bvn);
  }

  async lookupNin(nin: string): Promise<IdentityLookupResult> {
    return this.lookup('nin', '/api/v1/kyc/nin/advance', 'nin', nin);
  }

  /**
   * The single transport seam. Everything vendor-shaped — URL, headers, status
   * handling, envelope unwrapping — lives here, so adding another Dojah check
   * later is a new one-line public method rather than more HTTP code.
   */
  private async lookup(
    tag: string,
    path: string,
    param: string,
    value: string,
  ): Promise<IdentityLookupResult> {
    // encodeURIComponent, not raw interpolation: the value reaches us from a
    // request body, and it has no business being able to shape the query.
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}${path}?${param}=${encodeURIComponent(value)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.config.privateKey,
          AppId: this.config.appId,
          'content-type': 'application/json',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // Transport failure: DNS, TLS, timeout. Not the user's fault.
      this.logger.error(
        `Dojah "${tag}" lookup failed for …${last4(value)}: ${(error as Error).message}`,
      );
      throw new Error(`Dojah ${tag} lookup failed`);
    }

    const body = (await res.json().catch(() => null)) as DojahEnvelope | null;

    if (!res.ok) {
      // Dojah answers a bad/unknown number with a 4xx. That is a real answer
      // about the input, so it becomes a 422 the dealer can act on. A 5xx is
      // our problem, not theirs.
      const reason = this.reasonFrom(body);
      this.logger.warn(
        `Dojah "${tag}" rejected …${last4(value)}: ${res.status} ${reason}`,
      );
      if (res.status >= 400 && res.status < 500) {
        throw new ValidationError(
          `We could not verify that ${tag.toUpperCase()}. Please check the number and try again.`,
        );
      }
      throw new Error(`Dojah ${tag} lookup failed: ${res.status}`);
    }

    const entity = body?.entity;
    if (!entity || typeof entity !== 'object') {
      // 200 with nothing in it: the number is not in the registry.
      this.logger.warn(
        `Dojah "${tag}" returned no entity for …${last4(value)}`,
      );
      return {
        found: false,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        phone: null,
        reference: null,
      };
    }

    const result: IdentityLookupResult = {
      found: true,
      firstName: str(entity.first_name),
      lastName: str(entity.last_name),
      dateOfBirth: str(entity.date_of_birth) ?? str(entity.dob),
      phone: str(entity.phone_number) ?? str(entity.phone_number1),
      reference: str(entity.reference) ?? str(entity.request_id),
    };

    // Note what is dropped on the floor: the /advance endpoints also return a
    // base64 photo, address, marital status and enrolment branch. We neither
    // need nor want to become the custodian of any of it.
    this.logger.log(
      `Dojah "${tag}" matched …${last4(value)} (ref: ${result.reference ?? 'none'})`,
    );
    return result;
  }

  private reasonFrom(body: DojahEnvelope | null): string {
    if (!body) return 'no body';
    if (typeof body.error === 'string') return body.error;
    if (body.error) return JSON.stringify(body.error);
    return 'unknown';
  }
}
