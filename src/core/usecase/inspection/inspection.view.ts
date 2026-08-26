/**
 * The shape all three apps read an inspection through.
 *
 * One view, not three, on purpose: the buyer's tracking screen, the store's
 * request list and the back office's queue are the same facts seen from
 * different sides. Where a side needs less (a buyer has no business reading the
 * store's phone number) the field is simply absent from what the caller passes
 * in, rather than a different shape per audience.
 */
import { collectAdvisories } from '../../domain/entities/inspection';
import type {
  Inspection,
  InspectionAdvisory,
  InspectionReport,
  InspectionStatus,
} from '../../domain/entities/inspection';
import type { Listing } from '../../domain/entities/listing';
import type {
  Supplier,
  SupplierOfficeAddress,
} from '../../domain/entities/supplier';
import type { User } from '../../domain/entities/user';

export interface InspectionView {
  id: string;
  reference: string;
  status: InspectionStatus;
  fee: number;
  currency: string;
  paidAt: Date;
  reservedUntil: Date;
  respondedAt: Date | null;
  supplierNote: string | null;
  scheduledAt: Date | null;
  cancelledAt: Date | null;
  report: InspectionReport | null;
  /**
   * The passed checks the inspector still qualified, lifted out of the report.
   *
   * Derived here, once, rather than in each app: "a pass with a note is
   * something the dealer must be told" is a rule about the report, and three
   * screens re-deriving it is three chances for one of them to quietly stop.
   * Empty on an unreported inspection and on a clean one.
   */
  advisories: InspectionAdvisory[];

  /** The car, resolved so no screen has to make a second call for a title. */
  listingId: string;
  car: {
    title: string;
    vin: string | null;
    photo: string | null;
    fobPrice: number | null;
    province: string | null;
    mileageKm: number | null;
    status: string | null;
  } | null;

  supplierId: string;
  /**
   * Present for the back office and the buyer; the store knows who it is.
   *
   * `address` is the store's registered office and is BACK OFFICE ONLY: it is
   * there so the inspector assigned to the visit knows where they are going.
   * Gated separately from `phone` because the two answer different questions.
   * A phone number is how two parties reach each other once a visit is agreed;
   * a street address is how a third party finds the yard, and there is no point
   * in this flow where handing it to the buyer is part of the job.
   */
  store: {
    id: string;
    name: string;
    province: string;
    phone?: string;
    address?: SupplierOfficeAddress | null;
  } | null;

  buyerId: string;
  /** Present for the back office and the store, so a yard visit has a contact. */
  buyer: { id: string; name: string; email?: string } | null;
}

export interface InspectionViewParts {
  listing?: Listing | null;
  supplier?: Supplier | null;
  buyer?: User | null;
  /** Contact details are back-office only unless a party needs to be reached. */
  includeContact?: boolean;
  /** The store's office address. Back office only, for the inspector's visit. */
  includeAddress?: boolean;
}

export function toInspectionView(
  inspection: Inspection,
  parts: InspectionViewParts = {},
): InspectionView {
  const { listing, supplier, buyer, includeContact, includeAddress } = parts;
  return {
    id: inspection._id!,
    reference: inspection.reference,
    status: inspection.status,
    fee: inspection.fee,
    currency: inspection.currency,
    paidAt: inspection.paidAt,
    reservedUntil: inspection.reservedUntil,
    respondedAt: inspection.respondedAt ?? null,
    supplierNote: inspection.supplierNote ?? null,
    scheduledAt: inspection.scheduledAt ?? null,
    cancelledAt: inspection.cancelledAt ?? null,
    report: inspection.report ?? null,
    advisories: collectAdvisories(inspection.report),

    listingId: inspection.listingId,
    car: listing
      ? {
          title: listing.title,
          vin: listing.vin ?? null,
          photo: listing.photos?.[0] ?? null,
          fobPrice: listing.fobPrice ?? null,
          province: listing.province ?? null,
          mileageKm: listing.mileageKm ?? null,
          status: listing.status ?? null,
        }
      : null,

    supplierId: inspection.supplierId,
    store: supplier
      ? {
          id: supplier._id!,
          name: supplier.storeName,
          province: supplier.province ?? '',
          ...(includeContact ? { phone: supplier.phone } : {}),
          ...(includeAddress
            ? { address: supplier.officeAddress ?? null }
            : {}),
        }
      : null,

    buyerId: inspection.buyerId,
    buyer: buyer
      ? {
          id: buyer._id!,
          name: buyer.name,
          ...(includeContact ? { email: buyer.email } : {}),
        }
      : null,
  };
}
