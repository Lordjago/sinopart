import { Module } from '@nestjs/common';
import { HttpsModule } from './https/https.module';
import { DatabaseModule } from './database/database.module';
import { ServiceModule } from './services/service.module';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [HttpsModule, DatabaseModule, ServiceModule, CoreModule],
})
export class InfrastructureModule {}
