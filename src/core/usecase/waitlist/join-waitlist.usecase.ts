/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { WaitList } from '../../domain/entities/waitlist';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';
import {
  MAIL_SERVICE,
  MESSAGING_SERVICE,
  WAITLIST_REPOSITORY,
} from '../../injection.token';
import type { WaitListRepository } from '../../interfaces/repository/waitlist.repository';
import type { MailService } from '../../interfaces/services/mail.service';
import { waitListWelcomeTemplate } from '../../mail/waitlist-welcome.template';
import type { NotificationService } from '../../interfaces/services/notification.service';
import { waitListJoinedNotification } from '../../notifications/waitlist-joined.notification';
import type { WaitListDto } from '../../../application/dtos/waitlist/waitlist.dto';

@Injectable()
export class JoinWaitListUseCase extends BaseUseCase<WaitListDto, WaitList> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitListRepository: WaitListRepository,
    @Inject(MAIL_SERVICE)
    private readonly mailService: MailService,
    @Inject(MESSAGING_SERVICE)
    private readonly notificationService: NotificationService,
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

    // Welcome email to the customer.
    this.mailService.send(
      waitListWelcomeTemplate({
        email: created.email,
        name: created.name,
      }),
    );

    // Alert the team in Slack.
    this.notificationService.notify(
      waitListJoinedNotification({
        email: created.email,
        name: created.name,
        dealership: created.dealership,
        whatsAppNumber: created.whatsAppNumber,
        city: created.city,
        joinedAt: created.createdAt,
      }),
    );

    return created;
  }
}
