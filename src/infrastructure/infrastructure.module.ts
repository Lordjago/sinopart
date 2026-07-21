/**
 * InfrastructureModule — assembles the whole adapter side of the hexagon
 * ---------------------------------------------------------------------------
 * A thin aggregator that pulls together the HTTP, database, core, and service
 * modules. The root AppModule imports just this one module, keeping app.module
 * focused on cross-cutting concerns (config).
 */
import { Module } from '@nestjs/common';
import { HttpsModule } from './https/https.module';
import { DatabaseModule } from './database/database.module';
import { ServiceModule } from './services/service.module';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [HttpsModule, DatabaseModule, ServiceModule, CoreModule],
})
export class InfrastructureModule {}
