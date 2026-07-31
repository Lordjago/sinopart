import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import {
  AUTHENTICATION_SERVICE,
  FILE_STORAGE_SERVICE,
  MAIL_SERVICE,
  MESSAGING_SERVICE,
  SMS_SERVICE,
} from '../../core/injection.token';
import { AuthenticationServiceImpl } from './authentication/authentication.service.impl';
import { SendByteMailServiceImpl } from './mail/sendbyte.mail.service.impl';
import { SlackNotificationServiceImpl } from './slack/slack.notification.service.impl';
import { ConsoleSmsServiceImpl } from './sms/console.sms.service.impl';
import { CloudinaryStorageServiceImpl } from './storage/cloudinary.storage.service.impl';
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
        new FieldCipher(
          config.get<string>('ENCRYPTION_KEY') ??
            config.getOrThrow<string>('JWT_SECRET'),
        ),
    },
  ],
  exports: [
    AUTHENTICATION_SERVICE,
    MAIL_SERVICE,
    MESSAGING_SERVICE,
    SMS_SERVICE,
    FILE_STORAGE_SERVICE,
    FieldCipher,
    JwtModule,
  ],
})
export class ServiceModule {}
