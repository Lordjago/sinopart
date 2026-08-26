/**
 * CoreModule: registers every use case
 * ---------------------------------------------------------------------------
 * The core is the centre of the hexagon: it holds the application's use cases.
 * This module makes them injectable and EXPORTS them so the HTTP controllers can
 * depend on them.
 *
 * It imports DatabaseModule and ServiceModule because the use cases depend on
 * the repository and service PORTS those modules provide (bound to their
 * adapters). Nest resolves each `@Inject(TOKEN)` to the right adapter at
 * construction time. The use cases themselves never name a concrete class.
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
import { GetPublicStoreUseCase } from './usecase/supplier-auth/get-public-store.usecase';
import { UploadKycDocumentUseCase } from './usecase/supplier-auth/upload-kyc-document.usecase';
import { SubmitKycUseCase } from './usecase/supplier-auth/submit-kyc.usecase';
import { GetKycStatusUseCase } from './usecase/supplier-auth/get-kyc-status.usecase';
// listing
import { CreateListingUseCase } from './usecase/listing/create-listing.usecase';
import { UpdateListingUseCase } from './usecase/listing/update-listing.usecase';
import { SubmitListingUseCase } from './usecase/listing/submit-listing.usecase';
import { PauseListingUseCase } from './usecase/listing/pause-listing.usecase';
import { DeleteListingUseCase } from './usecase/listing/delete-listing.usecase';
import { GetListingUseCase } from './usecase/listing/get-listing.usecase';
import { ListSupplierListingsUseCase } from './usecase/listing/list-supplier-listings.usecase';
import { ListPublicListingsUseCase } from './usecase/listing/list-public-listings.usecase';
import { GetPublicListingUseCase } from './usecase/listing/get-public-listing.usecase';
import { UploadListingPhotoUseCase } from './usecase/listing/upload-listing-photo.usecase';
import { UploadListingVideoUseCase } from './usecase/listing/upload-listing-video.usecase';
// brand (vehicle catalog)
import { CreateBrandUseCase } from './usecase/brand/create-brand.usecase';
import { ListBrandsUseCase } from './usecase/brand/list-brands.usecase';
import { GetBrandUseCase } from './usecase/brand/get-brand.usecase';
import { UpdateBrandUseCase } from './usecase/brand/update-brand.usecase';
import { DeleteBrandUseCase } from './usecase/brand/delete-brand.usecase';
// series
import { CreateSeriesUseCase } from './usecase/series/create-series.usecase';
import { ListSeriesUseCase } from './usecase/series/list-series.usecase';
import { GetSeriesUseCase } from './usecase/series/get-series.usecase';
import { UpdateSeriesUseCase } from './usecase/series/update-series.usecase';
import { DeleteSeriesUseCase } from './usecase/series/delete-series.usecase';
// vehicle
// admin (back office)
import { AuthenticateAdminUseCase } from './usecase/admin/authenticate-admin.usecase';
import { CreateStaffUseCase } from './usecase/admin/create-staff.usecase';
import { GetDashboardUseCase } from './usecase/admin/get-dashboard.usecase';
import { ListUsersUseCase } from './usecase/admin/list-users.usecase';
import { GetUserUseCase } from './usecase/admin/get-user.usecase';
import { SetDealerVerifiedUseCase } from './usecase/admin/set-dealer-verified.usecase';
import { ListInvitationsUseCase } from './usecase/admin/list-invitations.usecase';
import { RevokeInvitationUseCase } from './usecase/admin/revoke-invitation.usecase';
import { ListKycSubmissionsUseCase } from './usecase/admin/list-kyc-submissions.usecase';
import { GetKycSubmissionUseCase } from './usecase/admin/get-kyc-submission.usecase';
import { ReviewKycDocumentUseCase } from './usecase/admin/review-kyc-document.usecase';
// Dealer verification: the buyer's own wizard, and the back office's desk.
import { GetDealerKycStatusUseCase } from './usecase/dealer-kyc/get-dealer-kyc-status.usecase';
import { SaveDealerKycDetailsUseCase } from './usecase/dealer-kyc/save-dealer-kyc-details.usecase';
import { SaveDealerBankAccountUseCase } from './usecase/dealer-kyc/save-dealer-bank-account.usecase';
import { UploadDealerKycDocumentUseCase } from './usecase/dealer-kyc/upload-dealer-kyc-document.usecase';
import { SubmitDealerKycUseCase } from './usecase/dealer-kyc/submit-dealer-kyc.usecase';
import { ListDealerKycSubmissionsUseCase } from './usecase/dealer-kyc/list-dealer-kyc-submissions.usecase';
import { GetDealerKycSubmissionUseCase } from './usecase/dealer-kyc/get-dealer-kyc-submission.usecase';
import { ReviewDealerKycDocumentUseCase } from './usecase/dealer-kyc/review-dealer-kyc-document.usecase';
import { DecideDealerKycUseCase } from './usecase/dealer-kyc/decide-dealer-kyc.usecase';
import { ListAdminListingsUseCase } from './usecase/admin/list-admin-listings.usecase';
import { GetAdminListingUseCase } from './usecase/admin/get-admin-listing.usecase';
import { AddProposedVehicleUseCase } from './usecase/admin/add-proposed-vehicle.usecase';
import {
  ListSavedListingsUseCase,
  SaveListingUseCase,
  UnsaveListingUseCase,
} from './usecase/saved/saved-listing.usecases';
import { GetInspectionCheckoutUseCase } from './usecase/checkout/get-inspection-checkout.usecase';
import { SettingsService } from './usecase/config/settings.service';
import {
  GetPublicConfigUseCase,
  ListSettingsUseCase,
  UpdateSettingUseCase,
} from './usecase/config/config.usecases';
import { StartInspectionUseCase } from './usecase/inspection/start-inspection.usecase';
import { ListInspectionsUseCase } from './usecase/inspection/list-inspections.usecase';
import { GetInspectionUseCase } from './usecase/inspection/get-inspection.usecase';
import { RespondInspectionUseCase } from './usecase/inspection/respond-inspection.usecase';
import { StartInspectionVisitUseCase } from './usecase/inspection/start-inspection-visit.usecase';
import { SubmitInspectionReportUseCase } from './usecase/inspection/submit-inspection-report.usecase';
import { UploadInspectionEvidenceUseCase } from './usecase/inspection/upload-evidence.usecase';
import {
  PauseListingAdminUseCase,
  PublishListingAdminUseCase,
  ReturnListingUseCase,
} from './usecase/admin/publish-listing-admin.usecase';
import { CreateVehicleUseCase } from './usecase/vehicle/create-vehicle.usecase';
import { ListVehiclesUseCase } from './usecase/vehicle/list-vehicles.usecase';
import { GetVehicleUseCase } from './usecase/vehicle/get-vehicle.usecase';
import { UpdateVehicleUseCase } from './usecase/vehicle/update-vehicle.usecase';
import { DeleteVehicleUseCase } from './usecase/vehicle/delete-vehicle.usecase';

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
  GetPublicStoreUseCase,
  UploadKycDocumentUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
  // listing
  CreateListingUseCase,
  UpdateListingUseCase,
  SubmitListingUseCase,
  PauseListingUseCase,
  DeleteListingUseCase,
  GetListingUseCase,
  ListSupplierListingsUseCase,
  ListPublicListingsUseCase,
  GetPublicListingUseCase,
  UploadListingPhotoUseCase,
  UploadListingVideoUseCase,

  // brand
  CreateBrandUseCase,
  ListBrandsUseCase,
  GetBrandUseCase,
  UpdateBrandUseCase,
  DeleteBrandUseCase,

  // series
  CreateSeriesUseCase,
  ListSeriesUseCase,
  GetSeriesUseCase,
  UpdateSeriesUseCase,
  DeleteSeriesUseCase,

  // vehicle
  CreateVehicleUseCase,
  ListVehiclesUseCase,
  GetVehicleUseCase,
  UpdateVehicleUseCase,
  DeleteVehicleUseCase,

  // admin (back office)
  AuthenticateAdminUseCase,
  CreateStaffUseCase,
  GetDashboardUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  SetDealerVerifiedUseCase,
  ListInvitationsUseCase,
  RevokeInvitationUseCase,
  ListKycSubmissionsUseCase,
  GetKycSubmissionUseCase,
  ReviewKycDocumentUseCase,
  GetDealerKycStatusUseCase,
  SaveDealerKycDetailsUseCase,
  SaveDealerBankAccountUseCase,
  UploadDealerKycDocumentUseCase,
  SubmitDealerKycUseCase,
  ListDealerKycSubmissionsUseCase,
  GetDealerKycSubmissionUseCase,
  ReviewDealerKycDocumentUseCase,
  DecideDealerKycUseCase,
  ListAdminListingsUseCase,
  GetAdminListingUseCase,
  PublishListingAdminUseCase,
  ReturnListingUseCase,
  PauseListingAdminUseCase,
  AddProposedVehicleUseCase,

  // inspection
  StartInspectionUseCase,
  ListInspectionsUseCase,
  GetInspectionUseCase,
  RespondInspectionUseCase,
  StartInspectionVisitUseCase,
  SubmitInspectionReportUseCase,
  UploadInspectionEvidenceUseCase,

  // saved listings (dealer watchlist)
  SaveListingUseCase,
  UnsaveListingUseCase,
  ListSavedListingsUseCase,

  // checkout
  GetInspectionCheckoutUseCase,

  // configuration
  SettingsService,
  ListSettingsUseCase,
  UpdateSettingUseCase,
  GetPublicConfigUseCase,
];

@Module({
  imports: [DatabaseModule, ServiceModule],
  providers: useCases,
  exports: useCases,
})
export class CoreModule {}
