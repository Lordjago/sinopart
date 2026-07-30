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

// supplier auth
import { CheckInvitationUseCase } from './usecase/supplier-auth/check-invitation.usecase';
import { IssueInvitationUseCase } from './usecase/supplier-auth/issue-invitation.usecase';
import { SendPhoneOtpUseCase } from './usecase/supplier-auth/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './usecase/supplier-auth/verify-phone-otp.usecase';
import { ResendPhoneOtpUseCase } from './usecase/supplier-auth/resend-phone-otp.usecase';
import { GetSupplierProfileUseCase } from './usecase/supplier-auth/get-supplier-profile.usecase';
import { UploadKycDocumentUseCase } from './usecase/supplier-auth/upload-kyc-document.usecase';
import { SubmitKycUseCase } from './usecase/supplier-auth/submit-kyc.usecase';
import { GetKycStatusUseCase } from './usecase/supplier-auth/get-kyc-status.usecase';
// listing
import { CreateListingUseCase } from './usecase/listing/create-listing.usecase';
import { UpdateListingUseCase } from './usecase/listing/update-listing.usecase';
import { PublishListingUseCase } from './usecase/listing/publish-listing.usecase';
import { PauseListingUseCase } from './usecase/listing/pause-listing.usecase';
import { DeleteListingUseCase } from './usecase/listing/delete-listing.usecase';
import { GetListingUseCase } from './usecase/listing/get-listing.usecase';
import { ListSupplierListingsUseCase } from './usecase/listing/list-supplier-listings.usecase';
import { ListPublicListingsUseCase } from './usecase/listing/list-public-listings.usecase';
import { GetPublicListingUseCase } from './usecase/listing/get-public-listing.usecase';
import { UploadListingPhotoUseCase } from './usecase/listing/upload-listing-photo.usecase';

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

  // supplier auth
  CheckInvitationUseCase,
  IssueInvitationUseCase,
  SendPhoneOtpUseCase,
  VerifyPhoneOtpUseCase,
  ResendPhoneOtpUseCase,
  GetSupplierProfileUseCase,
  UploadKycDocumentUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
  // listing
  CreateListingUseCase,
  UpdateListingUseCase,
  PublishListingUseCase,
  PauseListingUseCase,
  DeleteListingUseCase,
  GetListingUseCase,
  ListSupplierListingsUseCase,
  ListPublicListingsUseCase,
  GetPublicListingUseCase,
  UploadListingPhotoUseCase,
];

@Module({
  imports: [DatabaseModule, ServiceModule],
  providers: useCases,
  exports: useCases,
})
export class CoreModule {}
