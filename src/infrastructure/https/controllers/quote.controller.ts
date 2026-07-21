import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { QuoteDto } from '../../../application/dtos/request-quote/quote.dto';
import { GetQuoteUseCase } from '../../../core/usecase/request-quote/get-quote.usecase';
import { CreateQuoteUseCase } from '../../../core/usecase/request-quote/create-quote.usecase';
import { GetQuoteDto } from '../../../application/dtos/request-quote/get-quote.dto';

@Controller({
  path: 'quotes',
  version: '1',
})
export class QuoteController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly getQuoteUseCase: GetQuoteUseCase,
  ) {}

  @Public()
  @Post('')
  async create(@Body() dto: QuoteDto) {
    await this.createQuoteUseCase.execute(dto);
  }

  @Get('')
  async get(@Query() getQuoteDto: GetQuoteDto) {
    return await this.getQuoteUseCase.execute(getQuoteDto);
  }
}
