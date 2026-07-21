/**
 * CoreModule — registers every use case
 * ---------------------------------------------------------------------------
 * The core is the centre of the hexagon: it holds the application's use cases.
 * This module makes them injectable and EXPORTS them so the HTTP controllers can
 * depend on them.
 *
 * It imports DatabaseModule and ServiceModule because the use cases depend on
 * the repository and service PORTS those modules provide (bound to their
 * adapters). Nest resolves each `@Inject(TOKEN)` to the right adapter at
 * construction time — the use cases themselves never name a concrete class.
 */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { ServiceModule } from '../infrastructure/services/service.module';

// auth
import { RegisterUserUseCase } from './usecase/auth/register-user.usecase';
import { AuthenticateUserUseCase } from './usecase/auth/authenticate-user.usecase';
import { GetProfileUseCase } from './usecase/auth/get-profile.usecase';
import { ForgotPasswordUseCase } from './usecase/auth/forgot-password.usecase';
import { VerifyOtpUseCase } from './usecase/auth/verify-otp.usecase';
import { ResendOtpUseCase } from './usecase/auth/resend-otp.usecase';
import { ResetPasswordUseCase } from './usecase/auth/reset-password.usecase';
import { SendEmailVerificationUseCase } from './usecase/auth/send-email-verification.usecase';
import { VerifyEmailUseCase } from './usecase/auth/verify-email.usecase';

//waitlist
import { JoinWaitListUseCase } from './usecase/waitlist/join-waitlist.usecase';
import { GetWaitListUseCase } from './usecase/waitlist/get-waitlist.usecase';

// quotes
import { CreateQuoteUseCase } from './usecase/request-quote/create-quote.usecase';
import { GetQuoteUseCase } from './usecase/request-quote/get-quote.usecase';

const useCases = [
  // auth
  RegisterUserUseCase,
  AuthenticateUserUseCase,
  GetProfileUseCase,
  ForgotPasswordUseCase,
  VerifyOtpUseCase,
  ResendOtpUseCase,
  ResetPasswordUseCase,
  SendEmailVerificationUseCase,
  VerifyEmailUseCase,

  //waitlist
  JoinWaitListUseCase,
  GetWaitListUseCase,

  //quote
  CreateQuoteUseCase,
  GetQuoteUseCase,
];

@Module({
  imports: [DatabaseModule, ServiceModule],
  providers: useCases,
  exports: useCases,
})
export class CoreModule {}
