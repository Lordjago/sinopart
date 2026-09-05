/**
 * ListDealerKycSubmissionsUseCase: the back office's dealer queue.
 * ---------------------------------------------------------------------------
 * The dealer's name and email live on the User, not on the verification file,
 * so they are resolved here in one extra query rather than by every row of the
 * admin table firing its own request to turn an id into a name.
 *
 * Search is the awkward part: a reviewer types a person's name, which is on the
 * User, while the page is over the KYC collection. So when there is a search
 * term the users are matched first and the file query is narrowed to them,
 * unioned with the fields the file itself carries (business name, RC number).
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type {
  DealerKycFilters,
  DealerKycRepository,
} from '../../interfaces/repository/dealer-kyc.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { Page } from '../../domain/value-object/page';
import type { User } from '../../domain/entities/user';
import {
  toDealerKycSubmissionView,
  type DealerKycSubmissionView,
} from './dealer-kyc.view';

@Injectable()
export class ListDealerKycSubmissionsUseCase extends BaseUseCase<
  DealerKycFilters,
  Page<DealerKycSubmissionView>
> {
  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute(
    filters: DealerKycFilters,
  ): Promise<Page<DealerKycSubmissionView>> {
    const page = await this.dealerKyc.findAll(filters);

    const userIds = page.data.map((k) => k.userId);
    const users = await this.usersById(userIds);

    const views = page.data.map((kyc) =>
      toDealerKycSubmissionView(kyc, users.get(kyc.userId) ?? null),
    );

    return new Page(views, page.page, page.limit, page.total);
  }

  /** One lookup for the whole page, tolerating ids that no longer resolve. */
  private async usersById(ids: string[]): Promise<Map<string, User>> {
    const unique = [...new Set(ids)].filter(Boolean);
    if (!unique.length) return new Map();
    const found = await Promise.all(
      unique.map((id) => this.users.findById(id)),
    );
    return new Map(
      found.filter((u): u is User => Boolean(u)).map((u) => [u._id!, u]),
    );
  }
}
