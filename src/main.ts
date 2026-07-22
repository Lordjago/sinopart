import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomExceptionFilter } from './infrastructure/https/filters/custom-exception.filter';
import { HttpResponseInterceptor } from './infrastructure/https/interceptors/http.response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const corsOrigin = config.getOrThrow<string>('CORS_ORIGIN');

  // Allow the configured frontend origin(s) to call the API with the
  // Authorization header. CORS_ORIGIN may be a comma-separated list.
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Validate + sanitise every incoming body against its DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: 422,
    }),
  );

  // Standardise every success response and every error response.
  app.useGlobalInterceptors(new HttpResponseInterceptor());
  app.useGlobalFilters(new CustomExceptionFilter());

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // 0.0.0.0, not localhost: hosts like Render probe the container's external
  // interface, and a loopback-only bind looks like "port never opened".
  await app.listen(port, '0.0.0.0');

  console.log(`SinoPart backend listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start SinoPart backend:', err);
  process.exit(1);
});
