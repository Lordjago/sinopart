/**
 * BrandController: the vehicle catalog's brand resource.
 * ---------------------------------------------------------------------------
 * Reads are @Public: brands are reference data every client needs before it can
 * render a make/model picker, and there is nothing private on a brand. Writes
 * are ADMIN-only. The catalog is curated by the platform, never by suppliers.
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
import { CreateBrandUseCase } from '../../../core/usecase/brand/create-brand.usecase';
import { ListBrandsUseCase } from '../../../core/usecase/brand/list-brands.usecase';
import { GetBrandUseCase } from '../../../core/usecase/brand/get-brand.usecase';
import { UpdateBrandUseCase } from '../../../core/usecase/brand/update-brand.usecase';
import { DeleteBrandUseCase } from '../../../core/usecase/brand/delete-brand.usecase';
import { CreateBrandDto } from '../../../application/dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../../../application/dtos/brand/update-brand.dto';
import { ListBrandsDto } from '../../../application/dtos/brand/list-brands.dto';

@Controller('brands')
export class BrandController {
  constructor(
    private readonly createBrand: CreateBrandUseCase,
    private readonly listBrands: ListBrandsUseCase,
    private readonly getBrand: GetBrandUseCase,
    private readonly updateBrand: UpdateBrandUseCase,
    private readonly deleteBrand: DeleteBrandUseCase,
  ) {}

  // ---------- Public catalog ----------

  @Public()
  @Get()
  list(@Query() dto: ListBrandsDto) {
    return this.listBrands.execute(dto);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getBrand.execute(id);
  }

  // ---------- Admin curation ----------

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.createBrand.execute(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.updateBrand.execute({ brandId: id, ...dto });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteBrand.execute(id);
  }
}
