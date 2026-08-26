/**
 * The row shapes the admin panel renders.
 * ---------------------------------------------------------------------------
 * These are VIEWS, not entities: each one flattens whatever the back office
 * needs onto a single object so a table can render without chasing references.
 * They live beside the admin use cases because they exist for those screens and
 * nothing else. The domain entities remain untouched by presentation needs.
 */
import type { InvitationStatus } from '../../domain/entities/invitation';
import type {
  ListingStatus,
  ProposedVehicle,
} from '../../domain/entities/listing';
import type {
  SupplierAccountStatus,
  SupplierOfficeAddress,
} from '../../domain/entities/supplier';
import type { UserRole } from '../../domain/entities/user';
import type {
  BankAccountView,
  KycDocumentStatus,
  KycDocumentType,
} from '../../domain/value-object/kyc';

/**
 * One account on the platform, whichever collection it lives in.
 *
 * Dealers, inspectors and admins are rows in `users`; suppliers are rows in
 * `suppliers` and never had a user record. The directory has to show all four
 * roles in one table, so this view is the common denominator, `source` says
 * which store the row came from, which is also what tells the panel which
 * actions apply to it.
 */
export interface UserView {
  id: string;
  source: 'user' | 'supplier';
  role: UserRole;
  /** The account holder's name, or the store name for a supplier. */
  name: string;
  business: string;
  email: string | null;
  phone: string | null;
  /**
   * A supplier's account status verbatim; for a user, 'active', the users
   * collection has no suspension concept yet, so there is nothing else to say.
   */
  status: SupplierAccountStatus | 'active';
  /** Has this account ever cleared KYC? */
  kycVerified: boolean;
  /** Suppliers only: they sent documents at least once. */
  kycSubmitted: boolean;
  tier: string;
  joinedAt?: Date;
}

/**
 * One person in full, for the screen an admin opens from the directory.
 *
 * Everything the row has, plus the parts that only matter once you are looking
 * at a single account: the store's KYC submission and its entire inventory for
 * a supplier, the email-confirmation state for a user. The listings are the
 * point of the page. "who is this store and what are they selling" is one
 * question, and answering it used to mean opening the directory, the KYC desk
 * and the listings table side by side.
 *
 * Fields that belong to only one source are present as null on the other rather
 * than absent, so the screen can render a fixed set of rows and let the empty
 * ones fall out.
 */
export interface UserDetailView extends UserView {
  /** Suppliers only: where the yard is. */
  province: string | null;
  /** Suppliers only: the registered office given at KYC. Null before that. */
  officeAddress: SupplierOfficeAddress | null;
  /** Suppliers only: the invitation code's issuer, if they came in through one. */
  invitedBy: string | null;
  /** Suppliers only: when they accepted the seller terms. */
  termsAcceptedAt: Date | null;
  /** Users only: has the sign-up address been confirmed by OTP? */
  emailVerified: boolean | null;
  /** Suppliers only: the same view the KYC desk reads, documents and all. */
  kyc: KycSubmissionView | null;
  /**
   * Suppliers only: every listing they own, any status, newest first.
   * Unpaginated on purpose: a store's inventory is small enough to read whole,
   * and the tallies below are only honest if the rows they describe are all here.
   */
  listings: AdminListingView[];
  /** `{ draft: 3, available: 11, … }`, over the listings above. */
  listingCounts: Record<string, number>;
  updatedAt?: Date;
}

/** One document as a reviewer sees it. */
export interface KycDocumentView {
  type: KycDocumentType;
  /** Missing means never uploaded: the reviewer has nothing to open. */
  state: 'missing' | KycDocumentStatus;
  url: string | null;
  filename: string | null;
  mimeType: string | null;
  /** True for a PDF; the panel frames those instead of rendering an <img>. */
  isPdf: boolean;
  reason: string | null;
  reviewedBy: string | null;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
}

/** One store in the KYC queue, with everything the review screen needs. */
export interface KycSubmissionView {
  supplierId: string;
  storeName: string;
  legalName: string | null;
  phone: string;
  province: string;
  contactEmail: string | null;
  /** The registered office, read against the business licence. Null if the
   *  store has not reached the submit step yet. */
  officeAddress: SupplierOfficeAddress | null;
  accountStatus: SupplierAccountStatus;
  submittedAt: Date | null;
  /** The three reviewable documents, always all three, missing ones included. */
  documents: KycDocumentView[];
  /** Display-safe payout account: the fourth thing submitted, not reviewable. */
  bank: BankAccountView | null;
  approvedCount: number;
  pendingCount: number;
  /** Every required document approved: the store is (or is about to be) live. */
  fullyApproved: boolean;
}

/** One listing in the back-office table. */
export interface AdminListingView {
  id: string;
  status: ListingStatus;
  title: string;
  vin: string | null;
  body: string | null;
  mileageKm: number | null;
  fobPrice: number | null;
  province: string | null;
  photos: string[];
  supplierId: string;
  /** Resolved from the supplier, so the table needs no second call. */
  storeName: string;
  supplierStatus: SupplierAccountStatus | null;
  /** Field labels still missing before this could ever go live. */
  missingForPublish: string[];
  /**
   * Set when the supplier could not find their car in the catalog and typed it
   * instead. Such a listing can sit in the queue but can never be published:
   * an admin adds the entry to the catalog, then sends the car back so the
   * store can pick the real one.
   */
  proposedVehicle: ProposedVehicle | null;
  reviewNote: string | null;
  submittedAt: Date | null;
  publishedAt: Date | null;
  createdAt?: Date;
}

/**
 * One listing in full, for the screen an admin reads BEFORE publishing it.
 *
 * Everything the table row has, plus the fields that actually decide the
 * question: all the photos, the full spec, and the store behind it. The
 * catalog identity is resolved to names here (`make`, `model`, the spec line)
 * because the listing stores only a vehicle id, and "2023 BYD Han" is what a
 * reviewer needs to check the photos against, not an ObjectId.
 */
export interface AdminListingDetailView extends AdminListingView {
  make: string | null;
  model: string | null;
  year: number | null;
  variant: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  seats: number | null;
  doors: number | null;
  firstRegistered: string | null;
  features: string[];
  /** Walkaround clips. A reviewer watching one learns more than five stills. */
  videos: string[];
  /** The owning store, for the "is this a store we trust" half of the call. */
  supplier: {
    id: string;
    storeName: string;
    legalName: string | null;
    phone: string;
    province: string;
    accountStatus: SupplierAccountStatus;
    tier: string;
    /** Registered office. Null until the store submits for verification, so a
     *  registered-but-unverified store shows no address rather than a blank. */
    officeAddress: SupplierOfficeAddress | null;
  } | null;
  updatedAt?: Date;
}

/** One invitation in the back-office table. */
export interface InvitationView {
  id: string;
  code: string;
  storeName: string | null;
  status: InvitationStatus;
  /** True when an ACTIVE invite is past its expiry, see isInvitationExpired. */
  expired: boolean;
  issuedBy: string;
  /** The admin's name, resolved from `issuedBy`. Null for legacy rows. */
  issuedByName: string | null;
  consumedBySupplierId: string | null;
  /** The store that redeemed it, resolved for the table. */
  consumedByStore: string | null;
  /**
   * When it was redeemed. An invitation is only ever written again to consume
   * or revoke it, so `updatedAt` on a consumed row IS the redemption time.
   */
  consumedAt: Date | null;
  expiresAt: Date | null;
  createdAt?: Date;
}
