import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import {
  AUTHENTICATION_SERVICE,
  FILE_STORAGE_SERVICE,
  IDENTITY_VERIFICATION_SERVICE,
  MAIL_SERVICE,
  MESSAGING_SERVICE,
  SMS_SERVICE,
} from '../../core/injection.token';
import { AuthenticationServiceImpl } from './authentication/authentication.service.impl';
import { SendByteMailServiceImpl } from './mail/sendbyte.mail.service.impl';
import { SlackNotificationServiceImpl } from './slack/slack.notification.service.impl';
import { ConsoleSmsServiceImpl } from './sms/console.sms.service.impl';
import { CloudinaryStorageServiceImpl } from './storage/cloudinary.storage.service.impl';
import { DojahIdentityServiceImpl } from './identity/dojah.identity.service.impl';
import { FieldCipher } from './crypto/field-cipher';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as `${number}h`,
        },
      }),
    }),
  ],
  providers: [
    { provide: AUTHENTICATION_SERVICE, useClass: AuthenticationServiceImpl },
    {
      provide: MAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SendByteMailServiceImpl({
          apiKey: config.getOrThrow<string>('SENDBYTE_API_KEY'),
          from: config.getOrThrow<string>('MAIL_FROM'),
        }),
    },
    {
      provide: MESSAGING_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SlackNotificationServiceImpl({
          webhookUrl: config.getOrThrow<string>('SLACK_WEBHOOK_URL'),
        }),
    },
    { provide: SMS_SERVICE, useClass: ConsoleSmsServiceImpl },
    {
      provide: IDENTITY_VERIFICATION_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new DojahIdentityServiceImpl({
          appId: config.getOrThrow<string>('DOJAH_APP_ID'),
          privateKey: config.getOrThrow<string>('DOJAH_PRIVATE_KEY'),
          baseUrl: config.getOrThrow<string>('DOJAH_BASE_URL'),
        }),
    },
    {
      provide: FILE_STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new CloudinaryStorageServiceImpl(
          config.getOrThrow<string>('CLOUDINARY_URL'),
        ),
    },
    {
      provide: FieldCipher,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        // No JWT_SECRET fallback any more: ENCRYPTION_KEY is validated at
        // boot, and silently keying ciphertext off the JWT secret meant
        // rotating that secret destroyed every stored BVN.
        new FieldCipher(config.getOrThrow<string>('ENCRYPTION_KEY')),
    },
  ],
  exports: [
    AUTHENTICATION_SERVICE,
    MAIL_SERVICE,
    MESSAGING_SERVICE,
    SMS_SERVICE,
    FILE_STORAGE_SERVICE,
    IDENTITY_VERIFICATION_SERVICE,
    FieldCipher,
    JwtModule,
  ],
})
export class ServiceModule {}
