import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { Page } from '../../domain/value-object/page';
import { WAITLIST_REPOSITORY } from '../../injection.token';
import type { WaitList } from '../../domain/entities/waitlist';
import type { WaitListRepository } from '../../interfaces/repository/waitlist.repository';
import type { GetWaitListDto } from '../../../application/dtos/waitlist/get-waitlist.dto';

@Injectable()
export class GetWaitListUseCase extends BaseUseCase<
  GetWaitListDto,
  Page<WaitList>
> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepository: WaitListRepository,
  ) {
    super();
  }

  async execute(input: GetWaitListDto): Promise<Page<WaitList>> {
    const { name, email, whatsAppNumber, dealership, from, to, page, limit } =
      input;
    return await this.waitlistRepository.find({
      name,
      email,
      whatsAppNumber,
      dealership,
      from,
      to,
      page,
      limit,
    });
  }
}
