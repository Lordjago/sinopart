/**
 * ListInvitationsUseCase: every invite ever minted (GET /admin/invitations)
 * ---------------------------------------------------------------------------
 * The table answers three questions per row: which store it was meant for,
 * whether it has been used, and when. The first two are on the invitation; the
 * third is `updatedAt`. An invitation is written exactly twice in its life
 * (created, then consumed or revoked), so on a consumed row that timestamp IS
 * the moment it was redeemed.
 *
 * The store that redeemed it and the admin who issued it are resolved in one
 * batch each, not per row.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INVITATION_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import {
  InvitationStatus,
  isInvitationExpired,
  type Invitation,
} from '../../domain/entities/invitation';
import { Page } from '../../domain/value-object/page';
import type { InvitationView } from './admin.views';

export interface ListInvitationsInput {
  status?: InvitationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListInvitationsUseCase extends BaseUseCase<
  ListInvitationsInput,
  Page<InvitationView>
> {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute(
    input: ListInvitationsInput = {},
  ): Promise<Page<InvitationView>> {
    const found = await this.invitations.findAll(input);

    const storeNames = await this.resolveStores(found.data);
    const issuerNames = await this.resolveIssuers(found.data);

    return new Page(
      found.data.map((invite) =>
        this.toView(invite, storeNames, issuerNames),
      ),
      found.page,
      found.limit,
      found.total,
    );
  }

  /** Store name per consumed invite, in one query rather than one per row. */
  private async resolveStores(
    invites: Invitation[],
  ): Promise<Map<string, string>> {
    const ids = invites
      .map((i) => i.consumedBySupplierId)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) return new Map();
    const stores = await this.suppliers.findByIds([...new Set(ids)]);
    return new Map(stores.map((s) => [s._id!, s.storeName]));
  }

  /**
   * Issuer name per invite. `issuedBy` holds a user id, but rows minted before
   * this endpoint existed can hold anything at all, so an unresolvable value is
   * simply left null rather than treated as an error.
   */
  private async resolveIssuers(
    invites: Invitation[],
  ): Promise<Map<string, string>> {
    const ids = [...new Set(invites.map((i) => i.issuedBy).filter(Boolean))];
    const found = await Promise.all(
      ids.map((id) => this.users.findById(id).catch(() => null)),
    );
    return new Map(
      found
        .filter((u): u is NonNullable<typeof u> => u != null)
        .map((u) => [u._id!, u.name]),
    );
  }

  private toView(
    invite: Invitation,
    storeNames: Map<string, string>,
    issuerNames: Map<string, string>,
  ): InvitationView {
    const consumed = invite.status === InvitationStatus.CONSUMED;
    return {
      id: invite._id!,
      code: invite.code,
      storeName: invite.storeName ?? null,
      status: invite.status,
      expired: isInvitationExpired(invite),
      issuedBy: invite.issuedBy,
      issuedByName: issuerNames.get(invite.issuedBy) ?? null,
      consumedBySupplierId: invite.consumedBySupplierId ?? null,
      consumedByStore: invite.consumedBySupplierId
        ? (storeNames.get(invite.consumedBySupplierId) ?? null)
        : null,
      consumedAt: consumed ? (invite.updatedAt ?? null) : null,
      expiresAt: invite.expiresAt ?? null,
      createdAt: invite.createdAt,
    };
  }
}
