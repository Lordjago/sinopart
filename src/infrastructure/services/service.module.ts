/**
 * ServiceModule — the external-services composition root
 * ---------------------------------------------------------------------------
 * Binds SERVICE ports to their adapters, the same way DatabaseModule binds
 * repository ports: AUTHENTICATION_SERVICE → AuthenticationServiceImpl and
 * MAIL_SERVICE → SendByteMailServiceImpl. New outbound integrations (payments,
 * file upload…) would be added here as { provide: TOKEN, useClass: ...Impl }.
 *
 * Mail uses useFactory rather than useClass because the adapter takes its API
 * key and addresses as constructor config read from the environment.
 *
 * It configures JwtModule (secret + expiry from env) and exports it so the HTTP
 * auth guard can inject JwtService to VERIFY tokens, while the adapter uses it to
 * SIGN them.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import {
  AUTHENTICATION_SERVICE,
  MAIL_SERVICE,
} from '../../core/injection.token';
import { AuthenticationServiceImpl } from './authentication/authentication.service.impl';
import { SendByteMailServiceImpl } from './mail/sendbyte.mail.service.impl';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // env gives a plain string ("8h"); @nestjs/jwt types this narrowly, so
          // we cast. Any valid duration string works at runtime.
          expiresIn: config.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as `${number}h`,
        },
      }),
    }),
  ],
  providers: [
    { provide: AUTHENTICATION_SERVICE, useClass: AuthenticationServiceImpl },
    // SendByte is the only mail adapter. The three settings it needs are
    // validated on boot (env.validation), so getOrThrow here is a belt-and-
    // braces guard rather than the primary check.
    {
      provide: MAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SendByteMailServiceImpl({
          apiKey: config.getOrThrow<string>('SENDBYTE_API_KEY'),
          from: config.getOrThrow<string>('MAIL_FROM'),
          adminEmail: config.getOrThrow<string>('ADMIN_EMAIL'),
        }),
    },
  ],
  exports: [AUTHENTICATION_SERVICE, MAIL_SERVICE, JwtModule],
})
export class ServiceModule {}
