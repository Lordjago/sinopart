import type {
  Invitation,
  InvitationStatus,
} from '../../domain/entities/invitation';
import type { Page } from '../../domain/value-object/page';

export interface InvitationFilters {
  status?: InvitationStatus;
  /** Free text over the code and the store name. */
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvitationRepository {
  create(invitation: Invitation): Promise<Invitation>;
  findByCode(code: string): Promise<Invitation | null>;
  /** The admin list: newest first, paginated. */
  findAll(filters: InvitationFilters): Promise<Page<Invitation>>;
  /** How many invites sit in each status, for the dashboard and list badges. */
  countByStatus(): Promise<Record<string, number>>;
  markConsumed(code: string, supplierId: string): Promise<void>;
  /**
   * Kill an unused invite. Returns the updated invitation, or null when the
   * code is unknown. The use case turns that into a 404.
   */
  revoke(code: string): Promise<Invitation | null>;
}
