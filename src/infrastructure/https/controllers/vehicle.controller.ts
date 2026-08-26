/**
 * VehicleController: the vehicle catalog's leaf resource.
 * ---------------------------------------------------------------------------
 * Reads are @Public, writes are ADMIN-only, like brands and series. Unlike
 * them, the list is PAGINATED: brands and series are bounded sets a client can
 * hold whole, but configurations multiply with every model year.
 *
 * Drill down with `GET /vehicles?brandId=…` or `?seriesId=…`.
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
import { CreateVehicleUseCase } from '../../../core/usecase/vehicle/create-vehicle.usecase';
import { ListVehiclesUseCase } from '../../../core/usecase/vehicle/list-vehicles.usecase';
import { GetVehicleUseCase } from '../../../core/usecase/vehicle/get-vehicle.usecase';
import { UpdateVehicleUseCase } from '../../../core/usecase/vehicle/update-vehicle.usecase';
import { DeleteVehicleUseCase } from '../../../core/usecase/vehicle/delete-vehicle.usecase';
import { CreateVehicleDto } from '../../../application/dtos/vehicle/create-vehicle.dto';
import { UpdateVehicleDto } from '../../../application/dtos/vehicle/update-vehicle.dto';
import { ListVehiclesDto } from '../../../application/dtos/vehicle/list-vehicles.dto';

@Controller('vehicles')
export class VehicleController {
  constructor(
    private readonly createVehicle: CreateVehicleUseCase,
    private readonly listVehicles: ListVehiclesUseCase,
    private readonly getVehicle: GetVehicleUseCase,
    private readonly updateVehicle: UpdateVehicleUseCase,
    private readonly deleteVehicle: DeleteVehicleUseCase,
  ) {}

  // ---------- Public catalog ----------

  @Public()
  @Get()
  list(@Query() dto: ListVehiclesDto) {
    return this.listVehicles.execute(dto);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getVehicle.execute(id);
  }

  // ---------- Admin curation ----------

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.createVehicle.execute(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.updateVehicle.execute({ vehicleId: id, ...dto });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteVehicle.execute(id);
  }
}
