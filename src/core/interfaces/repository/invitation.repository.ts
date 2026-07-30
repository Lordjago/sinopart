import type { Invitation } from '../../domain/entities/invitation';

export interface InvitationRepository {
  create(invitation: Invitation): Promise<Invitation>;
  findByCode(code: string): Promise<Invitation | null>;
  markConsumed(code: string, supplierId: string): Promise<void>;
}
