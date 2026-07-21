/**
 * AppModule — the root module
 * ---------------------------------------------------------------------------
 * Deliberately tiny. It loads + validates configuration (globally, so every
 * module can inject ConfigService) and then delegates the entire application to
 * the InfrastructureModule, which wires up the hexagon (http → core → database
 * / services). Keeping the root this small is a sign the layering is doing its
 * job.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './infrastructure/config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    InfrastructureModule,
  ],
})
export class AppModule {}
