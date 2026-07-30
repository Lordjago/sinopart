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
  FILE_STORAGE_SERVICE,
  MAIL_SERVICE,
  NOTIFICATION_SERVICE,
  SMS_SERVICE,
} from '../../core/injection.token';
import { AuthenticationServiceImpl } from './authentication/authentication.service.impl';
import { SendByteMailServiceImpl } from './mail/sendbyte.mail.service.impl';
import { SlackNotificationServiceImpl } from './slack/slack.notification.service.impl';
import { ConsoleSmsServiceImpl } from './sms/console.sms.service.impl';
import { CloudinaryStorageServiceImpl } from './storage/cloudinary.storage.service.impl';
import { NullStorageServiceImpl } from './storage/null.storage.service.impl';
import { FieldCipher } from './crypto/field-cipher';

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
    // Slack incoming webhook for internal team alerts (waitlist joins, quote
    // requests). The URL is validated on boot (env.validation).
    {
      provide: NOTIFICATION_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SlackNotificationServiceImpl({
          webhookUrl: config.getOrThrow<string>('SLACK_WEBHOOK_URL'),
        }),
    },
    // Console SMS adapter — logs the OTP to the server console so the supplier
    // phone-OTP flow works with no vendor. Swap for an Aliyun/Tencent/Twilio
    // adapter (same SmsService port) at deploy time.
    { provide: SMS_SERVICE, useClass: ConsoleSmsServiceImpl },
    // File storage for KYC uploads. Unlike the services above, this is OPTIONAL
    // on boot: with CLOUDINARY_URL set we use Cloudinary, otherwise a null
    // adapter that lets the app run and only errors if someone uploads.
    {
      provide: FILE_STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('CLOUDINARY_URL');
        return url
          ? new CloudinaryStorageServiceImpl(url)
          : new NullStorageServiceImpl();
      },
    },
    // Field-level encryption (bank account numbers at rest). Uses a dedicated
    // ENCRYPTION_KEY when set; falls back to JWT_SECRET in dev so the app runs
    // without extra config. Set ENCRYPTION_KEY in production for key separation.
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
    NOTIFICATION_SERVICE,
    SMS_SERVICE,
    FILE_STORAGE_SERVICE,
    FieldCipher,
    JwtModule,
  ],
})
export class ServiceModule {}
