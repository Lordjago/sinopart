/**
 * SeriesController: the vehicle catalog's series resource.
 * ---------------------------------------------------------------------------
 * Same access shape as brands: reads are @Public (every client needs the model
 * picker), writes are ADMIN-only (the catalog is curated by the platform).
 * Filter by brand with `GET /series?brandId=…`.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { UserRole } from '../../../core/domain/entities/user';
import { CreateSeriesUseCase } from '../../../core/usecase/series/create-series.usecase';
import { ListSeriesUseCase } from '../../../core/usecase/series/list-series.usecase';
import { GetSeriesUseCase } from '../../../core/usecase/series/get-series.usecase';
import { UpdateSeriesUseCase } from '../../../core/usecase/series/update-series.usecase';
import { DeleteSeriesUseCase } from '../../../core/usecase/series/delete-series.usecase';
import { CreateSeriesDto } from '../../../application/dtos/series/create-series.dto';
import { UpdateSeriesDto } from '../../../application/dtos/series/update-series.dto';
import { ListSeriesDto } from '../../../application/dtos/series/list-series.dto';

@Controller('series')
export class SeriesController {
  constructor(
    private readonly createSeries: CreateSeriesUseCase,
    private readonly listSeries: ListSeriesUseCase,
    private readonly getSeries: GetSeriesUseCase,
    private readonly updateSeries: UpdateSeriesUseCase,
    private readonly deleteSeries: DeleteSeriesUseCase,
  ) {}

  // ---------- Public catalog ----------

  @Public()
  @Get()
  list(@Query() dto: ListSeriesDto) {
    return this.listSeries.execute(dto);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getSeries.execute(id);
  }

  // ---------- Admin curation ----------

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateSeriesDto) {
    return this.createSeries.execute(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSeriesDto) {
    return this.updateSeries.execute({ seriesId: id, ...dto });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteSeries.execute(id);
  }
}
