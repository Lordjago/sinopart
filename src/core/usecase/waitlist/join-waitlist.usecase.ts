import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { WaitList } from '../../domain/entities/waitlist';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';
import { MAIL_SERVICE, WAITLIST_REPOSITORY } from '../../injection.token';
import type { WaitListRepository } from '../../interfaces/repository/waitlist.repository';
import type { MailService } from '../../interfaces/services/mail.service';
import type { WaitListDto } from '../../../application/dtos/waitlist/waitlist.dto';

@Injectable()
export class JoinWaitListUseCase extends BaseUseCase<WaitListDto, WaitList> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitListRepository: WaitListRepository,
    @Inject(MAIL_SERVICE)
    private readonly mailService: MailService,
  ) {
    super();
  }

  async execute(dto: WaitListDto): Promise<WaitList> {
    const { email, name, dealership, whatsAppNumber, city } = dto;

    const existing = await this.waitListRepository.findByEmail(email);
    if (existing) {
      throw new ResourceAlreadyExistsError(
        'This email is already registered in our waitlist.',
      );
    }

    const waitlist = new WaitList();
    waitlist.email = email;
    waitlist.name = name;
    waitlist.dealership = dealership;
    waitlist.whatsAppNumber = whatsAppNumber;
    waitlist.city = city;

    const created = await this.waitListRepository.create(waitlist);

    // Two emails, two audiences: a welcome for the person who signed up, and an
    // alert for the team. Both are fire-and-forget — the signup is already
    // saved, so a mail outage must not turn this into a 500 the customer cannot
    // retry (their email is now taken). The adapter logs its own failures.
    await Promise.allSettled([
      this.mailService.sendWaitListWelcome({
        email: created.email,
        name: created.name,
      }),
      this.mailService.sendWaitListAdminAlert({
        email: created.email,
        name: created.name,
        dealership: created.dealership,
        whatsAppNumber: created.whatsAppNumber,
        city: created.city,
        joinedAt: created.createdAt,
      }),
    ]);

    return created;
  }
}
