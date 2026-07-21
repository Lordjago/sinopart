import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WaitListDto } from '../../../application/dtos/waitlist/waitlist.dto';
import { Public } from '../decorator/is-public.decorator';
import { JoinWaitListUseCase } from '../../../core/usecase/waitlist/join-waitlist.usecase';
import { GetWaitListUseCase } from '../../../core/usecase/waitlist/get-waitlist.usecase';
import { GetWaitListDto } from '../../../application/dtos/waitlist/get-waitlist.dto';

@Controller({
  path: 'waitlist',
  version: '1',
})
export class WaitListController {
  constructor(
    private readonly joinWaitListUseCase: JoinWaitListUseCase,
    private readonly getWaitListUseCase: GetWaitListUseCase,
  ) {}

  @Public()
  @Post('')
  async waitlist(@Body() dto: WaitListDto) {
    await this.joinWaitListUseCase.execute(dto);
  }

  @Public()
  @Get('')
  async get(@Query() getWaitListDto: GetWaitListDto) {
    return await this.getWaitListUseCase.execute(getWaitListDto);
  }
}
